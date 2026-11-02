import { useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck, LogOut, AlertCircle } from 'lucide-react';
import AdminTab from './pages/AdminTab.jsx';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'restro-developer-session-v1';

async function verifyDeveloper(session) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_developer_admin`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) throw new Error('Could not verify developer access. Check the database setup.');
  const allowed = await response.json();
  if (allowed !== true) throw new Error('This account is not authorized as a RestroERP developer.');
  return true;
}

export default function DeveloperGate() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(Boolean(session));

  useEffect(() => {
    let live = true;
    if (!session) { setChecking(false); return () => { live = false; }; }
    setChecking(true);
    verifyDeveloper(session).then(() => {
      if (!live) return;
      setChecking(false);
      const remaining = Math.max(0, (session.expires_at || 0) - Date.now());
      window.setTimeout(() => {
        if (!live) return;
        sessionStorage.removeItem(SESSION_KEY); setSession(null); setError('Your developer session expired. Please sign in again.');
      }, remaining);
    }).catch((e) => {
      if (!live) return;
      sessionStorage.removeItem(SESSION_KEY); setSession(null); setError(e.message); setChecking(false);
    });
    return () => { live = false; };
  }, [session]);

  const login = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Backend is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.msg || result.message || 'Invalid developer ID or password.');
      const next = { access_token: result.access_token, refresh_token: result.refresh_token, expires_at: Date.now() + (result.expires_in || 3600) * 1000 };
      await verifyDeveloper(next);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next)); setSession(next); setPassword('');
    } catch (e2) { setError(e2.message || 'Login failed.'); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    if (session?.access_token && SUPABASE_URL) {
      fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` } }).catch(() => {});
    }
    sessionStorage.removeItem(SESSION_KEY); setSession(null); setPassword(''); setError('');
  };

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><div className="mb-2 flex items-center gap-2 font-bold"><AlertCircle size={19}/> Developer backend setup required</div><p>Secure developer login is enabled in this edition, but the Supabase project details have not been configured yet. Follow <b>SUPABASE-SETUP.md</b>, then add the two VITE environment variables in your deployment settings.</p></div>;

  if (checking) return <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">Verifying developer access…</div>;

  if (!session) return <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
    <div className="bg-stone-950 p-6 text-white"><div className="mb-3 inline-flex rounded-xl bg-white/10 p-3"><ShieldCheck size={25}/></div><div className="text-xs font-semibold uppercase tracking-[.18em] text-orange-300">Private access</div><h2 className="mt-1 text-2xl font-bold">RestroERP Developer Portal</h2><p className="mt-1 text-sm text-stone-300">Sign in with your authorized developer account.</p></div>
    <form onSubmit={login} className="space-y-4 p-6"><label className="block text-sm font-medium">Developer ID / Email<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-3 outline-none focus:border-orange-500" placeholder="developer@yourdomain.com"/></label><label className="block text-sm font-medium">Password<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-3 outline-none focus:border-orange-500" placeholder="Your secure password"/></label>{error&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white disabled:opacity-60"><LockKeyhole size={17}/>{busy?'Verifying…':'Secure developer login'}</button><p className="text-xs text-stone-500">Only accounts explicitly authorized in the server database can enter this portal.</p></form>
  </div>;

  return <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck size={18}/> Server-verified developer session</div><button onClick={logout} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900"><LogOut size={14}/> Sign out</button></div><AdminTab/></div>;
}
