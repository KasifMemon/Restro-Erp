import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Btn, Card, Field, Modal, PageHeader, Table, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { inr, uid } from '../utils.js';

export default function Customers() {
  const s = useStore();
  const { data } = s;
  const [edit, setEdit] = useState(null);
  const [recv, setRecv] = useState(null);
  const [q, setQ] = useState('');

  const stats = (c) => {
    const os = data.orders.filter((o) => o.status === 'paid' && o.customerId === c.id);
    return { visits: os.length, spend: os.reduce((a, o) => a + o.totals.total, 0) };
  };
  const list = data.customers.filter((c) => (c.name + c.phone).toLowerCase().includes(q.toLowerCase()));
  const totalDue = data.customers.reduce((a, c) => a + c.due, 0);

  return (
    <>
      <PageHeader title="Customers" sub={`${data.customers.length} customers · ${inr(totalDue)} credit (udhaar) outstanding`}>
        <input className={inputCls + ' !w-52'} placeholder="Search name / phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <Btn onClick={() => setEdit({ id: uid('u'), name: '', phone: '', points: 0, due: 0 })}><Plus size={16} /> Add</Btn>
      </PageHeader>
      <Card>
        <Table head={['Name', 'Phone', { t: 'Visits', cls: 'text-right' }, { t: 'Total spend', cls: 'text-right' }, { t: 'Points', cls: 'text-right' }, { t: 'Credit due', cls: 'text-right' }, '']}>
          {list.map((c) => {
            const st = stats(c);
            return (
              <tr key={c.id} className="hover:bg-stone-50">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2">{c.phone}</td>
                <td className="px-3 py-2 text-right">{st.visits}</td>
                <td className="px-3 py-2 text-right">{inr(st.spend)}</td>
                <td className="px-3 py-2 text-right"><Badge tone="orange">{c.points} pts</Badge></td>
                <td className={`px-3 py-2 text-right font-medium ${c.due > 0 ? 'text-red-600' : ''}`}>{inr(c.due)}</td>
                <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                  <Btn size="sm" variant="soft" disabled={c.due <= 0} onClick={() => setRecv({ c, amt: c.due })}>Receive</Btn>
                  {c.due > 0 && (
                    <a
                      className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs hover:bg-stone-50"
                      target="_blank" rel="noreferrer"
                      href={`https://wa.me/91${c.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hello ${c.name}, your pending balance at ${data.settings.name} is ${inr(c.due)}. Thank you!`)}`}
                    >WhatsApp</a>
                  )}
                  <Btn size="sm" variant="ghost" onClick={() => setEdit({ ...c })}>Edit</Btn>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      <p className="mt-2 text-xs text-stone-500">Loyalty: customers earn 1 point per ₹100 billed. Credit appears when a bill is settled with part/full amount left unpaid.</p>

      {edit && (
        <Modal title="Customer" onClose={() => setEdit(null)} footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn><Btn disabled={!edit.name.trim()} onClick={() => { s.save('customers', edit); setEdit(null); }}>Save</Btn></>}>
          <div className="space-y-3">
            <Field label="Name"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {recv && (
        <Modal title={`Receive payment — ${recv.c.name}`} onClose={() => setRecv(null)} footer={<><Btn variant="ghost" onClick={() => setRecv(null)}>Cancel</Btn><Btn variant="green" disabled={!(+recv.amt > 0)} onClick={() => { s.receiveDue(recv.c.id, +recv.amt); setRecv(null); }}>Receive</Btn></>}>
          <Field label={`Amount (due ${inr(recv.c.due)})`}><input type="number" className={inputCls} value={recv.amt} onChange={(e) => setRecv({ ...recv, amt: e.target.value })} /></Field>
        </Modal>
      )}
    </>
  );
}
