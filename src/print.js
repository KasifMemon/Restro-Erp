// One document model -> three renderers: browser HTML, ESC/POS text, ESC/POS graphic (image).
import QRCode from 'qrcode';
import { calcTotals, fmtDT, fmtTime, printHTML, upiLink } from './utils.js';
import { canvasToEscBytes, drawReceiptCanvas, imgToBitmap, renderEscText } from './escpos.js';
import { sendBytes } from './printer.js';
import { toast } from './toast.js';

const f2 = (n) => (Number(n) || 0).toFixed(2);

/* ------------------------------------------------------------------ documents */
export function receiptDoc(order, s, tableName, t, o = {}) {
  const cur = o.cur || '₹';
  const R = s.receipt || {};
  const provisional = !order.billNo;
  const ops = [];
  const T = (x, p = {}) => ops.push({ t: 'text', s: x, ...p });
  const Rw = (l, r, p = {}) => ops.push({ t: 'row', l, r, ...p });

  if (o.kick) ops.push({ t: 'kick' });
  if (s.logo && R.showLogo) ops.push({ t: 'img', src: s.logo, w: 0.5 });
  T(s.name, { align: 'c', b: 1, size: 2 });
  if (s.address) T(s.address, { align: 'c' });
  if (s.phone) T('Ph: ' + s.phone, { align: 'c' });
  if (s.gstin && R.showGstin) T('GSTIN: ' + s.gstin, { align: 'c' });
  if (s.fssai && R.showFssai) T('FSSAI: ' + s.fssai, { align: 'c' });
  if (R.sac) T('SAC: ' + R.sac, { align: 'c' });
  if (R.headerNote) T(R.headerNote, { align: 'c' });
  ops.push({ t: 'hr' });
  T(provisional ? 'PROVISIONAL BILL' : s.gstin ? 'TAX INVOICE' : 'BILL', { align: 'c', b: 1 });
  Rw(provisional ? `Order #${order.no}` : `Bill #${order.billNo}`, provisional ? '' : `Order #${order.no}`);
  Rw(fmtDT(order.paidAt || Date.now()), order.type === 'dine' ? tableName ? 'Table ' + tableName : '' : order.type === 'take' ? 'Takeaway' : 'Delivery');
  if (R.showCustomer !== false && (order.guest?.name || order.guest?.phone)) T(`Customer: ${order.guest.name || ''} ${order.guest.phone || ''}`.trim());
  if (order.type === 'delivery' && order.guest?.address) T('Addr: ' + order.guest.address);
  ops.push({ t: 'hr' });

  for (const l of order.items.filter((x) => x.qty > 0)) {
    T(l.name, { b: 1 });
    Rw(`  ${l.qty} x ${f2(l.price)}`, f2(l.price * l.qty));
    if (l.note) T('  >> ' + l.note);
  }
  ops.push({ t: 'hr' });

  Rw(`Sub Total${s.taxInclusive ? ' (excl. tax)' : ''}`, f2(t.sub));
  if (t.disc > 0) Rw('Discount', '-' + f2(t.disc));
  if (t.redeem > 0) Rw('Loyalty points', '-' + f2(t.redeem));
  if (t.sc > 0) Rw(`Service Charge ${s.serviceCharge}%`, f2(t.sc));
  if (R.showTax !== false) {
    for (const [r, v] of Object.entries(t.taxByRate || {})) {
      if (+r === 0) continue;
      Rw(`CGST ${r / 2}%`, f2(v.tax / 2));
      Rw(`SGST ${r / 2}%`, f2(v.tax / 2));
    }
  } else if (t.tax > 0) Rw('GST', f2(t.tax));
  if (Math.abs(t.round) > 0.004) Rw('Round off', f2(t.round));
  ops.push({ t: 'hr', ch: '=' });
  Rw('TOTAL', cur + t.total, { b: 1, size: 2 });
  ops.push({ t: 'hr', ch: '=' });

  (order.payments || []).forEach((p) => Rw('Paid by ' + p.mode.toUpperCase(), f2(p.amount)));
  if (order.due > 0) Rw('On credit (due)', f2(order.due));

  // UPI QR carrying the exact amount
  const qrMode = R.qrMode || 'unpaid';
  let qrAmt = 0;
  if (provisional) qrAmt = t.total; else if (order.due > 0) qrAmt = order.due; else if (qrMode === 'always') qrAmt = t.total;
  if (s.upiId && qrMode !== 'never' && qrAmt > 0) {
    ops.push({ t: 'hr' });
    T(`Scan & pay ${cur}${f2(qrAmt)}`, { align: 'c', b: 1 });
    ops.push({ t: 'qr', data: upiLink(s, qrAmt, 'Bill ' + (order.billNo || order.no)) });
    T('UPI: ' + s.upiId, { align: 'c' });
  }

  ops.push({ t: 'hr' });
  if (s.footer) T(s.footer, { align: 'c' });
  if (R.reviewUrl) {
    ops.push({ t: 'qr', data: R.reviewUrl });
    T('Scan to rate us', { align: 'c' });
  }
  if (R.poweredBy) T(R.poweredBy, { align: 'c' });
  ops.push({ t: 'feed', n: 1 }, { t: 'cut' });
  return ops;
}

