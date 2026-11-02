import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { Btn, Card, Chip, Field, PageHeader, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { fileToLogo, uid } from '../utils.js';
import { receiptDoc, renderHTML, sampleOrder } from '../print.js';
import PrinterTab from './PrinterTab.jsx';
import BackupTab from './BackupTab.jsx';
import AdminTab from './AdminTab.jsx';

const Toggle = ({ label, checked, onChange, hint }) => (
  <label className="flex cursor-pointer items-start gap-3 py-1.5 text-sm">
    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange-600" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span><span className="font-medium">{label}</span>{hint && <span className="block text-xs text-stone-500">{hint}</span>}</span>
  </label>
);

export default function SettingsPage() {
  const [tab, setTab] = useState('business');
  return (
    <>
      <PageHeader title="Settings" sub="Business profile, bill, printers, tables and backups" />
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {[['business', 'Business'], ['receipt', 'Bill & receipt'], ['printers', 'Printers'], ['tables', 'Tables'], ['backup', 'Backup & data'], ['admin', 'Business admin']].map(([k, n]) => (
          <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{n}</Chip>
        ))}
      </div>
      {tab === 'business' && <BusinessTab />}
      {tab === 'receipt' && <ReceiptTab />}
      {tab === 'printers' && <PrinterTab />}
      {tab === 'tables' && <TablesTab />}
      {tab === 'backup' && <BackupTab />}
      {tab === 'admin' && <AdminTab />}
    </>
  );
}

function BusinessTab() {
  const s = useStore();
  const st = s.data.settings;
  const set = (p) => s.setSettings(p);
  const fileRef = useRef();
  const pickLogo = async (e) => {
    const f = e.target.files[0];
    if (f) set({ logo: await fileToLogo(f) });
    e.target.value = '';
  };
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Restaurant profile</h3>
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
            {st.logo ? <img src={st.logo} alt="logo" className="max-h-full max-w-full object-contain" /> : <ImagePlus className="text-stone-300" />}
          </div>
          <div className="space-y-1.5">
            <div className="text-xs text-stone-500">Logo — shown on bills (also thermal), menu card and login screen. Black-on-white works best.</div>
            <div className="flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => fileRef.current.click()}>Upload logo</Btn>
              {st.logo && <Btn size="sm" variant="ghost" onClick={() => set({ logo: '' })}>Remove</Btn>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
          </div>
        </div>
        <Field label="App language"><select className={inputCls} value={st.language || 'en'} onChange={(e) => set({ language: e.target.value })}><option value="en">English</option><option value="gu">ગુજરાતી (Gujarati)</option><option value="hi">हिन्दी (Hindi)</option></select></Field>
        <Field label="Restaurant name"><input className={inputCls} value={st.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Address"><input className={inputCls} value={st.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input className={inputCls} value={st.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="GSTIN"><input className={inputCls} value={st.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} /></Field>
          <Field label="FSSAI licence no."><input className={inputCls} value={st.fssai} onChange={(e) => set({ fssai: e.target.value })} /></Field>
          <Field label="UPI ID (payment QR on bill)"><input className={inputCls} placeholder="name@bank" value={st.upiId} onChange={(e) => set({ upiId: e.target.value.trim() })} /></Field>
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <h3 className="font-semibold">Tax & loyalty</h3>
        <Field label="Service charge % (dine-in)"><input type="number" min="0" className={inputCls} value={st.serviceCharge} onChange={(e) => set({ serviceCharge: +e.target.value })} /></Field>
        <Toggle label="Menu prices already include GST" checked={st.taxInclusive} onChange={(v) => set({ taxInclusive: v })} hint="GST rate is set per dish in Menu (5% default). Bills split it into CGST + SGST." />
        <div className="my-2 border-t border-stone-100" />
        <Toggle label="Loyalty points" checked={st.loyaltyOn} onChange={(v) => set({ loyaltyOn: v })} hint="Customers earn points on every bill and can redeem them as a discount at billing." />
        {st.loyaltyOn && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Earn 1 point per ₹"><input type="number" min="1" className={inputCls} value={st.earnPer} onChange={(e) => set({ earnPer: Math.max(1, +e.target.value || 100) })} /></Field>
            <Field label="1 point is worth ₹"><input type="number" min="0.1" step="0.1" className={inputCls} value={st.redeemValue} onChange={(e) => set({ redeemValue: Math.max(0.1, +e.target.value || 1) })} /></Field>
          </div>
        )}
      </Card>
    </div>
  );
}

function ReceiptTab() {
  const s = useStore();
  const { data } = s;
  const st = data.settings;
  const R = st.receipt;
  const setR = (p) => s.setSettings({ receipt: { ...R, ...p } });
  const [html, setHtml] = useState('');
  const key = JSON.stringify([R, st.name, st.address, st.phone, st.gstin, st.fssai, st.upiId, st.footer, st.logo.length, st.printers.bill.paper, st.taxInclusive]);
  useEffect(() => {
    let off = false;
    const { order, totals } = sampleOrder(data);
    const t = setTimeout(async () => {
      const prov = receiptDoc(order, st, data.tables[0]?.name, totals, { cur: '₹' });
      const h = await renderHTML(prov, st.printers.bill.mode === 'thermal' ? st.printers.bill.paper : st.printers.bill.paper === 58 ? 58 : 80);
      if (!off) setHtml(h);
    }, 250);
    return () => { off = true; clearTimeout(t); };
    // eslint-disable-next-line
  }, [key]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="space-y-2 p-4">
        <h3 className="font-semibold">What prints on the bill</h3>
        <Toggle label="Logo" checked={R.showLogo} onChange={(v) => setR({ showLogo: v })} />
        <Toggle label="GSTIN" checked={R.showGstin} onChange={(v) => setR({ showGstin: v })} hint="Bill title becomes TAX INVOICE when a GSTIN is set." />
        <Toggle label="FSSAI number" checked={R.showFssai} onChange={(v) => setR({ showFssai: v })} />
        <Toggle label="CGST / SGST lines" checked={R.showTax} onChange={(v) => setR({ showTax: v })} />
        <Toggle label="Customer name & phone" checked={R.showCustomer} onChange={(v) => setR({ showCustomer: v })} />
        <div className="my-2 border-t border-stone-100" />
        <Field label="Payment QR (UPI, exact amount)">
          <select className={inputCls} value={R.qrMode} onChange={(e) => setR({ qrMode: e.target.value })}>
            <option value="unpaid">On provisional bill & credit balance (recommended)</option>
            <option value="always">On every bill</option>
            <option value="never">Never</option>
          </select>
        </Field>
        {!st.upiId && <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">Add your UPI ID in Business → UPI ID, otherwise no QR can be printed.</div>}
        <Field label="Review link (Google Maps / Zomato) → prints a 'Rate us' QR"><input className={inputCls} placeholder="https://g.page/r/…" value={R.reviewUrl} onChange={(e) => setR({ reviewUrl: e.target.value.trim() })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Header note"><input className={inputCls} placeholder="e.g. Pure Veg" value={R.headerNote} onChange={(e) => setR({ headerNote: e.target.value })} /></Field>
          <Field label="SAC code"><input className={inputCls} placeholder="996331" value={R.sac} onChange={(e) => setR({ sac: e.target.value })} /></Field>
        </div>
        <Field label="Footer message"><input className={inputCls} value={st.footer} onChange={(e) => s.setSettings({ footer: e.target.value })} /></Field>
        <Field label="Powered-by line (optional)"><input className={inputCls} placeholder="e.g. Billing by YourBrand · 98xxxxxx" value={R.poweredBy} onChange={(e) => setR({ poweredBy: e.target.value })} /></Field>
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-semibold">Live preview</h3>
        <iframe title="Receipt preview" srcDoc={html} className="h-[560px] w-full rounded-xl border border-stone-200 bg-white" />
        <p className="mt-2 text-xs text-stone-400">Sample items. Thermal output uses the same layout.</p>
      </Card>
    </div>
  );
}

function TablesTab() {
  const s = useStore();
  const { data } = s;
  const [tb, setTb] = useState({ name: '', seats: 4, section: data.tables[0]?.section || 'Main' });
  const add = () => {
    if (!tb.name.trim()) return;
    s.save('tables', { id: uid('t'), name: tb.name.trim(), seats: +tb.seats || 4, section: tb.section.trim() || 'Main' });
    setTb({ ...tb, name: '' });
  };
  return (
    <Card className="max-w-2xl p-4">
      <h3 className="mb-3 font-semibold">Tables</h3>
      <div className="mb-3 grid grid-cols-[1fr_70px_1fr_auto] items-end gap-2">
        <Field label="Name"><input className={inputCls} value={tb.name} onChange={(e) => setTb({ ...tb, name: e.target.value })} placeholder="T7" /></Field>
        <Field label="Seats"><input type="number" className={inputCls} value={tb.seats} onChange={(e) => setTb({ ...tb, seats: e.target.value })} /></Field>
        <Field label="Section"><input className={inputCls} value={tb.section} onChange={(e) => setTb({ ...tb, section: e.target.value })} /></Field>
        <Btn onClick={add}><Plus size={16} /></Btn>
      </div>
      <div className="max-h-[28rem] overflow-y-auto">
        {data.tables.map((t) => {
          const busy = data.orders.some((o) => o.status === 'open' && o.tableId === t.id);
          return (
            <div key={t.id} className="flex items-center gap-2 border-b border-stone-100 py-1.5 text-sm">
              <input className={inputCls + ' max-w-[90px]'} value={t.name} onChange={(e) => s.save('tables', { ...t, name: e.target.value })} />
              <span className="flex-1 text-stone-500">{t.section} · {t.seats} seats</span>
              <button disabled={busy} title={busy ? 'Table has an open order' : 'Delete'} className="p-1 text-stone-400 hover:text-red-600 disabled:opacity-30" onClick={() => s.del('tables', t.id)}><Trash2 size={16} /></button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
