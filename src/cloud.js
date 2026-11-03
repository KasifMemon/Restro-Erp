// Supabase client helpers (no SDK: small fetch wrappers so the bundle stays light).
const BASE = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const cloudConfigured = Boolean(BASE && ANON);
/** Developer build (VITE_DEV_CONSOLE=1) contains the Developer Console. Customer builds do not. */
export const DEV_BUILD = import.meta.env.VITE_DEV_CONSOLE === '1';
/** Customer builds require a valid licence (or the free trial) when VITE_REQUIRE_LICENSE=1. */
export const LICENSE_REQUIRED = import.meta.env.VITE_REQUIRE_LICENSE === '1' && cloudConfigured && !DEV_BUILD;
export const TRIAL_DAYS = Number(import.meta.env.VITE_TRIAL_DAYS || 7);
export const APP_VERSION = '3.7';

const DAY = 86400000;
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

/* ---------- device + licence (customer side) ---------- */
export function deviceId() {
  let id = '';
  try { id = localStorage.getItem('restro-device-id') || ''; } catch { /* ignore */ }
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/-/g, '');
    try { localStorage.setItem('restro-device-id', id); } catch { /* ignore */ }
  }
  return id;
}
const deviceLabel = () => (navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || 'browser').slice(0, 60);

/* ---------- customer login ---------- */
const AKEY = 'restro-auth-v1';
const loadAuth = () => read(AKEY, null);
const saveAuth = (a) => { try { a ? localStorage.setItem(AKEY, JSON.stringify(a)) : localStorage.removeItem(AKEY); } catch { /* ignore */ } };
export const customerSession = () => { const a = loadAuth(); return a?.refresh_token ? { email: a.email, uid: a.uid } : null; };
const emitAuth = () => { try { window.dispatchEvent(new Event('restro-auth')); } catch { /* ignore */ } };

async function authGrant(grant, body) {
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON }, body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) { const e = new Error(j.error_description || j.msg || 'Sign-in failed'); e.auth = res.status >= 400 && res.status < 500; throw e; }
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, email: j.user?.email || body.email || '', uid: j.user?.id || '' };
}
export async function customerSignIn(email, password) {
  const a = await authGrant('password', { email: email.trim().toLowerCase(), password });
  // A different account on this device must not inherit the previous licence
  const c = getLicenseCache();
  if (c && c.uid && c.uid !== a.uid) clearLicense();
  saveAuth(a); emitAuth(); return a;
}
export function customerSignOut() { saveAuth(null); emitAuth(); }
async function userToken() {
  let a = loadAuth();
  if (!a) return null;
  if (a.expires_at - Date.now() < 60000) {
    try { a = await authGrant('refresh_token', { refresh_token: a.refresh_token }); saveAuth(a); }
    catch (e) { if (e.auth) { saveAuth(null); emitAuth(); return null; } throw e; } // network errors keep the session (offline use)
  }
  return a.access_token;
}

