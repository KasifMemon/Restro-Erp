import { useState } from 'react';
import { Bike, ShoppingBag } from 'lucide-react';
import { Btn, Card, Field, Modal, PageHeader, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { calcTotals, inr } from '../utils.js';

export default function Tables({ go }) {
  const s = useStore();
  const { data } = s;
  const [guestModal, setGuestModal] = useState(null); // 'take' | 'delivery'
  const [g, setG] = useState({ name: '', phone: '', address: '' });

  const openByTable = {};
  data.orders.filter((o) => o.status === 'open' && o.tableId).forEach((o) => { openByTable[o.tableId] = o; });
  const sections = [...new Set(data.tables.map((t) => t.section || 'Main'))];
  const nonDine = data.orders.filter((o) => o.status === 'open' && o.type !== 'dine');

  const openTable = (t) => {
    const id = s.openOrder({ type: 'dine', tableId: t.id });
    go('pos', id);
  };
  const startGuest = () => {
    const id = s.openOrder({ type: guestModal, guest: g });
    setGuestModal(null); setG({ name: '', phone: '', address: '' });
    go('pos', id);
  };

  const mins = (ts) => Math.max(0, Math.round((Date.now() - ts) / 60000));

  return (
    <>
      <PageHeader title="Tables & Orders" sub="Tap a table to start or continue its order">
        <Btn variant="dark" onClick={() => setGuestModal('take')}><ShoppingBag size={16} /> New Takeaway</Btn>
        <Btn onClick={() => setGuestModal('delivery')}><Bike size={16} /> New Delivery</Btn>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-200" /> Free</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-orange-300" /> Occupied</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-sky-300" /> Bill printed</span>
      </div>

      {sections.map((sec) => (
        <div key={sec} className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">{sec}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {data.tables.filter((t) => (t.section || 'Main') === sec).map((t) => {
              const o = openByTable[t.id];
              const tot = o ? calcTotals(o, data.settings).total : 0;
              const cls = !o ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : o.billed ? 'border-sky-300 bg-sky-100 hover:bg-sky-200' : 'border-orange-300 bg-orange-100 hover:bg-orange-200';
              return (
                <button key={t.id} onClick={() => openTable(t)} className={`rounded-xl border-2 p-3 text-left transition ${cls}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">{t.name}</span>
                    <span className="text-xs text-stone-500">{t.seats} seats</span>
                  </div>
                  {o ? (
                    <div className="mt-2 text-sm">
                      <div className="font-semibold">{inr(tot)}</div>
                      <div className="text-xs text-stone-600">#{o.no} · {mins(o.createdAt)} min · {o.items.reduce((a, l) => a + l.qty, 0)} items</div>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-emerald-700">Available</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {nonDine.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Takeaway / Delivery in progress</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {nonDine.map((o) => (
              <Card key={o.id} className="cursor-pointer p-3 hover:border-orange-400" onClick={() => go('pos', o.id)}>
                <div className="flex justify-between text-sm font-semibold">
                  <span>{o.type === 'take' ? 'Takeaway' : 'Delivery'} #{o.no}</span>
                  <span>{inr(calcTotals(o, data.settings).total)}</span>
                </div>
                <div className="text-xs text-stone-500">{o.guest?.name || 'Guest'} {o.guest?.phone || ''}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {guestModal && (
        <Modal
          title={guestModal === 'take' ? 'New Takeaway Order' : 'New Delivery Order'}
          onClose={() => setGuestModal(null)}
          footer={<><Btn variant="ghost" onClick={() => setGuestModal(null)}>Cancel</Btn><Btn onClick={startGuest} disabled={guestModal === 'delivery' && (!g.phone || !g.address)}>Start Order</Btn></>}
        >
          <div className="space-y-3">
            <Field label="Customer name"><input className={inputCls} value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></Field>
            <Field label={`Phone${guestModal === 'delivery' ? ' *' : ''}`}><input className={inputCls} inputMode="tel" value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} /></Field>
            {guestModal === 'delivery' && <Field label="Delivery address *"><textarea className={inputCls} rows={2} value={g.address} onChange={(e) => setG({ ...g, address: e.target.value })} /></Field>}
          </div>
        </Modal>
      )}
    </>
  );
}
