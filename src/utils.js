export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const inr = (n) =>
  '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

export const dkey = (ts) => {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtDT = (ts) => fmtDate(ts) + ', ' + fmtTime(ts);
export const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const DAY = 86400000;

/** Bill maths: discount -> GST per line (CGST+SGST) -> service charge -> round off */
export function calcTotals(order, settings) {
  const lines = (order.items || []).filter((l) => l.qty > 0);
  const incl = !!settings.taxInclusive;
  let sub = 0;
  const bases = lines.map((l) => {
    const gross = l.price * l.qty;
    const base = incl ? gross / (1 + l.gst / 100) : gross;
    sub += base;
    return { l, base };
  });
  const d = order.discount || { type: 'pct', value: 0 };
  let disc = d.type === 'pct' ? (sub * (Number(d.value) || 0)) / 100 : Number(d.value) || 0;
  disc = Math.min(Math.max(disc, 0), sub);
  const taxable = sub - disc;
  const ratio = sub ? taxable / sub : 0;
  const taxByRate = {};
  let tax = 0;
  bases.forEach(({ l, base }) => {
    const t = base * ratio;
    const tx = (t * l.gst) / 100;
    tax += tx;
    taxByRate[l.gst] = taxByRate[l.gst] || { taxable: 0, tax: 0 };
    taxByRate[l.gst].taxable += t;
    taxByRate[l.gst].tax += tx;
  });
  const sc = order.type === 'dine' && !order.scOff ? (taxable * (settings.serviceCharge || 0)) / 100 : 0;
  const raw = taxable + tax + sc;
  const total = Math.round(raw);
  return { sub, disc, taxable, tax, cgst: tax / 2, sgst: tax / 2, sc, round: total - raw, total, taxByRate, qty: lines.reduce((a, l) => a + l.qty, 0) };
}

export function downloadCSV(name, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  downloadBlob(name, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}
export function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Print via hidden iframe (no popup blockers) */
export function printHTML(html) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const doc = f.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* ignore */ }
    setTimeout(() => f.remove(), 3000);
  }, 250);
}

const css = `<style>
@page{size:80mm auto;margin:2mm}
body{font-family:'Courier New',monospace;font-size:12px;width:72mm;margin:0;color:#000}
h1{font-size:16px;text-align:center;margin:0}.c{text-align:center}.r{text-align:right}
.row{display:flex;justify-content:space-between}.hr{border-top:1px dashed #000;margin:5px 0}
table{width:100%;border-collapse:collapse}td,th{padding:1px 0;vertical-align:top;font-size:12px}th{text-align:left;border-bottom:1px dashed #000}
.b{font-weight:bold}.big{font-size:15px}
</style>`;

const money = (n) => (Number(n) || 0).toFixed(2);

export function receiptHTML(order, s, tableName, totals, qr) {
  const t = totals || order.totals;
  const lines = order.items.filter((l) => l.qty > 0);
  const rates = Object.entries(t.taxByRate || {});
  return `<html><head>${css}</head><body>
<h1>${s.name}</h1>
<div class="c">${s.address || ''}</div>
<div class="c">${s.phone ? 'Ph: ' + s.phone : ''}</div>
${s.gstin ? `<div class="c">GSTIN: ${s.gstin}</div>` : ''}
<div class="hr"></div>
<div class="row"><span>Bill: ${order.billNo ? '#' + order.billNo : '(Provisional)'}</span><span>Order #${order.no}</span></div>
<div class="row"><span>${fmtDT(order.paidAt || Date.now())}</span><span>${order.type === 'dine' ? tableName || '' : order.type === 'take' ? 'Takeaway' : 'Delivery'}</span></div>
${order.guest?.name ? `<div>Customer: ${order.guest.name} ${order.guest.phone || ''}</div>` : ''}
${order.type === 'delivery' && order.guest?.address ? `<div>Addr: ${order.guest.address}</div>` : ''}
<div class="hr"></div>
<table><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amt</th></tr>
${lines.map((l) => `<tr><td>${l.name}</td><td class="r">${l.qty}</td><td class="r">${money(l.price)}</td><td class="r">${money(l.price * l.qty)}</td></tr>`).join('')}
</table>
<div class="hr"></div>
<div class="row"><span>Sub Total${s.taxInclusive ? ' (excl. tax)' : ''}</span><span>${money(t.sub)}</span></div>
${t.disc ? `<div class="row"><span>Discount</span><span>-${money(t.disc)}</span></div>` : ''}
${t.sc ? `<div class="row"><span>Service Charge (${s.serviceCharge}%)</span><span>${money(t.sc)}</span></div>` : ''}
${rates.map(([r, v]) => `<div class="row"><span>CGST ${r / 2}%</span><span>${money(v.tax / 2)}</span></div><div class="row"><span>SGST ${r / 2}%</span><span>${money(v.tax / 2)}</span></div>`).join('')}
${Math.abs(t.round) > 0.004 ? `<div class="row"><span>Round off</span><span>${money(t.round)}</span></div>` : ''}
<div class="hr"></div>
<div class="row b big"><span>TOTAL</span><span>₹${t.total}</span></div>
<div class="hr"></div>
${(order.payments || []).map((p) => `<div class="row"><span>Paid by ${p.mode.toUpperCase()}</span><span>${money(p.amount)}</span></div>`).join('')}
${order.due ? `<div class="row"><span>Credit / Due</span><span>${money(order.due)}</span></div>` : ''}
${s.upiId && !order.payments?.length ? `<div class="c">Pay via UPI: ${s.upiId}</div>${qr ? `<div class="c"><img src="${qr}" width="150" height="150"/></div>` : ''}` : ''}
<div class="hr"></div>
<div class="c">${s.footer || ''}</div>
</body></html>`;
}

export function kotHTML(kot, s) {
  return `<html><head>${css}</head><body>
<h1>KOT #${kot.no}</h1>
<div class="c b big">${kot.label}</div>
<div class="row"><span>Order #${kot.orderNo}</span><span>${fmtTime(kot.time)}</span></div>
<div class="hr"></div>
<table>${kot.items.map((i) => `<tr><td class="b big">${i.qty} x</td><td class="b big">${i.name}${i.note ? `<div style="font-weight:normal;font-size:11px">» ${i.note}</div>` : ''}</td></tr>`).join('')}</table>
<div class="hr"></div>
<div class="c">${s.name}</div>
</body></html>`;
}