/* ---------- forgot / reset password (email link) ---------- */
export async function requestPasswordReset(email) {
  const res = await fetch(`${BASE}/auth/v1/recover?redirect_to=${encodeURIComponent(`${location.origin}/`)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON }, body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (res.status === 429) throw new Error('Too many requests. Please wait a few minutes and try again.');
  if (!res.ok && res.status >= 500) throw new Error('Could not send the email right now. Please try again later.');
  return true; // same answer whether or not the account exists
}
/** Reads a recovery link (#access_token=...&type=recovery) once, then removes it from the address bar. */
export function takeRecoveryLink() {
  const h = (location.hash || '').replace(/^#/, '');
  if (!h) return null;
  const q = new URLSearchParams(h);
  if (q.get('type') !== 'recovery' && !q.get('error_code')) return null;
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
  if (q.get('error_code')) return { error: 'This reset link has expired or was already used. Request a new one.' };
  return { token: q.get('access_token') };
}
export async function setNewPassword(token, password) {
  const res = await fetch(`${BASE}/auth/v1/user`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` }, body: JSON.stringify({ password }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(/same|different/i.test(j.msg || j.message || '') ? 'Choose a password different from your old one.' : (j.msg || j.message || 'Could not change the password. Request a new link.'));
  return true;
}

async function fn(name, body) {
  const token = await userToken();
  if (!token) return { valid: false, ok: false, reason: 'auth' };
  const res = await fetch(`${BASE}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const getLicenseCache = () => read('restro-license-v1', null);
export const clearLicense = () => { try { localStorage.removeItem('restro-license-v1'); } catch { /* ignore */ } };

export function trialInfo() {
  let start = read('restro-trial-start', 0);
  if (!start) { start = Date.now(); write('restro-trial-start', start); }
  const left = Math.ceil((start + TRIAL_DAYS * DAY - Date.now()) / DAY);
  return { start, left: Math.max(0, left) };
}

/** Ask the server about a key. Updates the local cache. Returns the server answer or { offline:true }. */
export async function verifyLicense(key, profile) {
  let r;
  try {
    r = await fn('verify-license', { key, device_id: deviceId(), label: deviceLabel(), app_version: APP_VERSION, profile });
  } catch { return { offline: true }; }
  if (r && r.reason === 'auth') return r;
  if (r && typeof r.valid === 'boolean') {
    write('restro-license-v1', { key, uid: loadAuth()?.uid || '', result: r, lastCheck: Date.now(), lastOk: r.valid ? Date.now() : (getLicenseCache()?.lastOk || 0), seen: Date.now() });
  }
  return r;
}

/**
 * Local verdict from the cache, usable offline.
 * state: ok | grace | trial | blocked ; reason explains blocked
 */
export function licenseVerdict() {
  const c = getLicenseCache();
  const today = new Date().toISOString().slice(0, 10);
  if (c?.key && c.result) {
    const r = c.result;
    if (c.seen && Date.now() < c.seen - DAY) return { state: 'blocked', reason: 'clock', key: c.key };
    write('restro-license-v1', { ...c, seen: Math.max(c.seen || 0, Date.now()) });
    if (!r.valid) return { state: 'blocked', reason: r.reason || 'invalid', key: c.key, r };
    if (r.expires_on && r.expires_on < today) return { state: 'blocked', reason: 'expired', key: c.key, r };
    const graceMs = (r.grace_days || 7) * DAY;
    const sinceOk = Date.now() - (c.lastOk || 0);
    if (sinceOk > graceMs) return { state: 'blocked', reason: 'verify', key: c.key, r };
    const daysLeft = Math.ceil((new Date(r.expires_on) - Date.now()) / DAY);
    return { state: sinceOk > DAY ? 'grace' : 'ok', key: c.key, r, daysLeft, offlineDays: Math.floor(sinceOk / DAY) };
  }
  const t = trialInfo();
  return t.left > 0 ? { state: 'trial', daysLeft: t.left } : { state: 'blocked', reason: 'trial_over' };
}

export const REASON_TEXT = {
  not_found: 'This licence key was not found. Check it and try again.',
  not_yours: 'This licence key belongs to a different account. Use the key sent to you.',
  auth: 'Please sign in again.',
  bad_key: 'That does not look like a valid key. It starts with RESTRO-.',
  expired: 'Your subscription has expired. Please renew to continue.',
  suspended: 'This licence is suspended. Please contact support.',
  revoked: 'This licence has been revoked. Please contact support.',
  not_started: 'This licence is not active yet.',
  device_limit: 'This licence is already used on the maximum number of devices.',
  verify: 'The licence could not be verified for several days. Connect to the internet once to continue.',
  clock: 'The device clock looks wrong. Fix the date and time, then reopen the app.',
  trial_over: 'One-time activation: enter the licence key you received.',
  invalid: 'This licence is not valid.',
};

/* ---------- cloud backup (customer side, per licence) ---------- */
export async function cloudBackup(action, data) {
  const key = getLicenseCache()?.key;
  if (!key) return { ok: false, reason: 'nolicense' };
  try { return await fn('cloud-backup', { key, device_id: deviceId(), action, data }); } catch { return { ok: false, reason: 'offline' }; }
}
export const getCloudMeta = () => read('restro-cloud-meta', {});
export const setCloudMeta = (m) => write('restro-cloud-meta', { ...getCloudMeta(), ...m });

/* ---------- developer auth + REST (developer build only) ---------- */
const SKEY = 'restro-developer-session-v2';
const loadSess = () => { try { return JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch { return null; } };
const saveSess = (s) => { try { s ? sessionStorage.setItem(SKEY, JSON.stringify(s)) : sessionStorage.removeItem(SKEY); } catch { /* ignore */ } };
const shape = (j) => ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 });

async function authCall(grant, body) {
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON }, body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Error(j.error_description || j.msg || 'Sign-in failed');
  return shape(j);
}
export async function devSignIn(email, password) { const s = await authCall('password', { email, password }); saveSess(s); return s; }
export const devSignOut = () => saveSess(null);
export const devHasSession = () => Boolean(loadSess()?.refresh_token);

async function devToken() {
  let s = loadSess();
  if (!s) throw new Error('Signed out');
  if (s.expires_at - Date.now() < 60000) {
    try { s = await authCall('refresh_token', { refresh_token: s.refresh_token }); saveSess(s); }
    catch { saveSess(null); throw new Error('Session expired. Please sign in again.'); }
  }
  return s.access_token;
}
/** PostgREST call as the signed-in developer. path e.g. 'customers?select=*' */
export async function devRest(path, { method = 'GET', body, prefer } = {}) {
  const token = await devToken();
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const j = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(j?.message || `Request failed (${res.status})`);
  return j;
}
export const devRpc = (name, args) => devRest(`rpc/${name}`, { method: 'POST', body: args || {} });

export async function devFn(name, body) {
  const token = await devToken();
  const res = await fetch(`${BASE}/functions/v1/${name}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  });
  return res.json();
}
export const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_URL || 'https://restro-erp-customer.vercel.app';
