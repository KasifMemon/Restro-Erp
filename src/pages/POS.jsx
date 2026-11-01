import { useState } from 'react';
import { Minus, Plus, Printer, Search, StickyNote, Trash2, ChefHat } from 'lucide-react';
import { Badge, Btn, Card, Empty, Field, Modal, VegDot, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { calcTotals, inr, kotHTML, printHTML, receiptHTML } from '../utils.js';

export default function POS({ orderId, go }) {
  const s = useStore();
  const { data } = s;
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [veg, setVeg] = useState('all');
  const [noteFor, setNoteFor] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);

  const order = data.orders.find((o) => o.id === orderId);

  if (!order || order.status !== 'open') {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <h2 className="mb-2 text-xl font-bold">No active order</h2>
        <p className="mb-5 text-sm text-stone-500">Pick a table to start dine-in billing, or start a takeaway.</p>
        <div className="flex justify-center gap-2">
          <Btn onClick={() => go('tables')}>Go to Tables</Btn>
          <Btn variant="dark" onClick={() => go('pos', s.openOrder({ type: 'take', guest: {} }))}>Quick Takeaway</Btn>
        </div>
      </div>
    );
  }

  const table = data.tables.find((t) => t.id === order.tableId);
  const label = order.type === 'dine' ? `Table ${table?.name || '?'}` : order.type === 'take' ? 'Takeaway' : 'Delivery';
  const totals = calcTotals(order, data.settings);
  const unsent = order.items.some((l) => l.qty > (l.sent || 0));

  const menu = data.menu.filter(
    (m) => (cat === 'all' || m.catId === cat) && (veg === 'all' || (veg === 'veg') === m.veg) && m.name.toLowerCase().includes(q.toLowerCase())
  );
  const noStock = (m) => m.recipe?.some((r) => (data.ingredients.find((i) => i.id === r.ingId)?.stock ?? 0) < r.qty);

  const sendKOT = () => {
    const kot = s.sendKOT(order.id);
    if (kot) printHTML(kotHTML(kot, data.settings));
  };
  const printBill = () => {
    s.patchOrder(order.id, { billed: true });
    printHTML(receiptHTML({ ...order, paidAt: Date.now() }, data.settings, table?.name, totals));
  };
  const cancel = () => {
    if (!window.confirm('Cancel this whole order?')) return;
    s.cancelOrder(order.id);
    go('tables');
  };

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_400px]">
      {/* MENU */}
      <div className="flex min-h-0 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-stone-400" />
            <input className={inputCls + ' pl-9'} placeholder="Search dish…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {['all', 'veg', 'nonveg'].map((v) => (
            <button key={v} onClick={() => setVeg(v)} className={`rounded-lg border px-3 py-2 text-xs font-medium ${veg === v ? 'border-orange-600 bg-orange-600 text-white' : 'border-stone-300 bg-white'}`}>
              {v === 'all' ? 'All' : v === 'veg' ? 'Veg' : 'Non-Veg'}
            </button>
          ))}
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all', name: 'All' }, ...data.categories].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${cat === c.id ? 'bg-stone-800 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid flex-1 content-start gap-2.5 overflow-y-auto pb-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" style={{ minHeight: 0 }}>
          {menu.map((m) => (
            <button
              key={m.id}
              disabled={!m.available}
              onClick={() => s.addLine(order.id, m)}
              className="rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition hover:border-orange-400 hover:shadow disabled:opacity-40"
            >
              <div className="flex items-start gap-2"><VegDot veg={m.veg} /><span className="text-sm font-medium leading-tight">{m.name}</span></div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-orange-600">{inr(m.price)}</span>
                {!m.available ? <Badge tone="gray">Off menu</Badge> : noStock(m) ? <Badge tone="red">Low stock</Badge> : null}
              </div>
            </button>
          ))}
          {menu.length === 0 && <div className="col-span-full"><Empty>No dishes found</Empty></div>}
        </div>
      </div>

      {/* CART */}
      <Card className="flex min-h-[420px] flex-col lg:max-h-full">
        <div className="border-b border-stone-200 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold">{label} <span className="text-sm font-normal text-stone-500">· Order #{order.no}</span></div>
              {order.type !== 'dine' && <div className="text-xs text-stone-500">{order.guest?.name} {order.guest?.phone}</div>}
            </div>
            {order.type === 'dine' && (
              <Field label="Guests" className="w-20">
                <input type="number" min="0" className={inputCls} value={order.pax || ''} onChange={(e) => s.patchOrder(order.id, { pax: +e.target.value })} />
              </Field>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          {order.items.length === 0 && <Empty>Tap dishes to add them</Empty>}
          {order.items.map((l) => (
            <div key={l.lineId} className="border-b border-stone-100 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-stone-500">
                    {inr(l.price)} × {l.qty}
                    {l.sent >= l.qty ? <span className="ml-2 text-emerald-600">✓ sent</span> : l.sent > 0 ? <span className="ml-2 text-orange-600">{l.sent} sent</span> : null}
                  </div>
                  {l.note && <div className="text-xs italic text-orange-700">» {l.note}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <button className="rounded border border-stone-300 p-1 hover:bg-stone-100 disabled:opacity-30" disabled={l.qty <= (l.sent || 0)} onClick={() => s.setQty(order.id, l.lineId, l.qty - 1)}><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                  <button className="rounded border border-stone-300 p-1 hover:bg-stone-100" onClick={() => s.setQty(order.id, l.lineId, l.qty + 1)}><Plus size={14} /></button>
                </div>
                <div className="w-16 text-right text-sm font-semibold">{inr(l.price * l.qty)}</div>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-stone-500">
                <button className="flex items-center gap-1 hover:text-orange-600" onClick={() => setNoteFor(l)}><StickyNote size={12} /> note</button>
                <button
                  className="flex items-center gap-1 hover:text-red-600"
                  onClick={() => { if (!l.sent || window.confirm('This item was already sent to the kitchen. Void it?')) s.removeLine(order.id, l.lineId); }}
                ><Trash2 size={12} /> {l.sent ? 'void' : 'remove'}</button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-stone-200 p-3 text-sm">
          <Row k={`Subtotal${data.settings.taxInclusive ? ' (excl. tax)' : ''}`} v={inr(totals.sub)} />
          {totals.disc > 0 && <Row k="Discount" v={'-' + inr(totals.disc)} />}
          {totals.sc > 0 && <Row k={`Service charge ${data.settings.serviceCharge}%`} v={inr(totals.sc)} />}
          <Row k="CGST + SGST" v={inr(totals.tax)} />
          <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-xl font-bold"><span>Total</span><span className="text-orange-600">{inr(totals.total)}</span></div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Btn variant="dark" onClick={sendKOT} disabled={!unsent}><ChefHat size={16} /> Send KOT</Btn>
            <Btn variant="ghost" onClick={printBill} disabled={!order.items.length}><Printer size={16} /> Print Bill</Btn>
            <Btn variant="green" className="col-span-2" size="lg" onClick={() => setSettleOpen(true)} disabled={!order.items.length}>Settle · {inr(totals.total)}</Btn>
          </div>
          {unsent && <div className="text-center text-xs text-orange-600">Some items are not sent to the kitchen yet</div>}
          <button onClick={cancel} className="w-full pt-1 text-center text-xs text-stone-400 hover:text-red-600">Cancel order</button>
        </div>
      </Card>

      {noteFor && (
        <NoteModal line={noteFor} onClose={() => setNoteFor(null)} onSave={(t) => { s.setNote(order.id, noteFor.lineId, t); setNoteFor(null); }} />
      )}
      {settleOpen && <SettleModal order={order} table={table} onClose={() => setSettleOpen(false)} onDone={() => { setSettleOpen(false); go('tables'); }} />}
    </div>
  );
}

const Row = ({ k, v }) => <div className="flex justify-between text-stone-600"><span>{k}</span><span>{v}</span></div>;

function NoteModal({ line, onClose, onSave }) {
  const [t, setT] = useState(line.note || '');
  const quick = ['Less spicy', 'Extra spicy', 'No onion', 'No garlic', 'Jain', 'Less oil'];
  return (
    <Modal title={`Note for ${line.name}`} onClose={onClose} footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={() => onSave(t)}>Save</Btn></>}>
      <input autoFocus className={inputCls} value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. less spicy" />
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((x) => <button key={x} className="rounded-full bg-stone-100 px-3 py-1 text-xs hover:bg-orange-100" onClick={() => setT(x)}>{x}</button>)}
      </div>
    </Modal>
  );
}

function SettleModal({ order, table, onClose, onDone }) {
  const s = useStore();
  const { data } = s;
  const [disc, setDisc] = useState(order.discount || { type: 'pct', value: 0 });
  const [scOff, setScOff] = useState(!!order.scOff);
  const [pay, setPay] = useState({ cash: '', upi: '', card: '' });
  const [customerId, setCustomerId] = useState('');
  const [guest, setGuest] = useState(order.guest || {});

  const draft = { ...order, discount: disc, scOff };
  const t = calcTotals(draft, data.settings);
  const paid = ['cash', 'upi', 'card'].reduce((a, k) => a + (Number(pay[k]) || 0), 0);
  const remaining = Math.round((t.total - paid) * 100) / 100;
  const cust = data.customers.find((c) => c.id === customerId);
  const canCredit = !!(customerId || guest.phone);
  const valid = remaining <= 0.5 || canCredit; // positive remaining becomes credit (udhaar) only with a customer
  const change = remaining < 0 ? -remaining : 0;

  const fill = (k) => setPay({ cash: '', upi: '', card: '', [k]: String(t.total) });

  const confirm = () => {
    const payments = ['cash', 'upi', 'card'].filter((k) => Number(pay[k]) > 0).map((k) => {
      let amt = Number(pay[k]);
      if (k === 'cash' && change > 0) amt = Math.max(0, amt - change); // change returned
      return { mode: k, amount: amt };
    });
    const due = remaining > 0.5 ? remaining : 0;
    const final = { payments, discount: disc, due, customerId: customerId || null, scOff, guest };
    s.settle(order.id, final);
    const done = { ...order, ...final, billNo: s.get().counters.bill - 1, paidAt: Date.now(), totals: t };
    printHTML(receiptHTML(done, data.settings, table?.name, t));
    onDone();
  };

  return (
    <Modal
      title={`Settle ${order.type === 'dine' ? 'Table ' + (table?.name || '') : order.type === 'take' ? 'Takeaway' : 'Delivery'} · #${order.no}`}
      onClose={onClose}
      wide
      footer={<><Btn variant="ghost" onClick={onClose}>Back</Btn><Btn variant="green" disabled={!valid || (paid === 0 && !canCredit)} onClick={confirm}>Confirm & Print</Btn></>}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Discount" className="col-span-1">
              <select className={inputCls} value={disc.type} onChange={(e) => setDisc({ ...disc, type: e.target.value })}>
                <option value="pct">% off</option><option value="amt">₹ off</option>
              </select>
            </Field>
            <Field label="Value" className="col-span-2"><input type="number" min="0" className={inputCls} value={disc.value || ''} onChange={(e) => setDisc({ ...disc, value: +e.target.value })} /></Field>
          </div>
          {order.type === 'dine' && data.settings.serviceCharge > 0 && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scOff} onChange={(e) => setScOff(e.target.checked)} /> Waive service charge</label>
          )}
          <Field label="Customer (for loyalty / credit)">
            <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Walk-in —</option>
              {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
            </select>
          </Field>
          {!customerId && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="New customer name"><input className={inputCls} value={guest.name || ''} onChange={(e) => setGuest({ ...guest, name: e.target.value })} /></Field>
              <Field label="Phone"><input className={inputCls} inputMode="tel" value={guest.phone || ''} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} /></Field>
            </div>
          )}
          {cust?.due > 0 && <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">{cust.name} has an old due of {inr(cust.due)}</div>}
        </div>

        <div>
          <div className="mb-3 rounded-xl bg-stone-50 p-3 text-sm">
            <Row k="Subtotal" v={inr(t.sub)} />
            {t.disc > 0 && <Row k="Discount" v={'-' + inr(t.disc)} />}
            {t.sc > 0 && <Row k="Service charge" v={inr(t.sc)} />}
            <Row k="GST (CGST+SGST)" v={inr(t.tax)} />
            {Math.abs(t.round) > 0.004 && <Row k="Round off" v={t.round.toFixed(2)} />}
            <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 text-xl font-bold"><span>Payable</span><span className="text-orange-600">{inr(t.total)}</span></div>
          </div>
          {[['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card']].map(([k, n]) => (
            <div key={k} className="mb-2 flex items-center gap-2">
              <span className="w-12 text-sm font-medium">{n}</span>
              <input type="number" min="0" className={inputCls} value={pay[k]} onChange={(e) => setPay({ ...pay, [k]: e.target.value })} placeholder="0" />
              <Btn variant="soft" size="sm" onClick={() => fill(k)}>Full</Btn>
            </div>
          ))}
          <div className="mt-2 text-sm">
            {remaining > 0.5 && (canCredit
              ? <span className="font-medium text-amber-700">₹{remaining} will be added to customer's credit (udhaar)</span>
              : <span className="font-medium text-red-600">₹{remaining} remaining — enter payment or choose a customer for credit</span>)}
            {change > 0 && <span className="font-medium text-emerald-700">Return change: {inr(change)}</span>}
            {remaining <= 0.5 && change === 0 && <span className="font-medium text-emerald-700">Fully paid ✓</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
