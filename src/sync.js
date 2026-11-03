// Live multi-device sync. Each record (order, menu item, table, ...) is its own row in Supabase.
// Local changes are found by hashing records against what was last synced, pushed in batches, and
// other devices' changes are pulled every few seconds. Last write wins per record.
import { useEffect, useState } from 'react';
import { deviceId, userRest } from './cloud.js';
import { saveSnap } from './backup.js';

export const SYNC_COLLS = ['outlets', 'categories', 'menu', 'tables', 'orders', 'kots', 'ingredients', 'stockLog', 'suppliers', 'purchases', 'customers', 'staff', 'expenses', 'reservations', 'dayCloses'];
// Settings that belong to one device (hardware, licence, backups) and are never synced
const LOCAL_SETTINGS = ['printers', 'licenseKey', 'licenseStatus', 'licenseActivatedAt', 'autoBackup', 'backupKeep', 'autoPrintBill', 'autoPrintKot', 'kotCopies', 'drawerKick', 'masterCustomers', 'masterSubscriptionKeys', 'integrationBaseUrl'];
const META_KEY = 'restro-sync-v1';
const PAGE = 500;
const BATCH = 200;

const stable = (v) => (v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`);
const hash = (v) => { const s = stable(v); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return `${(h >>> 0).toString(36)}.${s.length.toString(36)}`; };
const strip = (settings) => { const o = { ...settings }; LOCAL_SETTINGS.forEach((k) => delete o[k]); return o; };

/* ---------- status (for the UI) ---------- */
let status = { state: 'off', last: 0, pending: 0, error: '' };
const subs = new Set();
const setStatus = (p) => { status = { ...status, ...p }; subs.forEach((f) => f(status)); };
export const syncStatus = () => status;
export function useSyncStatus() {
  const [s, setS] = useState(status);
  useEffect(() => { subs.add(setS); setS(status); return () => subs.delete(setS); }, []);
  return s;
}

/* ---------- engine ---------- */
let engine = null;
export const pokeSync = (now) => engine?.poke(now);
export const resolveSyncChoice = (choice) => engine?.resolve(choice);

export function startSync({ licenseId, store }) {
  const me = deviceId();
  let meta = (() => { try { return JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch { return null; } })();
  if (!meta || meta.lid !== licenseId) meta = { lid: licenseId, cursor: 0, hashes: {}, init: false };
  const save = () => { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ } };
  let running = false; let again = false; let stopped = false; let timer = null; let lastData = null; let choicePending = false;

  const collect = (d) => {
    const out = [];
    for (const c of SYNC_COLLS) for (const rec of d[c] || []) if (rec && rec.id) out.push({ coll: c, id: String(rec.id), rec, h: hash(rec) });
    const s = strip(d.settings || {}); out.push({ coll: 'settings', id: 'main', rec: s, h: hash(s) });
    out.push({ coll: 'counters', id: me, rec: d.counters || {}, h: hash(d.counters || {}) });
    return out;
  };

  const applyRows = (rows) => {
    if (!rows.length) return;
    const maps = {};
    store.update((d) => {
      for (const r of rows) {
        if (r.coll === 'settings') {
          if (!r.data) continue;
          const keep = {}; LOCAL_SETTINGS.forEach((k) => { if (d.settings[k] !== undefined) keep[k] = d.settings[k]; });
          d.settings = { ...d.settings, ...r.data, ...keep };
        } else if (r.coll === 'counters') {
          if (r.rec_id === me || !r.data) continue;
          d.counters = d.counters || {};
          for (const k of Object.keys(r.data)) d.counters[k] = Math.max(Number(d.counters[k]) || 0, Number(r.data[k]) || 0);
        } else if (SYNC_COLLS.includes(r.coll)) {
          const arr = (d[r.coll] = d[r.coll] || []);
          const m = (maps[r.coll] = maps[r.coll] || new Map(arr.map((x, i) => [String(x.id), i])));
          const i = m.get(r.rec_id);
          if (r.deleted) { if (i !== undefined) { arr[i] = null; m.delete(r.rec_id); } }
          else if (i !== undefined) arr[i] = r.data;
          else { m.set(r.rec_id, arr.length); arr.push(r.data); }
        }
      }
      for (const c of SYNC_COLLS) if (maps[c]) d[c] = d[c].filter(Boolean);
    });
    for (const r of rows) {
      if (r.coll === 'counters') continue;
      meta.hashes[r.coll] = meta.hashes[r.coll] || {};
      if (r.deleted) delete meta.hashes[r.coll][r.rec_id]; else if (r.data) meta.hashes[r.coll][r.rec_id] = hash(r.data);
    }
  };

  const fetchPage = (cursor) => userRest(`sync_records?license_id=eq.${licenseId}&seq=gt.${cursor}&order=seq.asc&limit=${PAGE}&select=coll,rec_id,data,deleted,seq`);

  const pull = async () => {
    for (;;) {
      const rows = await fetchPage(meta.cursor);
      applyRows(rows);
      if (rows.length) meta.cursor = rows[rows.length - 1].seq;
      save();
      if (rows.length < PAGE) break;
    }
  };

  const push = async () => {
    const d = store.get();
    if (d === lastData) return;
    const items = collect(d);
    const rows = []; const seen = {};
    for (const x of items) {
      (seen[x.coll] = seen[x.coll] || new Set()).add(x.id);
      if ((meta.hashes[x.coll] || {})[x.id] !== x.h) rows.push({ license_id: licenseId, coll: x.coll, rec_id: x.id, data: x.rec, deleted: false, device_id: me, _h: x.h });
    }
    for (const c of SYNC_COLLS) for (const id of Object.keys(meta.hashes[c] || {})) if (!(seen[c] && seen[c].has(id))) rows.push({ license_id: licenseId, coll: c, rec_id: id, data: null, deleted: true, device_id: me });
    setStatus({ pending: rows.length });
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await userRest('sync_records?on_conflict=license_id,coll,rec_id', { method: 'POST', body: batch.map(({ _h, ...r }) => r), prefer: 'resolution=merge-duplicates,return=minimal' });
      for (const r of batch) {
        meta.hashes[r.coll] = meta.hashes[r.coll] || {};
        if (r.deleted) delete meta.hashes[r.coll][r.rec_id]; else meta.hashes[r.coll][r.rec_id] = r._h;
      }
      save(); setStatus({ pending: Math.max(0, rows.length - i - batch.length) });
    }
    lastData = d;
  };

  const adoptCloud = async () => {
    try { await saveSnap(store.get(), 'pre-restore'); } catch { /* ignore */ }
    store.update((d) => { for (const c of SYNC_COLLS) d[c] = []; });
    meta.cursor = 0; meta.hashes = {}; save();
    await pull();
    meta.init = true; lastData = null; save();
  };

  const bootstrap = async () => {
    const d = store.get();
    const first = await userRest(`sync_records?license_id=eq.${licenseId}&select=seq&limit=1`);
    const serverHas = first.length > 0;
    if (!serverHas) {
      if (!d.settings.setupDone) { setStatus({ state: 'waiting', error: '' }); return false; } // wait for the first setup before uploading
      meta.init = true; save(); return true;
    }
    if (!d.settings.setupDone) { await adoptCloud(); return true; } // fresh device joins the restaurant
    if (!choicePending) { choicePending = true; setStatus({ state: 'needs_choice' }); }
    return false;
  };

  const cycle = async () => {
    if (stopped) return;
    if (running) { again = true; return; }
    running = true;
    try {
      if (!meta.init && !(await bootstrap())) return;
      await push();
      await pull();
      setStatus({ state: 'idle', last: Date.now(), error: '' });
    } catch (e) {
      if (e.status === 401 || e.status === 403) setStatus({ state: 'blocked', error: 'Sync is not allowed for this licence.' });
      else if (e instanceof TypeError || /fetch|network/i.test(e.message)) setStatus({ state: 'offline', error: '' });
      else setStatus({ state: 'error', error: e.message || 'Sync failed' });
    } finally { running = false; if (again) { again = false; setTimeout(cycle, 300); } }
  };

  const tick = () => { if (document.visibilityState === 'visible' && navigator.onLine !== false) cycle(); };
  let debounce = null;
  const api = {
    poke(now) { clearTimeout(debounce); debounce = setTimeout(cycle, now ? 0 : 1500); },
    async resolve(choice) {
      choicePending = false; running = true;
      try {
        if (choice === 'cloud') await adoptCloud(); else { meta.init = true; save(); }
      } catch (e) { setStatus({ state: 'error', error: e.message }); }
      finally { running = false; }
      cycle();
    },
  };
  engine = api;
  setStatus({ state: 'syncing', error: '' });
  timer = setInterval(tick, 5000);
  const vis = () => { if (document.visibilityState === 'visible') cycle(); };
  document.addEventListener('visibilitychange', vis);
  window.addEventListener('online', cycle);
  cycle();
  return () => {
    stopped = true; clearInterval(timer); clearTimeout(debounce);
    document.removeEventListener('visibilitychange', vis); window.removeEventListener('online', cycle);
    if (engine === api) engine = null;
    setStatus({ state: 'off' });
  };
}
