import { useState } from 'react';
import { MessageCircle, Printer, Search, Ban } from 'lucide-react';
import { Badge, Btn, Card, Chip, Empty, Field, Modal, PageHeader, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { DAY, calcTotals, fmtDT, inr, startOfDay } from '../utils.js';
import { printReceipt } from '../print.js';

const tone = { paid: 'green', open: 'orange', cancelled: 'gray', void: 'red' };

export default function Orders({ go, canVoid }) {
  const s = useStore();
  const { data } = s;
  const [range, setRange] = useState('today');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState(null);

  const since = range === 'today' ? startOfDay(Date.now()) : range === '7d' ? startOfDay(Date.now()) - 6 * DAY : 0;
  const when = (o) => o.paidAt || o.voidedAt || o.cancelledAt || o.createdAt;
  const list = data.orders
    .filter((o) => when(o) >= since && (status === 'all' || o.status === status))
    .filter((o) => {
      if (!q) return true;
      const t = (String(o.billNo || '') + ' ' + o.no + ' ' + (o.guest?.name || '') + ' ' + (o.guest?.phone || '') + ' ' + (data.customers.find((c) => c.id === o.customerId)?.name || '')).toLowerCase();
      return t.includes(q.toLowerCase());
    })
    .sort((a, b) => when(b) - when(a));
  const paidSum = list.filter((o) => o.status === 'paid').reduce((a, o) => a + o.totals.total, 0);
  const tName = (o) => (o.type === 'dine' ? 'Table ' + (data.tables.find((t) => t.id === o.tableId)?.name || '?') : o.type === 'take' ? 'Takeaway' : 'Delivery');
  const totalOf = (o) => (o.totals || calcTotals(o, data.settings)).total;

  return (
    <>
      <PageHeader title="Bills" sub={`${list.length} orders · ${inr(paidSum)} paid`} />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
          <input className={inputCls + ' pl-10'} placeholder="Search bill no, order no, customer, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {[['today', 'Today'], ['7d', '7 days'], ['all', 'All time']].map(([k, n]) => <Chip key={k} active={range === k} onClick={() => setRange(k)}>{n}</Chip>)}
        <span className="mx-1 w-px shrink-0 bg-stone-200" />
        {[['all', 'Any status'], ['paid', 'Paid'], ['open', 'Open'], ['void', 'Void'], ['cancelled', 'Cancelled']].map(([k, n]) => <Chip key={k} active={status === k} onClick={() => setStatus(k)}>{n}</Chip>)}
      </div>

      {list.length === 0 && <Empty>No orders match</Empty>}
      <div className="space-y-2">
        {list.slice(0, 150).map((o) => (
          <Card key={o.id} className="flex cursor-pointer items-center gap-3 p-3.5 transition hover:shadow-md" onClick={() => setView(o)}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{o.billNo ? `Bill #${o.billNo}` : `Order #${o.no}`}</span>
                <Badge tone={tone[o.status]}>{o.status}</Badge>
                {o.due > 0 && <Badge tone="yellow">credit {inr(o.due)}</Badge>}
              </div>
              <div className="mt-0.5 truncate text-xs text-stone-500">{tName(o)} · {fmtDT(when(o))} · {o.items.reduce((a, l) => a + l.qty, 0)} items{o.guest?.name ? ' · ' + o.guest.name : ''}</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${o.status === 'void' || o.status === 'cancelled' ? 'text-stone-400 line-through' : ''}`}>{inr(totalOf(o))}</div>
              <div className="text-[11px] uppercase text-stone-400">{o.payments?.map((p) => p.mode).join(' + ')}</div>
            </div>
          </Card>
        ))}
      </div>

      {view && <BillModal order={view} canVoid={canVoid} onClose={() => setView(null)} go={go} />}
    </>
  );
}

function BillModal({ order: o0, canVoid, onClose, go }) {
  const s = useStore();
  const { data } = s;
  const o = data.orders.find((x) => x.id === o0.id) || o0;
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  const t = o.totals || calcTotals(o, data.settings);
  const table = data.tables.find((x) => x.id === o.tableId);
  const cust = data.customers.find((c) => c.id === o.customerId);
  const phone = (o.guest?.phone || cust?.phone || '').replace(/\D/g, '').slice(-10);

  const wa = () => {
    const lines = o.items.filter((l) => l.qty > 0).map((l) => `${l.name} x${l.qty} = ${inr(l.price * l.qty)}`).join('\n');
    const text = `*${data.settings.name}*\nBill #${o.billNo || o.no}\n${lines}\n\nTotal: *${inr(t.total)}*\n${data.settings.footer || ''}`;
    window.open(`https://wa.me/${phone ? '91' + phone : ''}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Modal title={o.billNo ? `Bill #${o.billNo}` : `Order #${o.no}`} onClose={onClose}
      footer={o.status === 'open'
        ? <Btn onClick={() => { onClose(); go('pos', o.id); }}>Open in Billing</Btn>
        : voiding
          ? <><Btn variant="ghost" onClick={() => setVoiding(false)}>Back</Btn><Btn variant="danger" disabled={!reason.trim()} onClick={() => { s.voidBill(o.id, reason.trim()); setVoiding(false); }}>Void this bill</Btn></>
          : <>
            {o.status === 'paid' && canVoid && <Btn variant="ghost" className="mr-auto text-red-600" onClick={() => setVoiding(true)}><Ban size={15} /> Void</Btn>}
            <Btn variant="ghost" onClick={wa}><MessageCircle size={15} /> WhatsApp</Btn>
            <Btn onClick={() => printReceipt(o, data.settings, table?.name, t)}><Printer size={15} /> Reprint</Btn>
          </>}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-stone-500">
        <Badge tone={tone[o.status]}>{o.status}</Badge>
        <span>{o.type === 'dine' ? 'Table ' + (table?.name || '?') : o.type === 'take' ? 'Takeaway' : 'Delivery'}</span>
        <span>· {fmtDT(o.paidAt || o.createdAt)}</span>
        {(cust || o.guest?.name) && <span>· {cust?.name || o.guest.name}</span>}
      </div>
      {o.status === 'void' && <div className="mb-3 rounded-xl bg-red-50 p-2.5 text-sm text-red-700">Voided: {o.voidReason}</div>}
      <div className="divide-y divide-stone-100 text-sm">
        {o.items.filter((l) => l.qty > 0).map((l) => (
          <div key={l.lineId} className="flex justify-between py-1.5"><span>{l.name} <span className="text-stone-400">× {l.qty}</span></span><span>{inr(l.price * l.qty)}</span></div>
        ))}
      </div>
      <div className="mt-3 space-y-1 rounded-2xl bg-stone-50 p-3 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{inr(t.sub)}</span></div>
        {t.disc > 0 && <div className="flex justify-between"><span>Discount</span><span>-{inr(t.disc)}</span></div>}
        {t.redeem > 0 && <div className="flex justify-between"><span>Loyalty points</span><span>-{inr(t.redeem)}</span></div>}
        {t.sc > 0 && <div className="flex justify-between"><span>Service charge</span><span>{inr(t.sc)}</span></div>}
        <div className="flex justify-between"><span>CGST + SGST</span><span>{inr(t.tax)}</span></div>
        <div className="flex justify-between border-t border-stone-200 pt-1 text-lg font-bold"><span>Total</span><span>{inr(t.total)}</span></div>
        {o.payments?.map((p, i) => <div key={i} className="flex justify-between text-stone-500"><span className="uppercase">{p.mode}</span><span>{inr(p.amount)}</span></div>)}
        {o.due > 0 && <div className="flex justify-between text-amber-700"><span>Credit</span><span>{inr(o.due)}</span></div>}
      </div>
      {voiding && (
        <div className="mt-4"><Field label="Reason for voiding (required)"><input autoFocus className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. wrong order, customer refund" /></Field>
          <p className="mt-1 text-xs text-stone-500">The bill is removed from sales & GST reports and any credit/points are reversed. Stock is not restored.</p></div>
      )}
    </Modal>
  );
}
