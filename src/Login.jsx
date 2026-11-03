import { useState } from 'react';
import { Eye, EyeOff, LogIn, ShieldAlert, UtensilsCrossed } from 'lucide-react';
import { Btn, inputCls } from './components.jsx';
import { customerSignIn, requestPasswordReset } from './cloud.js';

const friendly = (m) => (/invalid login|invalid_grant|credentials/i.test(m) ? 'Wrong email or password.' : /fetch|network/i.test(m) ? 'No internet connection. Connect once to sign in.' : m);

export default function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState('login');
  const [sent, setSent] = useState(false);
  const forgot = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await requestPasswordReset(email); setSent(true); } catch (x) { setErr(x.message || 'Failed'); } finally { setBusy(false); }
  };
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await customerSignIn(email, password); onDone(); }
    catch (x) { setErr(friendly(x.message || 'Sign-in failed')); }
    finally { setBusy(false); }
  };
  if (mode === 'forgot') return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
      <form onSubmit={forgot} className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div><h1 className="text-xl font-bold text-slate-800">Reset your password</h1><p className="mt-1 text-sm text-slate-500">Enter your account email. We will send you a link to set a new password.</p></div>
        {sent ? <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">If this email has an account, a reset link is on its way. Check your inbox and spam folder. The link works once. If nothing arrives in a few minutes, ask your provider to reset your password.</div> : <>
          <input className={inputCls} type="email" autoComplete="username" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          {err && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><ShieldAlert size={16} className="mt-0.5 shrink-0" />{err}</div>}
          <Btn className="w-full" size="lg" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Btn></>}
        <button type="button" onClick={() => { setMode('login'); setSent(false); setErr(''); }} className="w-full text-center text-sm font-semibold text-teal-700">Back to sign in</button>
      </form>
    </div>
  );
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
      <form onSubmit={go} className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white"><UtensilsCrossed size={24} /></div>
        <div><h1 className="text-xl font-bold text-slate-800">Sign in to RestroERP</h1><p className="mt-1 text-sm text-slate-500">Use the email and password your provider gave you.</p></div>
        <input className={inputCls} type="email" autoComplete="username" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <div className="relative">
          <input className={`${inputCls} pr-11`} type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-2.5 text-slate-400" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
        {err && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><ShieldAlert size={16} className="mt-0.5 shrink-0" />{err}</div>}
        <Btn className="w-full" size="lg" disabled={busy}><LogIn size={17} />{busy ? 'Signing in…' : 'Sign in'}</Btn>
        <button type="button" onClick={() => { setMode('forgot'); setErr(''); }} className="w-full text-center text-sm font-semibold text-teal-700">Forgot password?</button>
        <p className="text-center text-[11px] text-slate-400">There is no public sign-up. Your provider creates your account.</p>
      </form>
    </div>
  );
}
