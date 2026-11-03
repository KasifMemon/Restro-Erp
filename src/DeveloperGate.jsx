import { useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck, LogOut, AlertCircle } from 'lucide-react';
import AdminTab from './pages/AdminTab.jsx';
import { Btn, inputCls } from './components.jsx';
import { cloudConfigured, devHasSession, devRpc, devSignIn, devSignOut } from './cloud.js';

export default function DeveloperGate() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(devHasSession());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const verify = async () => {
    const ok = await devRpc('is_developer_admin');
    if (ok !== true) { devSignOut(); throw new Error('This account is not authorized as a RestroERP developer.'); }
  };
  useEffect(() => {
    if (!devHasSession()) return;
    verify().then(() => setAuthed(true)).catch((e) => setError(e.message)).finally(() => setChecking(false));
  }, []);

  if (!cloudConfigured) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircle size={16} className="mr-1 inline" />Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see SUPABASE-SETUP.md).</div>;
  if (checking) return <div className="p-6 text-center text-sm text-stone-500">Checking developer access…</div>;
  if (authed) return <div className="space-y-3">
    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span className="flex items-center gap-1.5"><ShieldCheck size={14} />Signed in as developer</span><button onClick={() => { devSignOut(); setAuthed(false); }} className="flex items-center gap-1 font-semibold"><LogOut size={13} />Sign out</button></div>
    <AdminTab />
  </div>;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await devSignIn(email.trim(), password); await verify(); setAuthed(true); setPassword(''); }
    catch (err) { devSignOut(); setError(err.message || 'Sign-in failed'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
    <div className="flex items-center gap-2 font-semibold"><LockKeyhole size={18} />Developer sign-in</div>
    <input className={inputCls} type="email" autoComplete="username" placeholder="Developer email" value={email} onChange={(e) => setEmail(e.target.value)} required />
    <input className={inputCls} type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
    {error && <div role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">{error}</div>}
    <Btn className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Btn>
  </form>;
}
