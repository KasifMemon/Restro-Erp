import { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldAlert, Clock } from 'lucide-react';
import Login from './Login.jsx';
import ResetPassword from './ResetPassword.jsx';
import { LICENSE_REQUIRED, REASON_TEXT, customerSession, takeRecoveryLink, cloudBackup, getCloudMeta, licenseVerdict, setCloudMeta, verifyLicense, getLicenseCache } from './cloud.js';
import { useStore } from './store.jsx';
import { Btn, inputCls } from './components.jsx';

function Activate({ verdict, onDone }) {
  const [key, setKey] = useState(verdict.key || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(verdict.reason ? REASON_TEXT[verdict.reason] || REASON_TEXT.invalid : '');
  const go = async (e) => {
    e?.preventDefault();
    setBusy(true); setErr('');
    const r = await verifyLicense(key.trim().toUpperCase());
    setBusy(false);
    if (r.offline) return setErr('No internet connection. Connect once to activate.');
    if (!r.valid) return setErr(REASON_TEXT[r.reason] || REASON_TEXT.invalid);
    onDone();
  };
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
      <form onSubmit={go} className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><KeyRound size={24} /></div>
        <div><h1 className="text-xl font-bold text-slate-800">Activate RestroERP</h1><p className="mt-1 text-sm text-slate-500">One-time step: enter the licence key your provider sent you.</p></div>
        <input className={`${inputCls} font-mono uppercase tracking-wide`} value={key} onChange={(e) => setKey(e.target.value)} placeholder="RESTRO-XXXXXXXXXX" autoCapitalize="characters" autoFocus />
        {err && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><ShieldAlert size={16} className="mt-0.5 shrink-0" />{err}</div>}
        <Btn className="w-full" size="lg" disabled={busy || key.trim().length < 8}>{busy ? 'Checking…' : 'Activate'}</Btn>
        <p className="text-center text-[11px] text-slate-400">Your sales data stays on this device. Only the licence key is checked online.</p>
      </form>
    </div>
  );
}

export default function LicenseGate({ children }) {
  const { data, get, setSettings } = useStore();
  const setupDone = data.settings.setupDone;
  const [verdict, setVerdict] = useState(() => (LICENSE_REQUIRED ? licenseVerdict() : { state: 'ok' }));
  const [asking, setAsking] = useState(false);
  const [recovery, setRecovery] = useState(() => (LICENSE_REQUIRED ? takeRecoveryLink() : null));
  useEffect(() => {
    if (!LICENSE_REQUIRED) return undefined;
    const onHash = () => { const r = takeRecoveryLink(); if (r) setRecovery(r); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [session, setSession] = useState(() => (LICENSE_REQUIRED ? customerSession() : null));
  useEffect(() => {
    const h = () => { setSession(customerSession()); setVerdict(LICENSE_REQUIRED ? licenseVerdict() : { state: 'ok' }); };
    window.addEventListener('restro-auth', h);
    return () => window.removeEventListener('restro-auth', h);
  }, []);

  const refresh = useCallback(async () => {
    const c = getLicenseCache();
    if (c?.key) {
      const d = get(); const st = d.settings;
      const resp = await verifyLicense(c.key, {
        name: st.name, address: st.address, phone: st.phone, gstin: st.gstin, fssai: st.fssai, setup_done: st.setupDone,
        tables: d.tables.length, menu: d.menu.length, staff: d.staff.length, orders: d.orders.length, bills: d.orders.filter((o) => o.status === 'paid').length,
      });
      if (resp?.reason === 'auth') { setSession(customerSession()); return; }
      // First run: pre-fill the restaurant name from the licence so setup starts with it
      const r = getLicenseCache()?.result;
      if (r?.valid && r.restaurant && !st.setupDone && st.name !== r.restaurant) setSettings({ name: r.restaurant });
    }
    setVerdict(licenseVerdict());
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!LICENSE_REQUIRED) return undefined;
    if (session) refresh();
    const iv = setInterval(refresh, 6 * 3600 * 1000);
    const vis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
  }, [refresh, session]);

  // Send the finished setup details to the provider as soon as the wizard completes
  useEffect(() => { if (LICENSE_REQUIRED && setupDone) refresh(); }, [setupDone, refresh]);

  // Daily automatic cloud backup while the licence is good
  useEffect(() => {
    if (!LICENSE_REQUIRED || !['ok', 'grace'].includes(verdict.state)) return undefined;
    const t = setTimeout(async () => {
      const m = getCloudMeta();
      if (m.auto === false || Date.now() - (m.lastUp || 0) < 20 * 3600 * 1000) return;
      const r = await cloudBackup('put', get());
      if (r.ok) setCloudMeta({ lastUp: Date.now(), size: r.size });
    }, 15000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [verdict.state]);

  if (!LICENSE_REQUIRED) return children;
  if (recovery) return <ResetPassword link={recovery} onDone={() => setRecovery(null)} />;
  if (!session) return <Login onDone={() => setSession(customerSession())} />;
  if (verdict.state === 'blocked' || asking) return <Activate verdict={asking ? { key: verdict.key } : verdict} onDone={() => { setAsking(false); setVerdict(licenseVerdict()); refresh(); }} />;

  const warn = verdict.state === 'trial' ? `Free trial: ${verdict.daysLeft} day${verdict.daysLeft === 1 ? '' : 's'} left`
    : verdict.state === 'grace' ? `Offline ${verdict.offlineDays} days: connect to the internet soon`
    : verdict.daysLeft <= 7 ? `Subscription ends in ${Math.max(0, verdict.daysLeft)} day${verdict.daysLeft === 1 ? '' : 's'}` : '';
  return <>
    {children}
    {warn && <button onClick={() => setAsking(true)} className="fixed bottom-20 right-3 z-40 flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-lg lg:bottom-4"><Clock size={13} />{warn}{verdict.state === 'trial' ? ' · Activate' : ''}</button>}
  </>;
}
