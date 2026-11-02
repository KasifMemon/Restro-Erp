import { useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { Btn, Field, inputCls } from './components.jsx';
import { useStore } from './store.jsx';
import { emptyData, seed } from './seed.js';
import { fileToLogo, uid } from './utils.js';

const STEPS = ['Business', 'Billing', 'Tables', 'Menu'];

export default function Setup() {
  const s = useStore();
  const base = s.data.settings;
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: '', address: '', phone: '', gstin: '', fssai: '', logo: '', owner: '', upiId: '', serviceCharge: 0, taxInclusive: false, footer: 'Thank you! Visit again.', reviewUrl: '' });
  const [secs, setSecs] = useState([{ name: 'Main Hall', count: 8, seats: 4 }]);
  const [start, setStart] = useState('sample');
  const fileRef = useRef();
  const set = (p) => setF({ ...f, ...p });

  const skip = () => s.setSettings({ setupDone: true });

  const finish = () => {
    const d = start === 'blank' ? seed({ history: false }) : seed({ history: start === 'demo' });
    d.settings = { ...d.settings, name: f.name.trim() || d.settings.name, address: f.address, phone: f.phone, gstin: f.gstin.toUpperCase(), fssai: f.fssai, logo: f.logo, upiId: f.upiId.trim(), serviceCharge: +f.serviceCharge || 0, taxInclusive: f.taxInclusive, footer: f.footer, setupDone: true, receipt: { ...d.settings.receipt, reviewUrl: f.reviewUrl.trim() } };
    // tables from the wizard
    const used = new Set();
    d.tables = [];
    secs.filter((x) => x.name.trim() && +x.count > 0).forEach((sec, si) => {
      let pre = sec.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      if (used.has(pre)) pre += si + 1;
      used.add(pre);
      for (let i = 1; i <= Math.min(60, +sec.count); i++) d.tables.push({ id: uid('t'), name: pre + i, seats: +sec.seats || 4, section: sec.name.trim() });
    });
    if (!d.tables.length) d.tables.push({ id: uid('t'), name: 'T1', seats: 4, section: 'Main' });
    if (start === 'blank') {
      d.menu = []; d.ingredients = []; d.customers = []; d.suppliers = []; d.reservations = []; d.orders = []; d.expenses = [];
      d.staff = [{ id: uid('e'), name: f.owner.trim() || 'Owner', role: 'Owner', phone: f.phone, salary: 0, attendance: {} }];
      d.counters = { order: 1, kot: 1, bill: 1 };
    } else {
      d.orders.forEach((o) => { if (o.tableId) o.tableId = d.tables[0].id; });
      d.reservations = [];
    }
    s.replaceAll(d);
  };

  const pickLogo = async (e) => { const file = e.target.files[0]; if (file) set({ logo: await fileToLogo(file) }); e.target.value = ''; };
  const okStep = [f.name.trim().length > 1, true, secs.some((x) => x.name.trim() && +x.count > 0), true][step];

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-gradient-to-b from-orange-50 to-stone-100">
      <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center p-4">
        <div className="rounded-3xl bg-white p-5 shadow-xl sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow"><UtensilsCrossed /></div>
            <div><h1 className="text-xl font-bold">Welcome to RestroERP</h1><p className="text-sm text-stone-500">2-minute setup · you can change everything later</p></div>
          </div>
          <div className="mb-5 flex gap-1.5">{STEPS.map((n, i) => <div key={n} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-orange-600' : 'bg-stone-200'}`} />)}</div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">Step {step + 1} · {STEPS[step]}</div>

          {step === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => fileRef.current.click()} className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                  {f.logo ? <img src={f.logo} alt="" className="max-h-full max-w-full object-contain" /> : <ImagePlus className="text-stone-300" />}
                </button>
                <div className="text-xs text-stone-500">Upload your logo (optional) — it prints on bills.</div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
              </div>
              <Field label="Restaurant name *"><input autoFocus className={inputCls} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Shree Ganesh Family Restaurant" /></Field>
              <Field label="Address"><input className={inputCls} value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><input className={inputCls} inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
                <Field label="Owner name"><input className={inputCls} value={f.owner} onChange={(e) => set({ owner: e.target.value })} /></Field>
                <Field label="GSTIN (if registered)"><input className={inputCls} value={f.gstin} onChange={(e) => set({ gstin: e.target.value })} /></Field>
                <Field label="FSSAI no."><input className={inputCls} value={f.fssai} onChange={(e) => set({ fssai: e.target.value })} /></Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <Field label="UPI ID — prints a payment QR with the exact amount on every bill"><input className={inputCls} placeholder="yourname@bank" value={f.upiId} onChange={(e) => set({ upiId: e.target.value })} /></Field>
              <Field label="Service charge % on dine-in (0 = none)"><input type="number" min="0" className={inputCls} value={f.serviceCharge} onChange={(e) => set({ serviceCharge: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-orange-600" checked={f.taxInclusive} onChange={(e) => set({ taxInclusive: e.target.checked })} /> My menu prices already include GST</label>
              <Field label="Google review link (optional) — prints a 'Rate us' QR"><input className={inputCls} placeholder="https://g.page/r/…" value={f.reviewUrl} onChange={(e) => set({ reviewUrl: e.target.value })} /></Field>
              <Field label="Bill footer"><input className={inputCls} value={f.footer} onChange={(e) => set({ footer: e.target.value })} /></Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-stone-500">Add your seating areas. Tables are named automatically (e.g. “MH1, MH2…”) and can be edited later.</p>
              {secs.map((sec, i) => (
                <div key={i} className="grid grid-cols-[1fr_64px_64px_auto] items-end gap-2">
                  <Field label={i === 0 ? 'Section' : ''}><input className={inputCls} value={sec.name} onChange={(e) => setSecs(secs.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} /></Field>
                  <Field label={i === 0 ? 'Tables' : ''}><input type="number" min="1" className={inputCls} value={sec.count} onChange={(e) => setSecs(secs.map((x, k) => (k === i ? { ...x, count: e.target.value } : x)))} /></Field>
                  <Field label={i === 0 ? 'Seats' : ''}><input type="number" min="1" className={inputCls} value={sec.seats} onChange={(e) => setSecs(secs.map((x, k) => (k === i ? { ...x, seats: e.target.value } : x)))} /></Field>
                  <button disabled={secs.length === 1} className="mb-2 p-1 text-stone-400 hover:text-red-600 disabled:opacity-30" onClick={() => setSecs(secs.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
                </div>
              ))}
              <Btn size="sm" variant="soft" onClick={() => setSecs([...secs, { name: '', count: 4, seats: 4 }])}><Plus size={14} /> Add section</Btn>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2.5">
              <p className="text-sm text-stone-500">How would you like to start?</p>
              {[
                ['blank', 'Start empty', 'Only categories. Add your dishes or import them from a CSV/Excel sheet.'],
                ['sample', 'Sample Indian menu', '28 dishes with recipes and stock — edit to match yours.'],
                ['demo', 'Full demo', 'Sample menu plus a week of fake sales, to explore reports.'],
              ].map(([k, t, d]) => (
                <button key={k} onClick={() => setStart(k)} className={`w-full rounded-2xl border-2 p-3.5 text-left ${start === k ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                  <div className="font-semibold">{t}</div><div className="text-xs text-stone-500">{d}</div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-2">
            {step === 0 ? <button className="text-sm text-stone-400 hover:text-stone-600" onClick={skip}>Skip, keep current data</button> : <Btn variant="ghost" onClick={() => setStep(step - 1)}>Back</Btn>}
            {step < 3 ? <Btn disabled={!okStep} onClick={() => setStep(step + 1)}>Next</Btn> : <Btn variant="green" onClick={finish}>Finish setup</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}
