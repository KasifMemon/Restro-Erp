import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Btn, Card, Field, PageHeader, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { dkey, downloadBlob, uid } from '../utils.js';

export default function SettingsPage() {
  const s = useStore();
  const { data } = s;
  const st = data.settings;
  const fileRef = useRef();
  const [tb, setTb] = useState({ name: '', seats: 4, section: 'AC Hall' });
  const [msg, setMsg] = useState('');
  const set = (p) => s.setSettings(p);

  const backup = () => downloadBlob(`restro-erp-backup-${dkey(Date.now())}.json`, new Blob([JSON.stringify(data)], { type: 'application/json' }));
  const restore = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const obj = JSON.parse(rd.result);
        if (!obj.settings || !obj.menu || !obj.orders) throw new Error('bad');
        if (window.confirm('Replace ALL current data with this backup?')) { s.replaceAll(obj); setMsg('Backup restored.'); }
      } catch { setMsg('Invalid backup file.'); }
    };
    rd.readAsText(f);
    e.target.value = '';
  };
  const addTable = () => {
    if (!tb.name.trim()) return;
    s.save('tables', { id: uid('t'), name: tb.name.trim(), seats: +tb.seats || 4, section: tb.section.trim() || 'Main' });
    setTb({ ...tb, name: '' });
  };

  return (
    <>
      <PageHeader title="Settings" sub="Restaurant profile, tax, tables and data" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Restaurant & bill</h3>
          <Field label="Restaurant name"><input className={inputCls} value={st.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Address"><input className={inputCls} value={st.address} onChange={(e) => set({ address: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className={inputCls} value={st.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <Field label="GSTIN"><input className={inputCls} value={st.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} /></Field>
            <Field label="UPI ID (shown on provisional bill)"><input className={inputCls} value={st.upiId} onChange={(e) => set({ upiId: e.target.value })} /></Field>
            <Field label="Service charge % (dine-in)"><input type="number" min="0" className={inputCls} value={st.serviceCharge} onChange={(e) => set({ serviceCharge: +e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={st.taxInclusive} onChange={(e) => set({ taxInclusive: e.target.checked })} /> Menu prices already include GST</label>
          <Field label="Bill footer"><input className={inputCls} value={st.footer} onChange={(e) => set({ footer: e.target.value })} /></Field>
          <p className="text-xs text-stone-500">GST rate is set per dish in Menu (default 5% for restaurants without ITC). Bills split it equally into CGST + SGST.</p>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Tables</h3>
          <div className="mb-3 grid grid-cols-[1fr_70px_1fr_auto] items-end gap-2">
            <Field label="Name"><input className={inputCls} value={tb.name} onChange={(e) => setTb({ ...tb, name: e.target.value })} placeholder="T7" /></Field>
            <Field label="Seats"><input type="number" className={inputCls} value={tb.seats} onChange={(e) => setTb({ ...tb, seats: e.target.value })} /></Field>
            <Field label="Section"><input className={inputCls} value={tb.section} onChange={(e) => setTb({ ...tb, section: e.target.value })} /></Field>
            <Btn onClick={addTable}><Plus size={16} /></Btn>
          </div>
          <div className="max-h-72 overflow-y-auto">
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

        <Card className="space-y-3 p-4 lg:col-span-2">
          <h3 className="font-semibold">Data</h3>
          <p className="text-sm text-stone-600">All data is stored in this browser. Take a backup regularly — and before clearing browser data.</p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={backup}>Download backup</Btn>
            <Btn variant="ghost" onClick={() => fileRef.current.click()}>Restore from backup</Btn>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={restore} />
            <Btn variant="ghost" onClick={() => window.confirm('Reset everything to the demo menu and sample sales?') && s.resetDemo()}>Reset to demo data</Btn>
            <Btn variant="danger" onClick={() => window.confirm('Delete ALL menu, orders, stock and customers and start fresh? (Settings are kept)') && s.clearAll()}>Clear everything & start fresh</Btn>
          </div>
          {msg && <div className="text-sm text-orange-700">{msg}</div>}
        </Card>
      </div>
    </>
  );
}
