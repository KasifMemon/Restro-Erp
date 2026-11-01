import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Btn, Card, Field, Modal, PageHeader, Table, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { dkey, inr, uid } from '../utils.js';

const ROLES = ['Owner', 'Manager', 'Chef', 'Cook', 'Cashier', 'Waiter', 'Helper', 'Delivery'];
const ST = [['P', 'Present', 'bg-emerald-600 text-white'], ['H', 'Half', 'bg-amber-500 text-white'], ['A', 'Absent', 'bg-red-600 text-white']];

export default function Staff() {
  const s = useStore();
  const { data } = s;
  const [edit, setEdit] = useState(null);
  const today = dkey(Date.now());
  const month = today.slice(0, 7);
  const dim = new Date(+today.slice(0, 4), +today.slice(5, 7), 0).getDate();
  const elapsed = +today.slice(8);

  const stats = (e) => {
    let p = 0, h = 0;
    Object.entries(e.attendance || {}).forEach(([d, v]) => { if (d.startsWith(month)) { if (v === 'P') p++; if (v === 'H') h++; } });
    const days = p + h * 0.5;
    return { days, pay: Math.round((e.salary / dim) * days) };
  };
  const payroll = data.staff.reduce((a, e) => a + e.salary, 0);

  return (
    <>
      <PageHeader title="Staff" sub={`${data.staff.length} staff · monthly payroll ${inr(payroll)}`}>
        <Btn onClick={() => setEdit({ id: uid('e'), name: '', role: 'Waiter', phone: '', salary: 0, attendance: {} })}><Plus size={16} /> Add Staff</Btn>
      </PageHeader>
      <Card>
        <Table head={['Name', 'Role', 'Phone', { t: 'Salary / mo', cls: 'text-right' }, "Today's attendance", { t: `Days (${elapsed} so far)`, cls: 'text-right' }, { t: 'Earned so far', cls: 'text-right' }, '']}>
          {data.staff.map((e) => {
            const st = stats(e);
            const cur = e.attendance?.[today];
            return (
              <tr key={e.id}>
                <td className="px-3 py-2 font-medium">{e.name}</td>
                <td className="px-3 py-2">{e.role}</td>
                <td className="px-3 py-2">{e.phone}</td>
                <td className="px-3 py-2 text-right">{inr(e.salary)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {ST.map(([k, n, c]) => (
                      <button key={k} onClick={() => s.setAttendance(e.id, today, cur === k ? null : k)} className={`rounded px-2 py-1 text-xs font-medium ${cur === k ? c : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{n}</button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">{st.days}</td>
                <td className="px-3 py-2 text-right font-medium">{inr(st.pay)}</td>
                <td className="space-x-1 px-3 py-2 text-right">
                  <Btn size="sm" variant="ghost" onClick={() => setEdit(structuredClone(e))}>Edit</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => window.confirm(`Remove ${e.name}?`) && s.del('staff', e.id)}>Remove</Btn>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {edit && (
        <Modal title="Staff member" onClose={() => setEdit(null)} footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn><Btn disabled={!edit.name.trim()} onClick={() => { s.save('staff', { ...edit, salary: +edit.salary }); setEdit(null); }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" className="col-span-2"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Role"><select className={inputCls} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Phone"><input className={inputCls} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Monthly salary (₹)" className="col-span-2"><input type="number" className={inputCls} value={edit.salary} onChange={(e) => setEdit({ ...edit, salary: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}
