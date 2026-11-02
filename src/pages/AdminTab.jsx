import { useMemo, useState } from 'react';
import { Building2, Plus, Trash2, ShieldCheck, Activity, Copy } from 'lucide-react';
import { Btn, Card, Field, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { uid } from '../utils.js';

const KEY_PREFIX = 'RESTRO-';
function makeKey(text) { return text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }

export default function AdminTab() {
  const s = useStore();
  const st = s.data.settings;
  const outlets = s.data.outlets || [];
  const [draft, setDraft] = useState({ name: '', code: '', phone: '', address: '' });
  const [license, setLicense] = useState(st.licenseKey || '');
  const [message, setMessage] = useState('');
  const [baseUrl, setBaseUrl] = useState(st.integrationBaseUrl || '');
  const health = useMemo(() => ({
    storage: (() => { try { const k='restro-health'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return 'Available'; } catch { return 'Unavailable'; } })(),
    menu: s.data.menu.length, tables: s.data.tables.length, staff: s.data.staff.length,
    backup: st.autoBackup ? 'Automatic backup enabled' : 'Automatic backup disabled',
  }), [s.data.menu.length, s.data.tables.length, s.data.staff.length, st.autoBackup]);

  const addOutlet = () => {
    const name = draft.name.trim();
    if (!name) return setMessage('Enter an outlet name.');
    const code = makeKey(draft.code || name);
    if (outlets.some(o => o.code === code)) return setMessage('Outlet code already exists.');
    s.update(d => { d.outlets = [...(d.outlets || []), { id: uid('out'), name, code, phone: draft.phone.trim(), address: draft.address.trim(), active: true, createdAt: Date.now() }]; });
    setDraft({ name: '', code: '', phone: '', address: '' }); setMessage('Outlet added to this device.');
  };
  const activate = () => {
    const value = license.trim().toUpperCase();
    if (!/^RESTRO-[A-Z0-9]{6,12}$/.test(value)) { setMessage('Invalid key format. Expected RESTRO- followed by 6–12 letters/numbers.'); return; }
    // Offline/local activation is a format check only, not cryptographic licence validation.
    s.setSettings({ licenseKey: value, licenseStatus: 'local-key-recorded', licenseActivatedAt: Date.now() });
    setMessage('Key saved on this device. Online verification is not enabled in this offline build.');
  };
  const copy = async (value) => { try { await navigator.clipboard.writeText(value); setMessage('Copied.'); } catch { setMessage('Clipboard permission unavailable.'); } };

  return <div className="space-y-4">
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2"><Building2 size={19}/><h3 className="font-semibold">Outlet directory (local)</h3></div>
      <p className="text-xs text-stone-500">Register branches under one owner account on this computer. This is an outlet directory only: operational data is not yet separated or synchronised between branches.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Outlet name"><input className={inputCls} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Palanpur Main"/></Field>
        <Field label="Outlet code"><input className={inputCls} value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})} placeholder="PALANPUR01"/></Field>
        <Field label="Phone"><input className={inputCls} value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})}/></Field>
        <Field label="Address"><input className={inputCls} value={draft.address} onChange={e=>setDraft({...draft,address:e.target.value})}/></Field>
      </div>
      <Btn onClick={addOutlet}><Plus size={16}/> Add outlet</Btn>
      <div className="space-y-2">{outlets.map(o=><div key={o.id} className="flex items-center gap-2 rounded-xl border border-stone-200 p-3"><div className="min-w-0 flex-1"><div className="font-medium">{o.name}</div><div className="text-xs text-stone-500">{o.code} · {o.phone || 'No phone'} · {o.address || 'No address'}</div></div><button className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600" title="Delete outlet" onClick={()=>s.update(d=>{d.outlets=(d.outlets||[]).filter(x=>x.id!==o.id)})}><Trash2 size={16}/></button></div>)}{!outlets.length&&<p className="text-sm text-stone-400">No additional outlets registered yet.</p>}</div>
    </Card>

    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2"><ShieldCheck size={19}/><h3 className="font-semibold">Software licence record</h3></div>
      <p className="text-xs text-stone-500">Record a licence key for customer administration. This offline check validates its format only; it does not prevent copying, tampering or verify payment. Production licensing requires a signed key or licensing server.</p>
      <Field label="Licence key"><input className={inputCls} value={license} onChange={e=>setLicense(e.target.value)} placeholder="RESTRO-ABC12345"/></Field>
      <div className="flex flex-wrap items-center gap-2"><Btn onClick={activate}>Save activation key</Btn>{st.licenseKey&&<Btn variant="ghost" onClick={()=>copy(st.licenseKey)}><Copy size={15}/> Copy saved key</Btn>}</div>
      {st.licenseKey&&<div className="rounded-lg bg-stone-50 p-3 text-sm">Saved key: <b>{st.licenseKey}</b><br/>Status: <b>Local record only</b></div>}
    </Card>

    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2"><Activity size={19}/><h3 className="font-semibold">Integration setup & system check</h3></div>
      <Field label="Your future ordering / integration base URL"><input className={inputCls} value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="https://your-restaurant-domain.in"/></Field>
      <Btn variant="ghost" onClick={()=>{s.setSettings({integrationBaseUrl:baseUrl.trim()});setMessage('Integration URL saved. No third-party API is connected.')}}>Save integration URL</Btn>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(health).map(([k,v])=><div key={k} className="rounded-xl bg-stone-50 p-3"><div className="text-[11px] uppercase text-stone-400">{k}</div><div className="mt-1 text-sm font-semibold">{v}</div></div>)}</div>
      <p className="text-xs text-stone-500">Delivery aggregators, payment gateways, WhatsApp and online ordering are not connected. Their API credentials and approved partner access are required.</p>
    </Card>
    {message&&<div role="status" className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">{message}</div>}
  </div>;
}
