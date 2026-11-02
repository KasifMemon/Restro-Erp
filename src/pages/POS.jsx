import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, ArrowLeftRight, ChefHat, Minus, Plus, Printer, Search, ShoppingBag, StickyNote, Trash2 } from 'lucide-react';
import { Badge, Btn, Card, Chip, Empty, Field, Modal, VegDot, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { calcTotals, inr, upiLink } from '../utils.js';
import { printKOT, printReceipt } from '../print.js';

export default function POS({ orderId, go }) {
  const s = useStore();
  const { data } = s;
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [veg, setVeg] = useState('all');
  const [noteFor, setNoteFor] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // mobile cart sheet

  const order = data.orders.find((o) => o.id === orderId);

  if (!order || order.status !== 'open') {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><ShoppingBag /></div>
        <h2 className="mb-1 text-xl font-bold">No active order</h2>
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
  const qtyOf = (id) => order.items.filter((l) => l.itemId === id).reduce((a, l) => a + l.qty, 0);

  const menu = data.menu.filter(
    (m) => (cat === 'all' || m.catId === cat) && (veg === 'all' || (veg === 'veg') === m.veg) && m.name.toLowerCase().includes(q.toLowerCase())
  );
  const noStock = (m) => m.recipe?.some((r) => (data.ingredients.find((i) => i.id === r.ingId)?.stock ?? 0) < r.qty);

  const sendKOT = () => {
    const kot = s.sendKOT(order.id);
    if (kot && data.settings.autoPrintKot) printKOT(kot, data.settings);
  };
  const printBill = () => {
    s.patchOrder(order.id, { billed: true });
    printReceipt({ ...order, paidAt: Date.now() }, data.settings, table?.name, totals);
  };
  const cancel = () => {
    if (!window.confirm('Cancel this whole order?')) return;
    s.cancelOrder(order.id);
    go('tables');
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* MENU */}
      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
            <input className={inputCls + ' pl-10'} placeholder="Search dish…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex shrink-0 rounded-xl border border-stone-200 bg-white p-0.5">
            {[['all', 'All'], ['veg', 'Veg'], ['nonveg', 'Non']].map(([v, n]) => (
              <button key={v} onClick={() => setVeg(v)} className={`rounded-[10px] px-2.5 py-2 text-xs font-medium ${veg === v ? (v === 'veg' ? 'bg-emerald-600 text-white' : v === 'nonveg' ? 'bg-red-600 text-white' : 'bg-stone-800 text-white') : 'text-stone-500'}`}>{n}</button>
            ))}
          </div>
        </div>
        <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {[{ id: 'all', name: 'All' }, ...data.categories].map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto pb-24 sm:grid-cols-3 lg:pb-4 xl:grid-cols-3 2xl:grid-cols-4">
          {menu.map((m) => {
            const n = qtyOf(m.id);
            return (
              <button
                key={m.id}
                disabled={!m.available}
                onClick={() => s.addLine(order.id, m)}
                className={`relative flex min-h-[88px] flex-col justify-between rounded-2xl border bg-white p-3 text-left shadow-[0_1px_2px_rgba(28,25,23,.04)] transition active:scale-[.98] disabled:opacity-40 ${n ? 'border-orange-400 ring-2 ring-orange-100' : 'border-stone-200 hover:border-orange-300'}`}
              >
                {n > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-orange-600 px-1.5 text-xs font-bold text-white shadow">{n}</span>}
                <div className="flex items-start gap-2"><VegDot veg={m.veg} /><span className="text-sm font-medium leading-tight">{m.name}</span></div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="font-bold text-orange-600">{inr(m.price)}</span>
                  {!m.available ? <Badge tone="gray">Off</Badge> : noStock(m) ? <Badge tone="red">Low stock</Badge> : null}
                </div>
              </button>
            );
          })}
          {menu.length === 0 && <div className="col-span-full"><Empty>No dishes found</Empty></div>}
        </div>
      </div>

      {/* CART — inline on desktop, full-screen sheet on phones */}
      <div className={`${cartOpen ? 'fixed inset-0 z-50 flex bg-white' : 'hidden'} lg:static lg:z-auto lg:flex lg:min-h-0 lg:bg-transparent`}>
        <Card className="flex w-full flex-col rounded-none border-0 shadow-none lg:min-h-0 lg:rounded-2xl lg:border lg:shadow-[0_1px_2px_rgba(28,25,23,.04)]">
          <div className="flex items-center gap-2 border-b border-stone-100 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3">
            <button className="rounded-xl p-2 hover:bg-stone-100 lg:hidden" onClick={() => setCartOpen(false)} aria-label="Back to menu"><ArrowLeft size={20} /></button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-bold leading-tight">{label}</div>
              <div className="truncate text-xs text-stone-500">Order #{order.no}{order.type !== 'dine' && (order.guest?.name || order.guest?.phone) ? ` · ${order.guest?.name || ''} ${order.guest?.phone || ''}` : ''}</div>
            </div>
            {order.type === 'dine' && (
              <>
                <input type="number" min="0" placeholder="Pax" title="Guests" className={inputCls + ' !w-16 !px-2 text-center'} value={order.pax || ''} onChange={(e) => s.patchOrder(order.id, { pax: +e.target.value })} />
                <Btn size="sm" variant="ghost" onClick={() => setMoveOpen(true)} title="Move to another table"><ArrowLeftRight size={14} /> Move</Btn>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3">
            {order.items.length === 0 && <Empty>Tap dishes to add them</Empty>}
            {order.items.map((l) => (
              <div key={l.lineId} className="border-b border-stone-100 py-2.5">
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
                    <button className="rounded-lg border border-stone-200 p-1.5 hover:bg-stone-100 disabled:opacity-30" disabled={l.qty <= (l.sent || 0)} onClick={() => s.setQty(order.id, l.lineId, l.qty - 1)}><Minus size={15} /></button>
                    <span className="w-7 text-center text-sm font-semibold">{l.qty}</span>
                    <button className="rounded-lg border border-stone-200 p-1.5 hover:bg-stone-100" onClick={() => s.setQty(order.id, l.lineId, l.qty + 1)}><Plus size={15} /></button>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold">{inr(l.price * l.qty)}</div>
                </div>
                <div className="mt-1.5 flex gap-4 text-xs text-stone-500">
                  <button className="flex items-center gap-1 py-0.5 hover:text-orange-600" onClick={() => setNoteFor(l)}><StickyNote size={12} /> note</button>
                  <button className="flex items-center gap-1 py-0.5 hover:text-red-600" onClick={() => { if (!l.sent || window.confirm('This item was already sent to the kitchen. Void it?')) s.removeLine(order.id, l.lineId); }}><Trash2 size={12} /> {l.sent ? 'void' : 'remove'}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-stone-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm">
            <Row k={`Subtotal${data.settings.taxInclusive ? ' (excl. tax)' : ''}`} v={inr(totals.sub)} />
            {totals.disc > 0 && <Row k="Discount" v={'-' + inr(totals.disc)} />}
            {totals.sc > 0 && <Row k={`Service charge ${data.settings.serviceCharge}%`} v={inr(totals.sc)} />}
            <Row k="CGST + SGST" v={inr(totals.tax)} />
            <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-xl font-bold"><span>Total</span><span className="text-orange-600">{inr(totals.total)}</span></div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Btn variant="dark" onClick={sendKOT} disabled={!unsent}><ChefHat size={16} /> Send KOT</Btn>
              <Btn variant="ghost" onClick={printBill} disabled={!order.items.length}><Printer size={16} /> Print Bill</Btn>
              <Btn variant="green" className="col-span-2" size="lg" onClick={() => setSettleOpen(true)} disabled={!order.items.length}>Settle · {inr(totals.total)}</Btn>
            </div>
            {unsent && <div className="text-center text-xs text-orange-600">Some items are not sent to the kitchen yet</div>}
            <button onClick={cancel} className="w-full pt-1 text-center text-xs text-stone-400 hover:text-red-600">Cancel order</button>
          </div>
        </Card>
      </div>

      {/* Mobile floating cart bar */}
      {!cartOpen && order.items.length > 0 && (
        <button onClick={() => setCartOpen(true)} className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between rounded-2xl bg-orange-600 px-4 py-3.5 text-white shadow-lg shadow-orange-900/20 lg:hidden">
          <span className="flex items-center gap-2 font-semibold"><ShoppingBag size={18} /> {totals.qty} item{totals.qty > 1 ? 's' : ''} · {label}</span>
          <span className="font-bold">{inr(totals.total)} ›</span>
        </button>
      )}

      {noteFor && <NoteModal line={noteFor} onClose={() => setNoteFor(null)} onSave={(t) => { s.setNote(order.id, noteFor.lineId, t); setNoteFor(null); }} />}
      {moveOpen && <MoveModal order={order} onClose={() => setMoveOpen(false)} />}
      {settleOpen && <SettleModal order={order} table={table} onClose={() => setSettleOpen(false)} onDone={() => { setSettleOpen(false); setCartOpen(false); go('tables'); }} />}
    </div>
  );
}

const Row = ({ k, v }) => <div className="flex justify-between text-stone-600"><span>{k}</span><span>{v}</span></div>;

function NoteModal({ line, onClose, onSave }) {
  const [t, setT] = useState(line.note || '');
  const quick = ['Less spicy', 'Extra spicy', 'No onion', 'No garlic', 'Jain', 'Less oil', 'Pack separately'];
  return (
    <Modal title={`Note · ${line.name}`} onClose={onClose} footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={() => onSave(t)}>Save</Btn></>}>
      <input autoFocus className={inputCls} value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. less spicy" />
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((x) => <button key={x} className="rounded-full bg-stone-100 px-3 py-1.5 text-xs hover:bg-orange-100" onClick={() => setT(x)}>{x}</button>)}
      </div>
    </Modal>
  );
}

function MoveModal({ order, onClose }) {
  const s = useStore();
  const { data } = s;
  const busy = new Set(data.orders.filter((o) => o.status === 'open' && o.tableId && o.id !== order.id).map((o) => o.tableId));
  const free = data.tables.filter((t) => !busy.has(t.id) && t.id !== order.tableId);
  return (
    <Modal title="Move to another table" onClose={onClose}>
      {free.length === 0 && <Empty>No free tables</Empty>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {free.map((t) => (
          <button key={t.id} className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-center hover:bg-emerald-100" onClick={() => { s.moveTable(order.id, t.id); onClose(); }}>
            <div className="text-lg font-bold">{t.name}</div><div className="text-[11px] text-stone-500">{t.section}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function SettleModal({ order, table, onClose, onDone }) {
  const s = useStore();
  const { data } = s;
  const st = data.settings;
  const [disc, setDisc] = useState(order.discount || { type: 'pct', value: 0 });
  const [scOff, setScOff] = useState(!!order.scOff);
  const [pay, setPay] = useState({ cash: '', upi: '', card: '' });
  const [customerId, setCustomerId] = useState('');
  const [guest, setGuest] = useState(order.guest || {});
  const [split, setSplit] = useState(1);
  const [qr, setQr] = useState('');
  const [redeemPts, setRedeemPts] = useState('');

  const cust = data.customers.find((c) => c.id === customerId);
  const base0 = calcTotals({ ...order, discount: disc, scOff }, st);
  const rv = st.redeemValue || 1;
  const maxPts = st.loyaltyOn && cust ? Math.max(0, Math.min(cust.points, Math.floor((base0.sub - base0.disc) / rv))) : 0;
  const pts = Math.min(Math.max(+redeemPts || 0, 0), maxPts);
  const redeem = pts * rv;
  const t = calcTotals({ ...order, discount: disc, scOff, redeem }, st);
  const paid = ['cash', 'upi', 'card'].reduce((a, k) => a + (Number(pay[k]) || 0), 0);
  const remaining = Math.round((t.total - paid) * 100) / 100;
  const canCredit = !!(customerId || guest.phone);
  const change = remaining < 0 ? -remaining : 0;
  const upiDue = Math.max(0, t.total - (Number(pay.cash) || 0) - (Number(pay.card) || 0));

  useEffect(() => {
    if (!st.upiId || upiDue <= 0) { setQr(''); return; }
    QRCode.toDataURL(upiLink(st, upiDue, 'Bill ' + order.no), { margin: 1, width: 200 }).then(setQr).catch(() => setQr(''));
  }, [st.upiId, st.name, upiDue, order.no]);

  const fill = (k) => setPay({ cash: '', upi: '', card: '', [k]: String(t.total) });

  const confirm = () => {
    const payments = ['cash', 'upi', 'card'].filter((k) => Number(pay[k]) > 0).map((k) => {
      let amt = Number(pay[k]);
      if (k === 'cash' && change > 0) amt = Math.max(0, amt - change);
      return { mode: k, amount: amt };
    });
    const due = remaining > 0.5 ? remaining : 0;
    const final = { payments, discount: disc, due, customerId: customerId || null, scOff, guest, redeem };
    s.settle(order.id, final);
    if (st.autoPrintBill) {
      const hasCash = payments.some((p) => p.mode === 'cash');
      printReceipt({ ...order, ...final, billNo: s.get().counters.bill - 1, paidAt: Date.now() }, st, table?.name, t, { kick: hasCash });
    }
    onDone();
  };

  return (
    <Modal
      title={`Settle · ${order.type === 'dine' ? 'Table ' + (table?.name || '') : order.type === 'take' ? 'Takeaway' : 'Delivery'} #${order.no}`}
      onClose={onClose}
      wide
      footer={<><Btn variant="ghost" onClick={onClose}>Back</Btn><Btn variant="green" disabled={paid === 0 && !canCredit || (remaining > 0.5 && !canCredit)} onClick={confirm}>Confirm & Print</Btn></>}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Discount">
              <select className={inputCls} value={disc.type} onChange={(e) => setDisc({ ...disc, type: e.target.value })}><option value="pct">% off</option><option value="amt">₹ off</option></select>
            </Field>
            <Field label="Value" className="col-span-2"><input type="number" min="0" className={inputCls} value={disc.value || ''} onChange={(e) => setDisc({ ...disc, value: +e.target.value })} /></Field>
          </div>
          {order.type === 'dine' && st.serviceCharge > 0 && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scOff} onChange={(e) => setScOff(e.target.checked)} /> Waive service charge</label>
          )}
          <Field label="Customer (loyalty / credit)">
            <select className={inputCls} value={customerId} onChange={(e) => { setCustomerId(e.target.value); setRedeemPts(''); }}>
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
          {cust?.due > 0 && <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">{cust.name} has an old due of {inr(cust.due)}</div>}
          {maxPts > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-2.5 text-sm">
              <span className="flex-1 text-orange-800">⭐ {cust.points} points (₹{cust.points * rv}) — redeem</span>
              <input type="number" min="0" max={maxPts} className={inputCls + ' !w-20 !py-1.5 text-center'} value={redeemPts} onChange={(e) => setRedeemPts(e.target.value)} placeholder="0" />
              <button className="text-xs font-semibold text-orange-700" onClick={() => setRedeemPts(String(maxPts))}>Max</button>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-2.5 text-sm">
            <span className="text-stone-500">Split equally between</span>
            <input type="number" min="1" className={inputCls + ' !w-16 !py-1.5 text-center'} value={split} onChange={(e) => setSplit(Math.max(1, +e.target.value || 1))} />
            {split > 1 && <b className="text-orange-600">{inr(Math.ceil(t.total / split))} each</b>}
          </div>
        </div>

        <div>
          <div className="mb-3 rounded-2xl bg-stone-50 p-3.5 text-sm">
            <Row k="Subtotal" v={inr(t.sub)} />
            {t.disc > 0 && <Row k="Discount" v={'-' + inr(t.disc)} />}
            {t.redeem > 0 && <Row k="Loyalty points" v={'-' + inr(t.redeem)} />}
            {t.sc > 0 && <Row k="Service charge" v={inr(t.sc)} />}
            <Row k="GST (CGST+SGST)" v={inr(t.tax)} />
            {Math.abs(t.round) > 0.004 && <Row k="Round off" v={t.round.toFixed(2)} />}
            <div className="mt-1 flex justify-between border-t border-stone-200 pt-1.5 text-xl font-bold"><span>Payable</span><span className="text-orange-600">{inr(t.total)}</span></div>
          </div>
          {[['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card']].map(([k, n]) => (
            <div key={k} className="mb-2 flex items-center gap-2">
              <span className="w-12 text-sm font-medium">{n}</span>
              <input type="number" min="0" inputMode="decimal" className={inputCls} value={pay[k]} onChange={(e) => setPay({ ...pay, [k]: e.target.value })} placeholder="0" />
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
          {qr && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-stone-200 p-3">
              <img src={qr} alt="UPI QR" className="h-28 w-28 rounded-lg" />
              <div className="text-sm"><div className="font-semibold">Scan to pay {inr(upiDue)}</div><div className="text-xs text-stone-500">{st.upiId}</div><div className="mt-1 text-xs text-stone-400">Any UPI app · then tap UPI → Full</div></div>
            </div>
          )}
          {!st.upiId && <div className="mt-3 text-xs text-stone-400">Tip: add your UPI ID in Settings to show a payment QR here.</div>}
        </div>
      </div>
    </Modal>
  );
}
