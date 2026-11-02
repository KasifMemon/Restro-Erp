// Automatic backups: rotating daily snapshots in IndexedDB (survives clearing localStorage),
// optional folder sync (Chrome/Edge desktop), manual download and Share (phones).
import { dkey, downloadBlob } from './utils.js';

const DB = 'restro-backups';
const ST = 'snaps';
const KV = 'kv';

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(ST, { keyPath: 'id' }); r.result.createObjectStore(KV); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function tx(store, mode, fn) {
  return open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const rq = fn(t.objectStore(store));
    t.oncomplete = () => { res(rq && rq.result); db.close(); };
    t.onerror = () => { rej(t.error); db.close(); };
  }));
}
const kvGet = (k) => tx(KV, 'readonly', (s) => s.get(k));
const kvSet = (k, v) => tx(KV, 'readwrite', (s) => s.put(v, k));
const kvDel = (k) => tx(KV, 'readwrite', (s) => s.delete(k));

function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return h + ':' + str.length; }

/* meta (kept outside the data so backing up never changes what gets backed up) */
const META = 'restro-meta';
export const getMeta = () => { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch { return {}; } };
export const setMeta = (p) => { try { localStorage.setItem(META, JSON.stringify({ ...getMeta(), ...p })); } catch { /* ignore */ } };

export async function listSnaps() {
  const all = (await tx(ST, 'readonly', (s) => s.getAll())) || [];
  return all.map(({ json, ...m }) => m).sort((a, b) => b.ts - a.ts);
}
export const getSnap = (id) => tx(ST, 'readonly', (s) => s.get(id));
export const delSnap = (id) => tx(ST, 'readwrite', (s) => s.delete(id));

export async function saveSnap(data, kind = 'auto', keep = 7) {
  const json = JSON.stringify(data);
  const id = kind === 'auto' ? 'auto-' + dkey(Date.now()) : kind + '-' + Date.now();
  await tx(ST, 'readwrite', (s) => s.put({ id, ts: Date.now(), kind, size: json.length, orders: data.orders.length, json }));
  const metas = await listSnaps();
  for (const m of metas.filter((x) => x.kind === 'auto').slice(keep)) await delSnap(m.id);
  for (const m of metas.filter((x) => x.kind !== 'auto').slice(8)) await delSnap(m.id);
  return id;
}

/* ---- folder sync ---- */
export const folderSupported = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
export async function pickFolder() {
  const h = await window.showDirectoryPicker({ mode: 'readwrite' });
  await kvSet('folder', h);
  return h.name;
}
export async function folderStatus() {
  try {
    const h = await kvGet('folder');
    if (!h) return { name: '', perm: 'none' };
    return { name: h.name, perm: await h.queryPermission({ mode: 'readwrite' }) };
  } catch { return { name: '', perm: 'none' }; }
}
export async function folderRequest() {
  const h = await kvGet('folder');
  return h ? h.requestPermission({ mode: 'readwrite' }) : 'denied';
}
export const folderForget = () => kvDel('folder');
export async function folderWrite(json) {
  try {
    const h = await kvGet('folder');
    if (!h || (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') return false;
    const f = await h.getFileHandle(`restro-backup-${dkey(Date.now())}.json`, { create: true });
    const w = await f.createWritable();
    await w.write(json);
    await w.close();
    return true;
  } catch { return false; }
}

/* ---- scheduler ---- */
let lastHash = '';
/** Called every few minutes: snapshot only if something changed. */
export async function autoTick(data, force = false) {
  if (!data.settings.autoBackup && !force) return null;
  const json = JSON.stringify(data);
  const h = hash(json);
  if (h === lastHash && !force) return null;
  lastHash = h;
  await saveSnap(data, 'auto', data.settings.backupKeep || 7);
  const meta = { lastAutoAt: Date.now() };
  if (await folderWrite(json)) meta.lastExportAt = Date.now();
  setMeta(meta);
  return meta;
}

/* ---- off-device copies ---- */
export function downloadBackup(data) {
  downloadBlob(`restro-erp-backup-${dkey(Date.now())}.json`, new Blob([JSON.stringify(data)], { type: 'application/json' }));
  setMeta({ lastExportAt: Date.now() });
}
export async function shareBackup(data) {
  const file = new File([JSON.stringify(data)], `restro-erp-backup-${dkey(Date.now())}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'RestroERP backup' });
    setMeta({ lastExportAt: Date.now() });
    return true;
  }
  return false;
}
