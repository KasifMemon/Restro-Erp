import { useState } from 'react';
import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Badge, Btn, Card, Field, Modal, PageHeader, Stat, Table, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { fmtDT, inr, uid } from '../utils.js';
import CsvImport from '../CsvImport.jsx';
import { toast } from '../toast.js';

export default function Inventory() {
  const s = useStore();
  const { data } = s;
  const [edit, setEdit] = useState(null);
  const [adj, setAdj] = useState(null);
  const [q, setQ] = useState('');
  const [imp, setImp] = useState(false);

  const list = data.ingredients.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const low = data.ingredients.filter((i) => i.stock <= i.min).length;
  const value = data.ingredients.reduce((a, i) => a + Math.max(0, i.stock) * i.cost, 0);

  return (
    <>
      <PageHeader title="Inventory" sub="Raw materials — auto-deducted using recipes when KOT is sent; auto-added on purchases">
        <input className={inputCls + ' !w-48'} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Btn variant="ghost" onClick={() => setImp(true)}>Import CSV</Btn>
        <Btn onClick={() => setEdit({ id: uid('i'), name: '', unit: 'kg', stock: 0, min: 0, cost: 0 })}><Plus size={16} /> Add Item</Btn>
      </PageHeader>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Items" value={data.ingredients.length} />
        <Stat label="Low / Out" value={low} tone={low ? 'text-red-600' : 'text-emerald-600'} />
        <Stat label="Stock value" value={inr(Math.round(value))} />
      </div>

      <Card className="mb-4">
        <Table head={['Item', { t: 'In stock', cls: 'text-right' }, { t: 'Min level', cls: 'text-right' }, { t: 'Cost / unit', cls: 'text-right' }, { t: 'Value', cls: 'text-right' }, 'Status', '']}>
          {list.map((i) => (
            <tr key={i.id} className="hover:bg-stone-50">
              <td className="px-3 py-2 font-medium">{i.name}</td>
              <td className="px-3 py-2 text-right">{i.stock} {i.unit}</td>
              <td className="px-3 py-2 text-right text-stone-500">{i.min} {i.unit}</td>
              <td className="px-3 py-2 text-right">{inr(i.cost)}</td>
              <td className="px-3 py-2 text-right">{inr(Math.round(Math.max(0, i.stock) * i.cost))}</td>
              <td className="px-3 py-2">{i.stock <= 0 ? <Badge tone="red">Out</Badge> : i.stock <= i.min ? <Badge tone="yellow">Low</Badge> : <Badge tone="green">OK</Badge>}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <button title="Adjust stock" className="p-1 text-stone-500 hover:text-orange-600" onClick={() => setAdj({ ing: i, delta: '', reason: 'Wastage' })}><SlidersHorizontal size={16} /></button>
                <button className="p-1 text-stone-500 hover:text-orange-600" onClick={() => setEdit({ ...i })}><Pencil size={16} /></button>
                <button className="p-1 text-stone-500 hover:text-red-600" onClick={() => window.confirm(`Delete ${i.name}?`) && s.del('ingredients', i.id)}><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-semibold">Recent stock movements</h3>
        {data.stockLog.length === 0 && <div className="text-sm text-stone-400">No manual adjustments or purchases yet.</div>}
        {data.stockLog.slice(0, 10).map((l) => (
          <div key={l.id} className="flex justify-between border-b border-stone-100 py-1.5 text-sm last:border-0">
            <span>{data.ingredients.find((i) => i.id === l.ingId)?.name} <span className="text-stone-400">· {l.reason}</span></span>
            <span className={l.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}>{l.delta > 0 ? '+' : ''}{l.delta} <span className="text-xs text-stone-400">{fmtDT(l.ts)}</span></span>
          </div>
        ))}
      </Card>

      {imp && (
        <CsvImport
          title="Import stock items"
          columns={[{ key: 'name' }, { key: 'unit' }, { key: 'stock', aliases: ['qty', 'quantity'] }, { key: 'min', aliases: ['minimum', 'reorder'] }, { key: 'cost', aliases: ['rate', 'price'] }]}
          sample={[['Basmati Rice', 'kg', '40', '10', '110'], ['Cooking Oil', 'l', '25', '6', '140']]}
          validate={(r) => (!r.name ? 'name missing' : r.stock !== '' && isNaN(+r.stock) ? 'stock invalid' : r.cost !== '' && isNaN(+r.cost) ? 'cost invalid' : '')}
          onClose={() => setImp(false)}
          onImport={(rows) => {
            s.update((d) => rows.forEach((r) => d.ingredients.push({ id: uid('i'), name: r.name, unit: r.unit || 'kg', stock: +r.stock || 0, min: +r.min || 0, cost: +r.cost || 0 })));
            toast(`${rows.length} items imported`, 'ok');
          }}
        />
      )}
      {edit && (
        <Modal
          title={data.ingredients.some((x) => x.id === edit.id) ? 'Edit Item' : 'Add Item'}
          onClose={() => setEdit(null)}
          footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn><Btn disabled={!edit.name.trim()} onClick={() => { s.save('ingredients', { ...edit, stock: +edit.stock, min: +edit.min, cost: +edit.cost }); setEdit(null); }}>Save</Btn></>}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" className="col-span-2"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Unit"><select className={inputCls} value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })}>{['kg', 'g', 'l', 'ml', 'pcs', 'pack'].map((u) => <option key={u}>{u}</option>)}</select></Field>
            <Field label="Cost per unit (₹)"><input type="number" className={inputCls} value={edit.cost} onChange={(e) => setEdit({ ...edit, cost: e.target.value })} /></Field>
            <Field label="Opening stock"><input type="number" className={inputCls} value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} /></Field>
            <Field label="Minimum level (alert)"><input type="number" className={inputCls} value={edit.min} onChange={(e) => setEdit({ ...edit, min: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {adj && (
        <Modal
          title={`Adjust stock — ${adj.ing.name}`}
          onClose={() => setAdj(null)}
          footer={<><Btn variant="ghost" onClick={() => setAdj(null)}>Cancel</Btn><Btn disabled={!+adj.delta} onClick={() => { s.adjustStock(adj.ing.id, +adj.delta, adj.reason); setAdj(null); }}>Apply</Btn></>}
        >
          <p className="mb-3 text-sm text-stone-500">Current: {adj.ing.stock} {adj.ing.unit}. Use a negative number to reduce.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Change (${adj.ing.unit})`}><input type="number" step="any" className={inputCls} value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} /></Field>
            <Field label="Reason">
              <select className={inputCls} value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })}>
                {['Wastage', 'Spoilage', 'Stock count correction', 'Staff meal', 'Returned to supplier', 'Other'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
