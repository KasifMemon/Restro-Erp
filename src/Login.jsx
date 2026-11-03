import { useState } from 'react';
import { Eye, EyeOff, LogIn, ShieldAlert, UtensilsCrossed } from 'lucide-react';
import { Btn, inputCls } from './components.jsx';
import { customerSignIn } from './cloud.js';

const friendly = (m) => (/invalid login|invalid_grant|credentials/i.test(m) ? 'Wrong email or password.' : /fetch|network/i.test(m) ? 'No internet connection. Connect once to sign in.' : m);

export default function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await customerSignIn(email, password); onDone(); }
    catch (x) { setErr(friendly(x.message || 'Sign-in failed')); }
    finally { setBusy(false); }
  };
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
        <p className="text-center text-[11px] text-slate-400">Forgot your password? Ask your provider to reset it. There is no public sign-up.</p>
      </form>
    </div>
  );
}