export function kotDoc(kot) {
  const ops = [];
  ops.push({ t: 'text', s: `KOT #${kot.no}`, align: 'c', b: 1, size: 2 });
  ops.push({ t: 'text', s: kot.label, align: 'c', b: 1, size: 2 });
  ops.push({ t: 'row', l: `Order #${kot.orderNo}`, r: fmtTime(kot.time) });
  ops.push({ t: 'hr', ch: '=' });
  for (const i of kot.items) {
    ops.push({ t: 'text', s: `${i.qty} x ${i.name}`, b: 1, size: 2 });
    if (i.note) ops.push({ t: 'text', s: '   >> ' + i.note });
  }
  ops.push({ t: 'hr', ch: '=' }, { t: 'feed', n: 1 }, { t: 'cut' });
  return ops;
}

/* ------------------------------------------------------------------ HTML (any normal printer / PDF) */
export async function renderHTML(ops, paper = 80) {
  const wide = paper === 'a4';
  const w = wide ? 180 : paper === 58 ? 52 : 74;
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let body = '';
  for (const op of ops) {
    if (op.t === 'text') body += `<div class="${op.align === 'c' ? 'c' : op.align === 'r' ? 'r' : ''} ${op.b ? 'b' : ''} ${op.size === 2 ? 'big' : ''}">${esc(op.s).replace(/\n/g, '<br>')}</div>`;
    else if (op.t === 'row') body += `<div class="row ${op.b ? 'b' : ''} ${op.size === 2 ? 'big' : ''}"><span>${esc(op.l).replace(/ /g, '&nbsp;')}</span><span>${esc(op.r)}</span></div>`;
    else if (op.t === 'hr') body += `<div class="hr ${op.ch === '=' ? 'dbl' : ''}"></div>`;
    else if (op.t === 'qr') body += `<div class="c"><img src="${await QRCode.toDataURL(op.data, { margin: 1, width: 300 })}" width="${wide ? 170 : 150}" height="${wide ? 170 : 150}"></div>`;
    else if (op.t === 'img') body += `<div class="c"><img src="${op.src}" style="max-width:55%;max-height:22mm"></div>`;
    else if (op.t === 'feed') body += '<div style="height:3mm"></div>';
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:${wide ? 'A4' : paper + 'mm'} auto;margin:${wide ? '12mm' : '0'}}
body{font-family:'Courier New',monospace;font-size:${wide ? 14 : 12}px;line-height:1.35;width:${w}mm;margin:0 auto;padding:${wide ? 0 : '2mm 0'};color:#000}
.c{text-align:center}.r{text-align:right}.b{font-weight:bold}.big{font-size:${wide ? 20 : 17}px}
.row{display:flex;justify-content:space-between;gap:6px}.hr{border-top:1px dashed #000;margin:4px 0}.hr.dbl{border-top:2px solid #000}
img{display:block;margin:3px auto}
</style></head><body>${body}</body></html>`;
}

/* ------------------------------------------------------------------ preview (Settings) */
export async function previewThermal(ops, cfg) {
  const dots = cfg.paper === 58 ? 384 : 576;
  if (cfg.graphic) {
    const c = await drawReceiptCanvas(ops, dots);
    return { image: c.toDataURL('image/png') };
  }
  const prepared = await prepareImages(ops, dots);
  return { text: renderEscText(prepared, cfg.paper === 58 ? 32 : 48).lines.join('\n') };
}

async function prepareImages(ops, dots) {
  const out = [];
  for (const op of ops) {
    if (op.t === 'img') {
      try { out.push({ ...op, bmp: await imgToBitmap(op.src, Math.round(dots * 0.45)) }); } catch (e) { /* skip */ }
    } else out.push(op);
  }
  return out;
}

/* ------------------------------------------------------------------ job runner */
async function thermalBytes(build, cfg, extra) {
  const dots = cfg.paper === 58 ? 384 : 576;
  if (cfg.graphic) {
    const ops = build('₹', extra);
    const canvas = await drawReceiptCanvas(ops.filter((x) => x.t !== 'kick'), dots);
    return canvasToEscBytes(canvas, { kick: !!extra?.kick });
  }
  const ops = await prepareImages(build('Rs.', extra), dots);
  return renderEscText(ops, cfg.paper === 58 ? 32 : 48).bytes;
}

/**
 * slot: 'bill' | 'kitchen'. build(cur, extra) -> ops.
 * Falls back to the normal browser print dialog if the thermal printer fails.
 */
export async function runPrint(slot, s, build, extra = {}) {
  const P = s.printers || {};
  let cfg = P[slot] || { mode: 'browser', paper: 80 };
  let useSlot = slot;
  if (slot === 'kitchen' && cfg.mode === 'bill') { cfg = P.bill; useSlot = 'bill'; }
  if (cfg.mode === 'off') return { ok: true, via: 'off' };
  if (cfg.mode === 'thermal') {
    try {
      await sendBytes(useSlot, cfg, await thermalBytes(build, cfg, extra));
      return { ok: true, via: 'thermal' };
    } catch (e) {
      toast(`Thermal printer: ${e.message || e}. Using normal print instead.`, 'warn');
    }
  }
  printHTML(await renderHTML(build('₹', { ...extra, kick: false }), cfg.mode === 'thermal' ? 80 : cfg.paper));
  return { ok: true, via: 'browser' };
}

/** Print a bill. provisional bills (no billNo) carry the amount QR for the customer to pay. */
export function printReceipt(order, s, tableName, totals, extra = {}) {
  const t = totals || order.totals || calcTotals(order, s);
  const kick = !!(s.drawerKick && extra.kick);
  return runPrint('bill', s, (cur, e) => receiptDoc(order, s, tableName, t, { cur, kick: e?.kick }), { kick });
}

export async function printKOT(kot, s) {
  const copies = Math.max(1, +s.kotCopies || 1);
  for (let i = 0; i < copies; i++) await runPrint('kitchen', s, () => kotDoc(kot));
}

export function testDoc(s, cur = '₹') {
  const ops = [];
  ops.push({ t: 'text', s: s.name || 'Test print', align: 'c', b: 1, size: 2 });
  ops.push({ t: 'text', s: 'Printer test OK', align: 'c' });
  ops.push({ t: 'hr' });
  ops.push({ t: 'row', l: 'Left aligned', r: 'Right' });
  ops.push({ t: 'text', s: 'Hindi / गुजराती: पनीर ટિક્કા (graphic mode only)' });
  ops.push({ t: 'row', l: 'TOTAL', r: cur + '420', b: 1, size: 2 });
  if (s.upiId) { ops.push({ t: 'qr', data: upiLink(s, 1, 'Test') }); ops.push({ t: 'text', s: 'UPI test QR Rs.1.00', align: 'c' }); }
  ops.push({ t: 'feed', n: 1 }, { t: 'cut' });
  return ops;
}

export function sampleOrder(data) {
  const items = data.menu.slice(0, 3).map((m, i) => ({ lineId: 'p' + i, itemId: m.id, name: m.name, catId: m.catId, price: m.price, gst: m.gst, qty: i + 1, sent: 0, note: i === 0 ? 'less spicy' : '' }));
  const order = { id: 'preview', no: 101, type: 'dine', tableId: data.tables[0]?.id, items: items.length ? items : [{ lineId: 'p', name: 'Sample Dish', price: 250, gst: 5, qty: 2, note: '' }], guest: { name: 'Guest' }, discount: { type: 'pct', value: 0 }, createdAt: Date.now() };
  return { order, totals: calcTotals(order, data.settings) };
}
