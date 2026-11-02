import { useState } from 'react';
import { Phone, Plus, Users } from 'lucide-react';
import { Badge, Btn, Card, Chip, Empty, Field, Modal, PageHeader, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { dkey, fmtDate, fmtTime, uid } from '../utils.js';

const tone = { booked: 'orange', seated: 'green', cancelled: 'gray', noshow: 'red' };
const label = { booked: 'Booked', seated: 'Seated', cancelled: 'Cancelled', noshow: 'No-show' };
const toLocalInput = (ts) => { const d = new Date(ts); return dkey(ts) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

export default function Reservations({ go }) {
  const s = useStore();
  const { data } = s;
  const [tab, setTab] = useState('upcoming');
  const [edit, setEdit] = useState(null);
  const [seat, setSeat] = useState(null);

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const list = [...data.reservations]
    .filter((r) => (tab === 'upcoming' ? r.status === 'booked' : r.status !== 'booked' || r.at < startOfToday.getTime()))
    .sort((a, b) => (tab === 'upcoming' ? a.at - b.at : b.at - a.at));
  const tn = (id) => data.tables.find((t) => t.id === id)?.name;

  const doSeat = (r, tableId) => {
    const id = s.openOrder({ type: 'dine', tableId, guest: { name: r.name, phone: r.phone } });
    s.patchOrder(id, { pax: r.pax });
    s.save('reservations', { ...r, tableId, status: 'seated' });
    setSeat(null);
    go('pos', id);
  };

  return (
    <>
      <PageHeader title="Reservations" sub="Bookings by phone / walk-in — seat them straight into billing">
        <Btn onClick={() => setEdit({ id: uid('rv'), name: '', phone: '', pax: 2, at: Date.now() + 3600000, tableId: '', note: '', status: 'booked' })}><Plus size={16} /> New Booking</Btn>
      </PageHeader>
      <div className="mb-4 flex gap-2"><Chip active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming</Chip><Chip active={tab === 'past'} onClick={() => setTab('past')}>History</Chip></div>

      {list.length === 0 && <Empty>No reservations</Empty>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-sm text-stone-500">{fmtDate(r.at)} · <b className="text-stone-700">{fmtTime(r.at)}</b></div>
              </div>
              <Badge tone={tone[r.status]}>{label[r.status]}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
              <span className="flex items-center gap-1"><Users size={14} /> {r.pax} guests</span>
              {r.phone && <span className="flex items-center gap-1"><Phone size={14} /> {r.phone}</span>}
              {r.tableId && <span>Table {tn(r.tableId)}</span>}
            </div>
            {r.note && <div className="mt-2 rounded-lg bg-stone-50 p-2 text-xs text-stone-600">{r.note}</div>}
            {r.status === 'booked' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn size="sm" variant="green" onClick={() => setSeat(r)}>Seat now</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setEdit({ ...r })}>Edit</Btn>
                <Btn size="sm" variant="ghost" onClick={() => s.save('reservations', { ...r, status: 'noshow' })}>No-show</Btn>
                <Btn size="sm" variant="ghost" onClick={() => s.save('reservations', { ...r, status: 'cancelled' })}>Cancel</Btn>
              </div>
            )}
          </Card>
        ))}
      </div>

      {edit && (
        <Modal title="Reservation" onClose={() => setEdit(null)} footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn><Btn disabled={!edit.name.trim()} onClick={() => { s.save('reservations', { ...edit, pax: +edit.pax || 1 }); setEdit(null); }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Guest name" className="col-span-2"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} inputMode="tel" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Guests"><input type="number" min="1" className={inputCls} value={edit.pax} onChange={(e) => setEdit({ ...edit, pax: e.target.value })} /></Field>
            <Field label="Date & time" className="col-span-2"><input type="datetime-local" className={inputCls} value={toLocalInput(edit.at)} onChange={(e) => e.target.value && setEdit({ ...edit, at: new Date(e.target.value).getTime() })} /></Field>
            <Field label="Table (optional)" className="col-span-2">
              <select className={inputCls} value={edit.tableId} onChange={(e) => setEdit({ ...edit, tableId: e.target.value })}>
                <option value="">— Assign later —</option>
                {data.tables.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.section} · {t.seats} seats</option>)}
              </select>
            </Field>
            <Field label="Note" className="col-span-2"><input className={inputCls} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Birthday, high chair…" /></Field>
          </div>
        </Modal>
      )}

      {seat && <SeatModal r={seat} onClose={() => setSeat(null)} onSeat={doSeat} />}
    </>
  );
}

function SeatModal({ r, onClose, onSeat }) {
  const { data } = useStore();
  const busy = new Set(data.orders.filter((o) => o.status === 'open' && o.tableId).map((o) => o.tableId));
  const free = data.tables.filter((t) => !busy.has(t.id));
  const [sel, setSel] = useState(r.tableId && !busy.has(r.tableId) ? r.tableId : '');
  return (
    <Modal title={`Seat ${r.name} (${r.pax})`} onClose={onClose} footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="green" disabled={!sel} onClick={() => onSeat(r, sel)}>Seat & start order</Btn></>}>
      {free.length === 0 && <Empty>No free tables right now</Empty>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {free.map((t) => (
          <button key={t.id} onClick={() => setSel(t.id)} className={`rounded-xl border-2 p-3 text-center ${sel === t.id ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'}`}>
            <div className="text-lg font-bold">{t.name}</div><div className="text-[11px] text-stone-500">{t.seats} seats</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
