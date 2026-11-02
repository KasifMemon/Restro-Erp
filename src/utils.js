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
export const ago = (ts) => {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' h ago';
  return Math.round(m / 1440) + ' day(s) ago';
};

/** UPI deep-link used for the payment QR (amount is baked in) */
export const upiLink = (s, amt, note) =>
  `upi://pay?pa=${encodeURIComponent(s.upiId)}&pn=${encodeURIComponent(s.name)}&am=${Number(amt).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note || '')}`;

/** Bill maths: discount -> loyalty redeem -> GST per line (CGST+SGST) -> service charge -> round off */
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
  const redeem = Math.min(Math.max(Number(order.redeem) || 0, 0), sub - disc);
  const taxable = sub - disc - redeem;
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
  return { sub, disc, redeem, taxable, tax, cgst: tax / 2, sgst: tax / 2, sc, round: total - raw, total, taxByRate, qty: lines.reduce((a, l) => a + l.qty, 0) };
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
    setTimeout(() => f.remove(), 4000);
  }, 400);
}

/** Resize an uploaded logo to a small PNG data-URL (keeps settings/backups light) */
export function fileToLogo(file, maxW = 360) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = reject;
    rd.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}

/** Minimal CSV parser (quotes, commas, newlines) */
export function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}
