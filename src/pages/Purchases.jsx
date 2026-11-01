import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Btn, Card, Field, Modal, PageHeader, Table, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { dkey, fmtDate, inr, uid } from '../utils.js';

export default function Purchases() {
  const s = useStore();
  const { data } = s;
  const [tab, setTab] = useState('purchases');
  const [pm, setPm] = useState(false);
  const [sup, setSup] = useState(null);
  const [payFor, setPayFor] = useState(null);

  return (
    <>
      <PageHeader title="Purchases & Suppliers" sub="Record stock purchases — inventory and supplier dues update automatically">
        <Btn variant="ghost" onClick={() => setSup({ id: uid('s'), name: '', phone: '', balance: 0 })}>Add Supplier</Btn>
        <Btn onClick={() => setPm(true)} disabled={!data.suppliers.length || !data.ingredients.length}><Plus size={16} /> New Purchase</Btn>
      </PageHeader>

      <div className="mb-3 flex gap-2">
        {[['purchases', 'Purchase history'], ['suppliers', 'Suppliers']].map(([k, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm ${tab === k ? 'bg-stone-800 text-white' : 'border border-stone-200 bg-white'}`}>{n}</button>
        ))}
      </div>

      {tab === 'purchases' ? (
        <Card>
          <Table head={['#', 'Date', 'Supplier', 'Items', { t: 'Total', cls: 'text-right' }, { t: 'Paid', cls: 'text-right' }, 'Status']}>
            {data.purchases.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-stone-400">No purchases recorded yet</td></tr>}
            {data.purchases.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2">{p.no}</td>
                <td className="px-3 py-2">{fmtDate(p.date)}</td>
                <td className="px-3 py-2">{data.suppliers.find((x) => x.id === p.supplierId)?.name}</td>
                <td className="px-3 py-2 text-xs text-stone-500">{p.items.map((i) => `${data.ingredients.find((x) => x.id === i.ingId)?.name} ×${i.qty}`).join(', ')}</td>
                <td className="px-3 py-2 text-right font-medium">{inr(p.total)}</td>
                <td className="px-3 py-2 text-right">{inr(p.paid)}</td>
                <td className="px-3 py-2">{p.paid >= p.total ? <Badge tone="green">Paid</Badge> : <Badge tone="red">Due {inr(p.total - p.paid)}</Badge>}</td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : (
        <Card>
          <Table head={['Supplier', 'Phone', { t: 'Outstanding', cls: 'text-right' }, '']}>
            {data.suppliers.map((x) => (
              <tr key={x.id}>
                <td className="px-3 py-2 font-medium">{x.name}</td>
                <td className="px-3 py-2">{x.phone}</td>
                <td className={`px-3 py-2 text-right font-medium ${x.balance > 0 ? 'text-red-600' : ''}`}>{inr(x.balance)}</td>
                <td className="space-x-2 px-3 py-2 text-right">
                  <Btn size="sm" variant="soft" disabled={x.balance <= 0} onClick={() => setPayFor({ s: x, amt: x.balance })}>Pay</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setSup({ ...x })}>Edit</Btn>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {pm && <PurchaseModal onClose={() => setPm(false)} />}
      {sup && (
        <Modal title="Supplier" onClose={() => setSup(null)} footer={<><Btn variant="ghost" onClick={() => setSup(null)}>Cancel</Btn><Btn disabled={!sup.name.trim()} onClick={() => { s.save('suppliers', sup); setSup(null); }}>Save</Btn></>}>
          <div className="space-y-3">
            <Field label="Name"><input className={inputCls} value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={sup.phone} onChange={(e) => setSup({ ...sup, phone: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {payFor && (
        <Modal title={`Pay ${payFor.s.name}`} onClose={() => setPayFor(null)} footer={<><Btn variant="ghost" onClick={() => setPayFor(null)}>Cancel</Btn><Btn disabled={!(+payFor.amt > 0)} onClick={() => { s.paySupplier(payFor.s.id, Math.min(+payFor.amt, payFor.s.balance)); setPayFor(null); }}>Record payment</Btn></>}>
          <Field label={`Amount (outstanding ${inr(payFor.s.balance)})`}><input type="number" className={inputCls} value={payFor.amt} onChange={(e) => setPayFor({ ...payFor, amt: e.target.value })} /></Field>
        </Modal>
      )}
    </>
  );
}

function PurchaseModal({ onClose }) {
  const s = useStore();
  const { data } = s;
  const [supplierId, setSupplierId] = useState(data.suppliers[0]?.id);
  const [date, setDate] = useState(dkey(Date.now()));
  const [rows, setRows] = useState([{ ingId: data.ingredients[0]?.id, qty: '', cost: data.ingredients[0]?.cost || 0 }]);
  const [paid, setPaid] = useState('');
  const total = rows.reduce((a, r) => a + (+r.qty || 0) * (+r.cost || 0), 0);
  const setRow = (i, p) => setRows(rows.map((r, x) => (x === i ? { ...r, ...p } : r)));
  const valid = rows.some((r) => +r.qty > 0);

  const save = () => {
    const items = rows.filter((r) => +r.qty > 0).map((r) => ({ ingId: r.ingId, qty: +r.qty, cost: +r.cost }));
    const p = paid === '' ? total : Math.min(+paid, total);
    s.addPurchase({ supplierId, date: new Date(date + 'T12:00:00').getTime(), items, total, paid: p });
    onClose();
  };

  return (
    <Modal title="New Purchase" onClose={onClose} wide footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={!valid} onClick={save}>Save purchase</Btn></>}>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="Supplier"><select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>{data.suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      {rows.map((r, i) => {
        const ing = data.ingredients.find((x) => x.id === r.ingId);
        return (
          <div key={i} className="mb-2 flex items-center gap-2">
            <select className={inputCls} value={r.ingId} onChange={(e) => setRow(i, { ingId: e.target.value, cost: data.ingredients.find((x) => x.id === e.target.value)?.cost || 0 })}>
              {data.ingredients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <input type="number" step="any" placeholder={`Qty (${ing?.unit})`} className={inputCls + ' max-w-[120px]'} value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
            <input type="number" step="any" placeholder="₹/unit" className={inputCls + ' max-w-[110px]'} value={r.cost} onChange={(e) => setRow(i, { cost: e.target.value })} />
            <span className="w-20 text-right text-sm">{inr((+r.qty || 0) * (+r.cost || 0))}</span>
            <button className="p-1 text-stone-400 hover:text-red-600" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, x) => x !== i))}><Trash2 size={16} /></button>
          </div>
        );
      })}
      <Btn size="sm" variant="soft" onClick={() => setRows([...rows, { ingId: data.ingredients[0]?.id, qty: '', cost: data.ingredients[0]?.cost || 0 }])}><Plus size={14} /> Add row</Btn>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-stone-200 pt-3">
        <Field label="Amount paid now (blank = full)" className="w-56"><input type="number" className={inputCls} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={String(total)} /></Field>
        <div className="text-right"><div className="text-xs text-stone-500">Total</div><div className="text-2xl font-bold">{inr(total)}</div></div>
      </div>
    </Modal>
  );
}
