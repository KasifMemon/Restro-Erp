// ESC/POS byte builder + renderers (text mode and graphic/raster mode)
import QRCode from 'qrcode';

const ESC = 0x1b, GS = 0x1d;

export function qrMatrix(text) {
  const q = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = q.modules.size, d = q.modules.data;
  return { n, on: (x, y) => !!d[y * n + x] };
}

const SUB = { '₹': 'Rs.', '–': '-', '—': '-', '×': 'x', '»': '>>', '✓': '', '•': '*', '’': "'", '‘': "'", '“': '"', '”': '"' };
const ascii = (s) => String(s).replace(/[^\x00-\x7f]/g, (c) => (c in SUB ? SUB[c] : '?'));

export function wrapText(s, w) {
  const out = [];
  for (const para of ascii(s).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      let wd = word;
      while (wd.length > w) { if (line) { out.push(line); line = ''; } out.push(wd.slice(0, w)); wd = wd.slice(w); }
      if (!line) line = wd;
      else if ((line + ' ' + wd).length <= w) line += ' ' + wd;
      else { out.push(line); line = wd; }
    }
    out.push(line);
  }
  return out;
}

/** pack a monochrome bitmap into GS v 0 raster bands */
export function rasterBytes(w, h, black) {
  const bw = Math.ceil(w / 8);
  const out = [];
  const BAND = 96;
  for (let y0 = 0; y0 < h; y0 += BAND) {
    const rows = Math.min(BAND, h - y0);
    out.push(GS, 0x76, 0x30, 0, bw & 255, bw >> 8, rows & 255, rows >> 8);
    for (let y = y0; y < y0 + rows; y++) {
      for (let bx = 0; bx < bw; bx++) {
        let b = 0;
        for (let k = 0; k < 8; k++) { const x = bx * 8 + k; if (x < w && black(x, y)) b |= 0x80 >> k; }
        out.push(b);
      }
    }
  }
  return out;
}

/** Text-mode renderer. Returns { bytes, lines } (lines = plain preview) */
export function renderEscText(ops, cols = 48) {
  const b = [];
  const lines = [];
  const dots = cols * 12;
  const push = (...x) => b.push(...x);
  const put = (s) => { for (const ch of ascii(s)) b.push(ch.charCodeAt(0)); };
  const align = (a) => push(ESC, 0x61, a === 'c' ? 1 : a === 'r' ? 2 : 0);
  const style = (bold, size) => { push(ESC, 0x45, bold ? 1 : 0); push(GS, 0x21, size === 2 ? 0x11 : 0); };
  push(ESC, 0x40); // init

  for (const op of ops) {
    if (op.t === 'text') {
      const eff = op.size === 2 ? Math.floor(cols / 2) : cols;
      align(op.align); style(op.b, op.size);
      for (const ln of wrapText(op.s, eff)) { put(ln + '\n'); lines.push(pad(ln, eff, op.align)); }
      style(0, 1); align('l');
    } else if (op.t === 'row') {
      const eff = op.size === 2 ? Math.floor(cols / 2) : cols;
      align('l'); style(op.b, op.size);
      const l = ascii(op.l), r = ascii(op.r);
      if (l.length + r.length + 1 <= eff) {
        const ln = l + ' '.repeat(eff - l.length - r.length) + r;
        put(ln + '\n'); lines.push(ln);
      } else {
        for (const x of wrapText(l, eff)) { put(x + '\n'); lines.push(x); }
        const ln = ' '.repeat(Math.max(0, eff - r.length)) + r;
        put(ln + '\n'); lines.push(ln);
      }
      style(0, 1);
    } else if (op.t === 'hr') {
      const ln = (op.ch || '-').repeat(cols);
      align('l'); put(ln + '\n'); lines.push(ln);
    } else if (op.t === 'qr') {
      const m = qrMatrix(op.data);
      const quiet = 3, total = m.n + quiet * 2;
      const scale = Math.max(2, Math.floor(Math.min(dots * 0.62, 250) / total));
      const W = total * scale;
      align('c');
      b.push(...rasterBytes(W, W, (x, y) => { const mx = Math.floor(x / scale) - quiet, my = Math.floor(y / scale) - quiet; return mx >= 0 && my >= 0 && mx < m.n && my < m.n && m.on(mx, my); }));
      align('l'); lines.push('[ QR CODE ]');
    } else if (op.t === 'img' && op.bmp) {
      align('c');
      b.push(...rasterBytes(op.bmp.w, op.bmp.h, (x, y) => op.bmp.data[y * op.bmp.w + x] === 1));
      align('l'); lines.push('[ LOGO ]');
    } else if (op.t === 'feed') {
      push(ESC, 0x64, op.n || 1);
    } else if (op.t === 'kick') {
      push(ESC, 0x70, 0, 60, 120);
    } else if (op.t === 'cut') {
      push(ESC, 0x64, 3); push(GS, 0x56, 0x42, 0);
    }
  }
  return { bytes: Uint8Array.from(b), lines };
}
function pad(s, w, a) {
  if (a === 'c') return ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;
  if (a === 'r') return ' '.repeat(Math.max(0, w - s.length)) + s;
  return s;
}

