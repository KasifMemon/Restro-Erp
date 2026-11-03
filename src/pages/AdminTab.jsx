import { useMemo, useRef, useState } from 'react';
import { Activity, Building2, Copy, Download, FileUp, Gauge, HardDrive, KeyRound, Plus, RefreshCw, ShieldCheck, Trash2, Wrench, Database, Settings2, CheckCircle2, AlertTriangle, Users, CreditCard, CalendarDays, Pencil, X } from 'lucide-react';
import { Btn, Card, Field, inputCls } from '../components.jsx';
import { useStore, normalize } from '../store.jsx';
import { uid } from '../utils.js';
import CloudAdmin from './CloudAdmin.jsx';

const KEY_PREFIX = 'RESTRO-';
const makeCode = (text) => text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const bytes = (n) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
const stamp = (v) => v ? new Date(v).toLocaleString() : 'Not recorded';

export default function AdminTab() {
  const s = useStore();
  const { data } = s;
  const st = data.settings;
  const fileRef = useRef(null);
  const [draft, setDraft] = useState({ name: '', code: '', phone: '', address: '' });
  const [license, setLicense] = useState(st.licenseKey || '');
  const [message, setMessage] = useState('');
  const [baseUrl, setBaseUrl] = useState(st.integrationBaseUrl || '');
  const [busy, setBusy] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const masterCustomers = st.masterCustomers || [];
  const [customerDraft, setCustomerDraft] = useState({ restaurant: '', owner: '', phone: '', email: '', plan: 'Standard', fee: '999', startDate: new Date().toISOString().slice(0,10), expiryDate: '', licenseKey: '', version: '3.2' });
  const [editingCustomer, setEditingCustomer] = useState('');
  const [paymentDraft, setPaymentDraft] = useState({});
  const [keyCustomer, setKeyCustomer] = useState('');
  const [keyPlan, setKeyPlan] = useState('Standard');
  const [keyExpiry, setKeyExpiry] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0,10); });
  const [generatedKey, setGeneratedKey] = useState('');
  const subscriptionKeys = st.masterSubscriptionKeys || [];
  const outlets = data.outlets || [];
  const counts = useMemo(() => ({
    Outlets: outlets.length, Orders: data.orders.length, Bills: data.orders.filter(x => x.status === 'paid').length,
    Menu: data.menu.length, Tables: data.tables.length, Staff: data.staff.length,
    Ingredients: data.ingredients.length, Customers: data.customers.length,
    Purchases: data.purchases.length, Expenses: data.expenses.length,
  }), [data, outlets.length]);
  const health = useMemo(() => {
    let storage = 'Available'; let size = 0;
    try { const raw = localStorage.getItem('restro-erp-v1') || ''; size = new Blob([raw]).size; JSON.parse(raw || '{}'); }
    catch { storage = 'Read / quota issue'; }
    return { storage, size, menu: data.menu.length, tables: data.tables.length, staff: data.staff.length, orders: data.orders.length, backup: st.autoBackup ? 'Enabled' : 'Disabled' };
  }, [data, st.autoBackup]);

  const addOutlet = () => {
    const name = draft.name.trim();
    if (!name) return setMessage('Enter an outlet name.');
    const code = makeCode(draft.code || name);
    if (!code) return setMessage('Enter a valid outlet code.');
    if (outlets.some(o => o.code === code)) return setMessage('Outlet code already exists.');
    s.update(d => { d.outlets = [...(d.outlets || []), { id: uid('out'), name, code, phone: draft.phone.trim(), address: draft.address.trim(), active: true, createdAt: Date.now() }]; });
    setDraft({ name: '', code: '', phone: '', address: '' }); setMessage('Outlet added on this device. Note: outlet transactions are not isolated yet.');
  };
  const toggleOutlet = (id) => s.update(d => { const o = d.outlets.find(x => x.id === id); if (o) o.active = !o.active; });
  const removeOutlet = (id) => {
    if (!window.confirm('Remove this outlet from the local directory? This does not delete sales, but outlet-specific data is not separated in this version.')) return;
    s.update(d => { d.outlets = d.outlets.filter(x => x.id !== id); });
  };
  const saveMasterCustomer = () => {
    if (!customerDraft.restaurant.trim() || !customerDraft.owner.trim()) return setMessage('Enter restaurant and owner name.');
    const record = { ...customerDraft, id: editingCustomer || uid('acct'), fee: Number(customerDraft.fee) || 0, status: customerDraft.expiryDate && customerDraft.expiryDate < new Date().toISOString().slice(0,10) ? 'Expired' : 'Active', updatedAt: Date.now() };
    const next = editingCustomer ? masterCustomers.map(x => x.id === editingCustomer ? { ...record, lastPayment: x.lastPayment || null, paymentDate: x.paymentDate || null } : x) : [...masterCustomers, { ...record, lastPayment: null, paymentDate: null, createdAt: Date.now() }];
    s.setSettings({ masterCustomers: next });
    setCustomerDraft({ restaurant: '', owner: '', phone: '', email: '', plan: 'Standard', fee: '999', startDate: new Date().toISOString().slice(0,10), expiryDate: '', licenseKey: '', version: '3.2' });
    setEditingCustomer(''); setMessage(editingCustomer ? 'Customer account updated locally.' : 'Customer account added locally.');
  };
  const editMasterCustomer = (x) => { setCustomerDraft({ restaurant: x.restaurant || '', owner: x.owner || '', phone: x.phone || '', email: x.email || '', plan: x.plan || 'Standard', fee: String(x.fee ?? 999), startDate: x.startDate || '', expiryDate: x.expiryDate || '', licenseKey: x.licenseKey || '', version: x.version || '3.2' }); setEditingCustomer(x.id); };
  const deleteMasterCustomer = (id) => { if (window.confirm('Delete this customer account record from this browser?')) s.setSettings({ masterCustomers: masterCustomers.filter(x => x.id !== id) }); };
  const recordPayment = (x) => { const amount = Number(paymentDraft[x.id] ?? x.fee); if (!(amount > 0)) return setMessage('Enter a valid payment amount.'); s.setSettings({ masterCustomers: masterCustomers.map(c => c.id === x.id ? { ...c, lastPayment: amount, paymentDate: new Date().toISOString(), status: c.expiryDate && c.expiryDate < new Date().toISOString().slice(0,10) ? 'Expired' : 'Active' } : c) }); setMessage(`Payment of ₹${amount.toLocaleString('en-IN')} recorded locally for ${x.restaurant}.`); };
  const activate = () => {
    const value = license.trim().toUpperCase();
    if (!/^RESTRO-[A-Z0-9]{6,12}$/.test(value)) return setMessage('Invalid key format. Expected RESTRO- followed by 6–12 letters/numbers.');
    s.setSettings({ licenseKey: value, licenseStatus: 'local-key-recorded', licenseActivatedAt: Date.now() });
    setMessage('Licence key recorded locally. This is not cryptographic verification or payment validation.');
  };
  const copy = async (value) => { try { await navigator.clipboard.writeText(value); setMessage('Copied to clipboard.'); } catch { setMessage('Clipboard permission unavailable.'); } };
  const exportData = () => {
    const payload = { ...data, _restroExport: { app: 'RestroERP', version: '3.3', exportedAt: new Date().toISOString(), format: 1 } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `restroerp-developer-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
    setMessage('Full data export downloaded. Keep this file private and secure.');
  };
  const importData = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const required = ['menu','tables','orders','staff','settings'];
      if (!parsed || typeof parsed !== 'object' || required.some(k => !Array.isArray(parsed[k]) && k !== 'settings') || !parsed.settings || typeof parsed.settings !== 'object') throw new Error('This file does not look like a RestroERP backup.');
      const clean = { ...parsed }; delete clean._restroExport;
      if (!window.confirm('Importing replaces ALL current data on this device. Export a backup first. Continue?')) return;
      s.replaceAll(normalize(clean)); setMessage('Backup imported. Review settings and test billing before using this data.');
    } catch (e) { setMessage(`Import failed: ${e.message || 'Invalid backup file.'}`); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  };
  const resetSetup = () => {
    if (!window.confirm('This will return the app to first-time setup on this device. Your current data is not erased. Continue?')) return;
    s.setSettings({ setupDone: false }); setMessage('Setup wizard will appear after reload.');
    window.setTimeout(() => window.location.reload(), 500);
  };

  return <div className="space-y-4">
    <div className="rounded-2xl bg-stone-900 p-4 text-white sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-300"><Wrench size={14}/> Developer console</div><h2 className="mt-1 text-xl font-bold">System control centre</h2><p className="mt-1 max-w-2xl text-sm text-stone-300">Owner-level tools to inspect, configure and maintain this RestroERP installation.</p></div><div className="rounded-xl bg-white/10 p-3"><Gauge size={24}/></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{Object.entries(counts).map(([k,v])=><div key={k} className="rounded-xl bg-white/10 p-3"><div className="text-[11px] text-stone-300">{k}</div><div className="mt-1 text-xl font-bold tabular-nums">{v}</div></div>)}</div>
    </div>

    <CloudAdmin />

    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2"><Building2 size={19}/><h3 className="font-semibold">Outlet management</h3></div>
        <p className="text-xs text-stone-500">Create and enable/disable outlet records. This directory is local only; orders, stock and staff are not yet partitioned by outlet.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Outlet name"><input className={inputCls} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Palanpur Main"/></Field>
          <Field label="Outlet code"><input className={inputCls} value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})} placeholder="PALANPUR01"/></Field>
          <Field label="Phone"><input className={inputCls} value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})}/></Field>
          <Field label="Address"><input className={inputCls} value={draft.address} onChange={e=>setDraft({...draft,address:e.target.value})}/></Field>
        </div>
        <Btn onClick={addOutlet}><Plus size={16}/> Add outlet</Btn>
        <div className="space-y-2">{outlets.map(o=><div key={o.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 p-3"><div className="min-w-0 flex-1"><div className="font-medium">{o.name}</div><div className="text-xs text-stone-500">{o.code} · {o.phone || 'No phone'} · {o.address || 'No address'}</div></div><button onClick={()=>toggleOutlet(o.id)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${o.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{o.active ? 'Active' : 'Disabled'}</button><button onClick={()=>removeOutlet(o.id)} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600" title="Remove outlet"><Trash2 size={16}/></button></div>)}{!outlets.length&&<p className="text-sm text-stone-400">No outlets registered.</p>}</div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2"><Database size={19}/><h3 className="font-semibold">Data control & migration</h3></div>
        <p className="text-xs text-stone-500">Export the complete local database or restore a previous JSON backup. Import replaces all current data on this device.</p>
        <div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-stone-50 p-3"><div className="text-xs text-stone-500">Current local data size</div><div className="mt-1 text-lg font-bold">{bytes(health.size)}</div></div><div className="rounded-xl bg-stone-50 p-3"><div className="text-xs text-stone-500">Storage status</div><div className="mt-1 flex items-center gap-1 text-sm font-semibold"><CheckCircle2 size={15} className="text-emerald-600"/>{health.storage}</div></div></div>
        <div className="flex flex-wrap gap-2"><Btn onClick={exportData}><Download size={16}/> Export all data</Btn><Btn variant="ghost" onClick={()=>fileRef.current?.click()}><FileUp size={16}/> Import backup</Btn><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e=>importData(e.target.files?.[0])}/></div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={14} className="mr-1 inline"/>Keep exported backups in a secure location. They may contain customer phone numbers, sales and business information.</div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2"><KeyRound size={19}/><h3 className="font-semibold">Licence & product configuration</h3></div>
        <p className="text-xs text-stone-500">Record customer licence details for your own administration. Local format checks do not secure the app against copying or tampering.</p>
        <Field label="Licence key"><input className={inputCls} value={license} onChange={e=>setLicense(e.target.value)} placeholder="RESTRO-ABC12345"/></Field>
        <div className="flex flex-wrap gap-2"><Btn onClick={activate}>Save licence record</Btn>{st.licenseKey&&<Btn variant="ghost" onClick={()=>copy(st.licenseKey)}><Copy size={15}/> Copy key</Btn>}</div>
        <div className="rounded-xl bg-stone-50 p-3 text-sm">Status: <b>{st.licenseStatus || 'Not activated'}</b><br/>Activation record: <b>{stamp(st.licenseActivatedAt)}</b></div>
        <Field label="Integration / ordering base URL"><input className={inputCls} value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="https://your-domain.in"/></Field>
        <Btn variant="ghost" onClick={()=>{s.setSettings({integrationBaseUrl:baseUrl.trim()});setMessage('Integration URL saved. No external API is connected yet.')}}>Save integration URL</Btn>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2"><Settings2 size={19}/><h3 className="font-semibold">Global application settings</h3></div>
        <Field label="Default language"><select className={inputCls} value={st.language || 'en'} onChange={e=>s.setSettings({language:e.target.value})}><option value="en">English</option><option value="gu">Gujarati</option><option value="hi">Hindi</option></select></Field>
        <Field label="Application / restaurant display name"><input className={inputCls} value={st.name || ''} onChange={e=>s.setSettings({name:e.target.value})}/></Field>
        <label className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange-600" checked={!!st.autoBackup} onChange={e=>s.setSettings({autoBackup:e.target.checked})}/><span><b>Automatic local backups</b><span className="mt-0.5 block text-xs text-stone-500">Create local rotating snapshots when data changes.</span></span></label>
        <button className="text-left text-xs font-semibold text-stone-500 underline" onClick={()=>setShowAdvanced(v=>!v)}>{showAdvanced ? 'Hide' : 'Show'} advanced maintenance</button>
        {showAdvanced&&<div className="space-y-2 rounded-xl border border-stone-200 p-3"><div className="text-sm font-semibold">Setup maintenance</div><p className="text-xs text-stone-500">Reopens first-time setup without deleting the current local data. Export a backup before changing setup.</p><Btn variant="ghost" onClick={resetSetup}><RefreshCw size={15}/> Reopen setup wizard</Btn></div>}
      </Card>
    </div>

    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2"><Activity size={19}/><h3 className="font-semibold">Diagnostics & environment</h3></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(health).filter(([k])=>k!=='size').map(([k,v])=><div key={k} className="rounded-xl bg-stone-50 p-3"><div className="text-[11px] uppercase text-stone-400">{k}</div><div className="mt-1 text-sm font-semibold">{v}</div></div>)}</div>
      <div className="grid gap-2 text-xs text-stone-500 sm:grid-cols-2"><div><HardDrive size={14} className="mr-1 inline"/>Persistence: browser localStorage + local IndexedDB backups</div><div><ShieldCheck size={14} className="mr-1 inline"/>Authentication: existing staff PIN / role permissions</div><div><Gauge size={14} className="mr-1 inline"/>Runtime: {typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}</div><div><Activity size={14} className="mr-1 inline"/>Last local licence activation: {stamp(st.licenseActivatedAt)}</div></div>
      <p className="text-xs text-stone-500">Customers, licences and payments above live in Supabase behind developer-only row-level security. The tools below act on this browser's local restaurant data only.</p>
    </Card>
    {message&&<div role="status" className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">{message}</div>}
  </div>;
}
