import { useState } from 'react';
import { Bike, CalendarClock, ShoppingBag } from 'lucide-react';
import { Btn, Card, Field, Modal, PageHeader, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { calcTotals, fmtTime, inr } from '../utils.js';

export default function Tables({ go }) {
  const s = useStore();
  const { data } = s;
  const [guestModal, setGuestModal] = useState(null);
  const [g, setG] = useState({ name: '', phone: '', address: '' });

  const openByTable = {};
  data.orders.filter((o) => o.status === 'open' && o.tableId).forEach((o) => { openByTable[o.tableId] = o; });
  const soon = {};
  data.reservations.filter((r) => r.status === 'booked' && r.tableId && r.at > Date.now() - 30 * 60000 && r.at < Date.now() + 3 * 3600000).forEach((r) => { soon[r.tableId] = r; });
  const sections = [...new Set(data.tables.map((t) => t.section || 'Main'))];
  const nonDine = data.orders.filter((o) => o.status === 'open' && o.type !== 'dine');
  const counts = { free: data.tables.filter((t) => !openByTable[t.id]).length, busy: Object.keys(openByTable).length };

  const openTable = (t) => go('pos', s.openOrder({ type: 'dine', tableId: t.id }));
  const startGuest = () => {
    const id = s.openOrder({ type: guestModal, guest: g });
    setGuestModal(null); setG({ name: '', phone: '', address: '' });
    go('pos', id);
  };
  const mins = (ts) => Math.max(0, Math.round((Date.now() - ts) / 60000));

  return (
    <>
      <PageHeader title="Tables" sub={`${counts.free} free · ${counts.busy} occupied`}>
        <Btn variant="dark" onClick={() => setGuestModal('take')}><ShoppingBag size={16} /> Takeaway</Btn>
        <Btn onClick={() => setGuestModal('delivery')}><Bike size={16} /> Delivery</Btn>
      </PageHeader>

      {sections.map((sec) => (
        <div key={sec} className="mb-6">
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-stone-400">{sec}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {data.tables.filter((t) => (t.section || 'Main') === sec).map((t) => {
              const o = openByTable[t.id];
              const rv = soon[t.id];
              const tot = o ? calcTotals(o, data.settings).total : 0;
              const bar = !o ? (rv ? 'bg-violet-400' : 'bg-emerald-400') : o.billed ? 'bg-sky-500' : 'bg-orange-500';
              return (
                <button key={t.id} onClick={() => openTable(t)} className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(28,25,23,.04)] transition hover:shadow-md active:scale-[.98]">
                  <span className={`absolute inset-x-0 top-0 h-1.5 ${bar}`} />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xl font-bold">{t.name}</span>
                    <span className="text-xs text-stone-400">{t.seats} seats</span>
                  </div>
                  {o ? (
                    <div className="mt-2">
                      <div className="text-lg font-bold text-stone-800">{inr(tot)}</div>
                      <div className="text-xs text-stone-500">{o.billed ? 'Bill printed' : 'Running'} · {mins(o.createdAt)} min · {o.items.reduce((a, l) => a + l.qty, 0)} items</div>
                    </div>
                  ) : rv ? (
                    <div className="mt-2 text-sm font-medium text-violet-600"><CalendarClock size={13} className="mr-1 inline" />{fmtTime(rv.at)} · {rv.name.split(' ')[0]}</div>
                  ) : (
                    <div className="mt-2 text-sm text-emerald-600">Available</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {nonDine.length > 0 && (
        <div>
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-stone-400">Takeaway / Delivery in progress</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {nonDine.map((o) => (
              <Card key={o.id} className="cursor-pointer p-3.5 hover:shadow-md" onClick={() => go('pos', o.id)}>
                <div className="flex justify-between text-sm font-semibold"><span>{o.type === 'take' ? 'Takeaway' : 'Delivery'} #{o.no}</span><span>{inr(calcTotals(o, data.settings).total)}</span></div>
                <div className="text-xs text-stone-500">{o.guest?.name || 'Guest'} {o.guest?.phone || ''}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-stone-500">
        {[['bg-emerald-400', 'Free'], ['bg-orange-500', 'Running'], ['bg-sky-500', 'Bill printed'], ['bg-violet-400', 'Reserved soon']].map(([c, n]) => (
          <span key={n} className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${c}`} /> {n}</span>
        ))}
      </div>

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
