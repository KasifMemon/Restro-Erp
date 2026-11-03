import { useState } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { Btn, inputCls } from './components.jsx';
import { setNewPassword } from './cloud.js';

export default function ResetPassword({ link, onDone }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(link.error || '');
  const [ok, setOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    setBusy(true);
    try { await setNewPassword(link.token, pw); setOk(true); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><KeyRound size={24} /></div>
        <h1 className="text-xl font-bold text-slate-800">Set a new password</h1>
        {ok ? <><div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Password changed. You can sign in now.</div><Btn className="w-full" size="lg" type="button" onClick={onDone}>Go to sign in</Btn></> : <>
          {link.token && <>
            <input className={inputCls} type="password" autoComplete="new-password" placeholder="New password (min 8 characters)" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
            <input className={inputCls} type="password" autoComplete="new-password" placeholder="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></>}
          {err && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><ShieldAlert size={16} className="mt-0.5 shrink-0" />{err}</div>}
          {link.token ? <Btn className="w-full" size="lg" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</Btn> : <Btn className="w-full" size="lg" type="button" onClick={onDone}>Back to sign in</Btn>}</>}
      </form>
    </div>
  );
}
