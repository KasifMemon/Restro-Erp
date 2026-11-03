import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, RefreshCw, Users, CreditCard, ScrollText, MessageCircle } from 'lucide-react';
import { Btn, Card, Field, inputCls } from '../components.jsx';
import { devRest, devRpc } from '../cloud.js';

const plusYear = (from, y = 1) => { const d = new Date(from || Date.now()); d.setFullYear(d.getFullYear() + y); return d.toISOString().slice(0, 10); };
const plusMonth = (from) => { const d = new Date(from || Date.now()); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function CloudAdmin() {
  const [customers, setCustomers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [cd, setCd] = useState({ restaurant: '', owner: '', phone: '', email: '', city: '' });
  const [ld, setLd] = useState({ customer: '', plan: 'Standard', expires: plusYear(), devices: 2, fee: 999 });
  const [pd, setPd] = useState({ license: '', amount: '', method: 'UPI', note: '' });

  const load = useCallback(async () => {
    try {
      const [c, l, p, a] = await Promise.all([
        devRest('customers?select=*&order=created_at.desc'),
        devRest('licenses?select=*,customers(restaurant,owner,phone),license_devices(device_id,label,last_seen)&order=created_at.desc'),
        devRest('payments?select=*,customers(restaurant)&order=paid_on.desc,created_at.desc&limit=50'),
        devRest('audit_log?select=*&order=id.desc&limit=15'),
      ]);
      setCustomers(c); setLicenses(l); setPayments(p); setAudit(a);
    } catch (e) { setMsg(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(ok); await load(); } catch (e) { setMsg(e.message || 'Failed'); } finally { setBusy(false); }
  };
  const addCustomer = () => {
    if (!cd.restaurant.trim() || !cd.owner.trim()) return setMsg('Enter restaurant and owner name.');
    run(async () => { await devRest('customers', { method: 'POST', body: Object.fromEntries(Object.entries(cd).map(([k, v]) => [k, v.trim() || null])) }); setCd({ restaurant: '', owner: '', phone: '', email: '', city: '' }); }, 'Customer saved.');
  };
  const createLicense = () => {
    if (!ld.customer) return setMsg('Select a customer.');
    run(() => devRpc('create_license', { p_customer: ld.customer, p_plan: ld.plan, p_expires: ld.expires, p_max_devices: Number(ld.devices) || 1, p_fee: Number(ld.fee) || 0 }), 'Licence created.');
  };
  const patchLicense = (id, body, ok) => run(() => devRest(`licenses?id=eq.${id}`, { method: 'PATCH', body }), ok);
  const addPayment = () => {
    const lic = licenses.find((x) => x.id === pd.license);
    if (!lic || !(Number(pd.amount) > 0)) return setMsg('Choose a licence and enter an amount.');
    run(async () => { await devRest('payments', { method: 'POST', body: { customer_id: lic.customer_id, license_id: lic.id, amount: Number(pd.amount), method: pd.method, note: pd.note || null } }); setPd({ license: '', amount: '', method: 'UPI', note: '' }); }, 'Payment recorded.');
  };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); setMsg('Copied.'); } catch { setMsg('Clipboard unavailable.'); } };
  const share = (l) => {
    const text = `Hello ${l.customers?.owner || ''}, your RestroERP licence key is ${l.license_key} (${l.plan}, valid until ${l.expires_on}).`;
    const ph = (l.customers?.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${ph.length === 10 ? '91' + ph : ph}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  return <div className="space-y-4">
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><Users size={19} />Customers <span className="text-xs font-normal text-stone-400">stored in Supabase</span></div><Btn size="sm" variant="ghost" onClick={load}><RefreshCw size={13} />Refresh</Btn></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {[['restaurant', 'Restaurant'], ['owner', 'Owner'], ['phone', 'Phone'], ['email', 'Email'], ['city', 'City']].map(([k, n]) => <Field key={k} label={n}><input className={inputCls} value={cd[k]} onChange={(e) => setCd({ ...cd, [k]: e.target.value })} /></Field>)}
      </div>
      <Btn onClick={addCustomer} disabled={busy}>Add customer</Btn>
      <div className="divide-y divide-stone-100 text-sm">{customers.map((c) => <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><div><b>{c.restaurant}</b> <span className="text-stone-500">· {c.owner}</span></div><span className="text-xs text-stone-400">{c.phone || ''} {c.city || ''}</span></div>)}{!customers.length && <p className="py-2 text-xs text-stone-400">No customers yet.</p>}</div>
    </Card>

    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2 font-semibold"><KeyRound size={19} />Licences <span className="text-xs font-normal text-stone-400">keys are generated on the server</span></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Customer"><select className={inputCls} value={ld.customer} onChange={(e) => setLd({ ...ld, customer: e.target.value })}><option value="">Select</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.restaurant}</option>)}</select></Field>
        <Field label="Plan"><select className={inputCls} value={ld.plan} onChange={(e) => setLd({ ...ld, plan: e.target.value })}>{['Basic', 'Standard', 'Professional', 'Enterprise'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Expires"><input type="date" className={inputCls} value={ld.expires} onChange={(e) => setLd({ ...ld, expires: e.target.value })} /></Field>
        <Field label="Max devices"><input type="number" min="1" className={inputCls} value={ld.devices} onChange={(e) => setLd({ ...ld, devices: e.target.value })} /></Field>
        <Field label="Fee (₹)"><input type="number" min="0" className={inputCls} value={ld.fee} onChange={(e) => setLd({ ...ld, fee: e.target.value })} /></Field>
      </div>
      <Btn onClick={createLicense} disabled={busy}>Generate licence key</Btn>
      <div className="space-y-2">{licenses.map((l) => {
        const expired = l.expires_on < today();
        return <div key={l.id} className="rounded-xl border border-stone-200 p-3">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{l.license_key}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.status === 'active' && !expired ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{expired && l.status === 'active' ? 'expired' : l.status}</span>
            <button onClick={() => copy(l.license_key)} aria-label="Copy key"><Copy size={14} /></button><button onClick={() => share(l)} aria-label="Send on WhatsApp"><MessageCircle size={14} /></button></div>
          <div className="mt-1 text-xs text-stone-500">{l.customers?.restaurant} · {l.plan} · until {l.expires_on} · devices {l.license_devices?.length || 0}/{l.max_devices}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Btn size="sm" variant="ghost" onClick={() => patchLicense(l.id, { expires_on: plusYear(expired ? today() : l.expires_on) }, 'Renewed for 1 year.')}>Renew +1 year</Btn>
            <Btn size="sm" variant="ghost" onClick={() => patchLicense(l.id, { expires_on: plusMonth(expired ? today() : l.expires_on) }, 'Extended by 1 month.')}>+1 month</Btn>
            {l.status === 'active' ? <Btn size="sm" variant="ghost" onClick={() => patchLicense(l.id, { status: 'suspended' }, 'Suspended.')}>Suspend</Btn> : <Btn size="sm" variant="ghost" onClick={() => patchLicense(l.id, { status: 'active' }, 'Activated.')}>Activate</Btn>}
            <Btn size="sm" variant="ghost" onClick={() => run(() => devRest(`license_devices?license_id=eq.${l.id}`, { method: 'DELETE' }), 'Devices reset.')}>Reset devices</Btn>
            <Btn size="sm" variant="danger" onClick={() => window.confirm('Revoke this licence permanently?') && patchLicense(l.id, { status: 'revoked' }, 'Revoked.')}>Revoke</Btn>
          </div>
        </div>;
      })}{!licenses.length && <p className="text-xs text-stone-400">No licences yet.</p>}</div>
    </Card>

    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><CreditCard size={19} />Payments</div><span className="text-sm font-semibold">Total {money(total)}</span></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Licence"><select className={inputCls} value={pd.license} onChange={(e) => setPd({ ...pd, license: e.target.value })}><option value="">Select</option>{licenses.map((l) => <option key={l.id} value={l.id}>{l.customers?.restaurant} · {l.license_key}</option>)}</select></Field>
        <Field label="Amount (₹)"><input type="number" min="0" className={inputCls} value={pd.amount} onChange={(e) => setPd({ ...pd, amount: e.target.value })} /></Field>
        <Field label="Method"><select className={inputCls} value={pd.method} onChange={(e) => setPd({ ...pd, method: e.target.value })}>{['UPI', 'Cash', 'Bank', 'Card'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Note"><input className={inputCls} value={pd.note} onChange={(e) => setPd({ ...pd, note: e.target.value })} /></Field>
      </div>
      <Btn onClick={addPayment} disabled={busy}>Record payment</Btn>
      <div className="divide-y divide-stone-100 text-sm">{payments.map((p) => <div key={p.id} className="flex justify-between py-1.5"><span>{p.customers?.restaurant} <span className="text-xs text-stone-400">{p.paid_on} · {p.method}</span></span><b>{money(p.amount)}</b></div>)}</div>
    </Card>

    <Card className="space-y-2 p-4">
      <div className="flex items-center gap-2 font-semibold"><ScrollText size={19} />Audit log</div>
      <div className="space-y-1 text-xs text-stone-500">{audit.map((a) => <div key={a.id}><span className="font-mono">{new Date(a.created_at).toLocaleString()}</span> · {a.action}</div>)}{!audit.length && 'No activity yet.'}</div>
    </Card>
    {msg && <div role="status" className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">{msg}</div>}
  </div>;
}