/* ---------- images ---------- */
export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
/** logo -> 1-bit bitmap {w,h,data[]} (1 = black) */
export async function imgToBitmap(src, maxW) {
  const img = await loadImage(src);
  const k = Math.min(1, maxW / img.width);
  const w = Math.max(8, Math.round(img.width * k)), h = Math.max(8, Math.round(img.height * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const data = new Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2] < 150 ? 1 : 0;
  return { w, h, data };
}

/** Graphic mode: draw the whole receipt on a canvas (any language/font) and send it as an image */
export async function drawReceiptCanvas(ops, W) {
  const FONT = '"Inter","Noto Sans","Noto Sans Devanagari","Noto Sans Gujarati","Mangal","Nirmala UI",system-ui,sans-serif';
  const base = W >= 500 ? 24 : 20;
  const pad2 = 6;
  const c = document.createElement('canvas');
  c.width = W; c.height = 1800 + ops.length * 90;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#000'; g.textBaseline = 'top';
  const font = (bold, size) => `${bold ? 700 : 400} ${size}px ${FONT}`;
  const wrap = (txt, maxW) => {
    const out = [];
    for (const para of String(txt).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        if (!word) continue;
        const t = line ? line + ' ' + word : word;
        if (g.measureText(t).width <= maxW || !line) line = t; else { out.push(line); line = word; }
      }
      out.push(line);
    }
    return out;
  };
  let y = 4;
  for (const op of ops) {
    if (op.t === 'text') {
      const size = Math.round(base * (op.size === 2 ? 1.7 : 1));
      g.font = font(op.b, size);
      for (const ln of wrap(op.s, W - pad2 * 2)) {
        const w = g.measureText(ln).width;
        g.fillText(ln, op.align === 'c' ? (W - w) / 2 : op.align === 'r' ? W - pad2 - w : pad2, y);
        y += Math.round(size * 1.28);
      }
    } else if (op.t === 'row') {
      const size = Math.round(base * (op.size === 2 ? 1.7 : 1));
      g.font = font(op.b, size);
      const rw = g.measureText(op.r).width;
      const lines = wrap(op.l, W - pad2 * 2 - rw - 10);
      lines.forEach((ln, i) => {
        g.fillText(ln, pad2, y);
        if (i === lines.length - 1) g.fillText(op.r, W - pad2 - rw, y);
        y += Math.round(size * 1.28);
      });
    } else if (op.t === 'hr') {
      y += 3;
      g.fillRect(pad2, y, W - pad2 * 2, op.ch === '=' ? 3 : 1.5);
      y += 9;
    } else if (op.t === 'qr') {
      const m = qrMatrix(op.data);
      const quiet = 2, total = m.n + quiet * 2;
      const scale = Math.max(2, Math.floor(Math.min(W * 0.62, 260) / total));
      const x0 = Math.round((W - total * scale) / 2);
      for (let my = 0; my < m.n; my++) for (let mx = 0; mx < m.n; mx++) if (m.on(mx, my)) g.fillRect(x0 + (mx + quiet) * scale, y + (my + quiet) * scale, scale, scale);
      y += total * scale + 4;
    } else if (op.t === 'img') {
      try {
        const img = await loadImage(op.src);
        const w = Math.round(Math.min(W * (op.w || 0.5), img.width)), h = Math.round((img.height * w) / img.width);
        g.drawImage(img, (W - w) / 2, y, w, h);
        y += h + 6;
      } catch (e) { /* skip bad logo */ }
    } else if (op.t === 'feed') y += (op.n || 1) * base;
  }
  const out = document.createElement('canvas');
  out.width = W; out.height = Math.ceil(y + 8);
  out.getContext('2d').drawImage(c, 0, 0);
  return out;
}

export function canvasToEscBytes(canvas, { cut = true, kick = false } = {}) {
  const { width: w, height: h } = canvas;
  const px = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const black = (x, y) => { const i = (y * w + x) * 4; return 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2] < 165; };
  const b = [ESC, 0x40];
  if (kick) b.push(ESC, 0x70, 0, 60, 120);
  b.push(...rasterBytes(w, h, black));
  if (cut) b.push(ESC, 0x64, 3, GS, 0x56, 0x42, 0);
  return Uint8Array.from(b);
}
