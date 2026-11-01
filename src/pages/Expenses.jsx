import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Btn, Card, Field, Modal, PageHeader, Stat, Table, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { dkey, fmtDate, inr, uid } from '../utils.js';

export const EXP_CATS = ['Raw Material', 'Salary', 'Rent', 'Utilities', 'Gas / Fuel', 'Maintenance', 'Marketing', 'Packaging', 'Misc'];

export default function Expenses() {
  const s = useStore();
  const { data } = s;
  const [edit, setEdit] = useState(null);
  const month = dkey(Date.now()).slice(0, 7);
  const list = [...data.expenses].sort((a, b) => b.date - a.date);
  const thisMonth = list.filter((e) => dkey(e.date).startsWith(month));
  const byCat = {};
  thisMonth.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });

  return (
    <>
      <PageHeader title="Expenses" sub="Track every rupee going out">
        <Btn onClick={() => setEdit({ id: uid('x'), date: dkey(Date.now()), cat: 'Raw Material', amount: '', note: '' })}><Plus size={16} /> Add Expense</Btn>
      </PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="This month" value={inr(thisMonth.reduce((a, e) => a + e.amount, 0))} />
        {Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => <Stat key={k} label={k} value={inr(v)} />)}
      </div>
      <Card>
        <Table head={['Date', 'Category', 'Note', { t: 'Amount', cls: 'text-right' }, '']}>
          {list.map((e) => (
            <tr key={e.id}>
              <td className="px-3 py-2">{fmtDate(e.date)}</td>
              <td className="px-3 py-2">{e.cat}</td>
              <td className="px-3 py-2 text-stone-500">{e.note}</td>
              <td className="px-3 py-2 text-right font-medium">{inr(e.amount)}</td>
              <td className="px-3 py-2 text-right"><button className="p-1 text-stone-400 hover:text-red-600" onClick={() => window.confirm('Delete this expense?') && s.del('expenses', e.id)}><Trash2 size={16} /></button></td>
            </tr>
          ))}
        </Table>
      </Card>
      {edit && (
        <Modal title="Add Expense" onClose={() => setEdit(null)} footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn><Btn disabled={!(+edit.amount > 0)} onClick={() => { s.save('expenses', { ...edit, amount: +edit.amount, date: new Date(edit.date + 'T12:00:00').getTime() }); setEdit(null); }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input type="date" className={inputCls} value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
            <Field label="Category"><select className={inputCls} value={edit.cat} onChange={(e) => setEdit({ ...edit, cat: e.target.value })}>{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Amount (₹)"><input type="number" className={inputCls} value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></Field>
            <Field label="Note"><input className={inputCls} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}
