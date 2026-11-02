import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Btn, Card, Field, Modal, PageHeader, Table, VegDot, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { inr, printHTML, uid } from '../utils.js';
import CsvImport from '../CsvImport.jsx';
import { saveSnap } from '../backup.js';
import { toast } from '../toast.js';

export default function MenuPage() {
  const s = useStore();
  const { data } = s;
  const [edit, setEdit] = useState(null);
  const [catEdit, setCatEdit] = useState(false);
  const [filter, setFilter] = useState('all');
  const [imp, setImp] = useState(false);

  const costOf = (m) => (m.recipe || []).reduce((a, r) => a + r.qty * (data.ingredients.find((i) => i.id === r.ingId)?.cost || 0), 0);
  const list = data.menu.filter((m) => filter === 'all' || m.catId === filter);

  return (
    <>
      <PageHeader title="Menu" sub={`${data.menu.length} dishes · set price, GST and recipe for auto stock deduction`}>
        <Btn variant="ghost" onClick={() => setImp(true)}>Import CSV</Btn>
        <Btn variant="ghost" onClick={() => printMenuCard(data)}>Print menu card</Btn>
        <Btn variant="ghost" onClick={() => setCatEdit(true)}>Categories</Btn>
        <Btn onClick={() => setEdit({ id: uid('m'), name: '', catId: data.categories[0]?.id || '', price: 0, veg: true, gst: 5, available: true, recipe: [] })}><Plus size={16} /> Add Dish</Btn>
      </PageHeader>

      <div className="mb-3 flex gap-2 overflow-x-auto">
        {[{ id: 'all', name: 'All' }, ...data.categories].map((c) => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${filter === c.id ? 'bg-stone-800 text-white' : 'border border-stone-200 bg-white'}`}>{c.name}</button>
        ))}
      </div>

      <Card>
        <Table head={['Dish', 'Category', { t: 'Price', cls: 'text-right' }, { t: 'GST', cls: 'text-right' }, { t: 'Food cost', cls: 'text-right' }, { t: 'Margin', cls: 'text-right' }, 'Available', '']}>
          {list.map((m) => {
            const c = costOf(m);
            const margin = m.price ? ((m.price - c) / m.price) * 100 : 0;
            return (
              <tr key={m.id} className="hover:bg-stone-50">
                <td className="px-3 py-2"><span className="flex items-center gap-2"><VegDot veg={m.veg} />{m.name}</span></td>
                <td className="px-3 py-2 text-stone-500">{data.categories.find((x) => x.id === m.catId)?.name}</td>
                <td className="px-3 py-2 text-right font-medium">{inr(m.price)}</td>
                <td className="px-3 py-2 text-right">{m.gst}%</td>
                <td className="px-3 py-2 text-right text-stone-500">{m.recipe?.length ? inr(c.toFixed(1)) : '—'}</td>
                <td className="px-3 py-2 text-right">{m.recipe?.length ? <Badge tone={margin > 55 ? 'green' : margin > 35 ? 'yellow' : 'red'}>{margin.toFixed(0)}%</Badge> : '—'}</td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={m.available} onChange={() => s.save('menu', { ...m, available: !m.available })} />
                </td>
                <td className="px-3 py-2 text-right">
                  <button className="p-1 text-stone-500 hover:text-orange-600" onClick={() => setEdit(structuredClone(m))}><Pencil size={16} /></button>
                  <button className="p-1 text-stone-500 hover:text-red-600" onClick={() => window.confirm(`Delete ${m.name}?`) && s.del('menu', m.id)}><Trash2 size={16} /></button>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {imp && (
        <CsvImport
          title="Import menu"
          columns={[{ key: 'name' }, { key: 'category' }, { key: 'price' }, { key: 'veg', aliases: ['type'] }, { key: 'gst', aliases: ['tax'] }]}
          sample={[['Paneer Tikka', 'Starters', '260', 'veg', '5'], ['Chicken Biryani', 'Rice & Biryani', '300', 'nonveg', '5']]}
          validate={(r) => (!r.name ? 'name missing' : !(+r.price > 0) ? 'price invalid' : r.gst !== '' && ![0, 5, 12, 18, 28].includes(+r.gst) ? 'gst must be 0/5/12/18/28' : '')}
          replaceLabel="Replace my whole current menu (a safety backup is taken first)"
          onClose={() => setImp(false)}
          onImport={async (rows, replace) => {
            if (replace) await saveSnap(s.get(), 'pre-reset');
            s.update((d) => {
              if (replace) { d.menu = []; d.categories = []; }
              rows.forEach((r) => {
                const cn = r.category || 'General';
                let c = d.categories.find((x) => x.name.toLowerCase() === cn.toLowerCase());
                if (!c) { c = { id: uid('c'), name: cn }; d.categories.push(c); }
                const veg = !['n', 'no', 'nonveg', 'non-veg', 'non veg', 'false', '0', 'nv'].includes(r.veg.toLowerCase());
                d.menu.push({ id: uid('m'), name: r.name, catId: c.id, price: +r.price, veg, gst: r.gst === '' ? 5 : +r.gst, available: true, recipe: [] });
              });
            });
            toast(`${rows.length} dishes imported`, 'ok');
          }}
        />
      )}
      {edit && <DishModal dish={edit} onClose={() => setEdit(null)} />}
      {catEdit && <CategoryModal onClose={() => setCatEdit(false)} />}
    </>
  );
}

function DishModal({ dish, onClose }) {
  const s = useStore();
  const { data } = s;
  const [m, setM] = useState(dish);
  const set = (p) => setM({ ...m, ...p });
  const setRecipe = (i, p) => set({ recipe: m.recipe.map((r, x) => (x === i ? { ...r, ...p } : r)) });
  const cost = m.recipe.reduce((a, r) => a + (Number(r.qty) || 0) * (data.ingredients.find((i) => i.id === r.ingId)?.cost || 0), 0);
  const ok = m.name.trim() && m.catId && m.price > 0;

  return (
    <Modal
      title={data.menu.some((x) => x.id === m.id) ? 'Edit Dish' : 'Add Dish'}
      onClose={onClose}
      wide
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn disabled={!ok} onClick={() => { s.save('menu', { ...m, name: m.name.trim(), price: +m.price, gst: +m.gst, recipe: m.recipe.filter((r) => r.ingId && +r.qty > 0).map((r) => ({ ingId: r.ingId, qty: +r.qty })) }); onClose(); }}>Save</Btn></>}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Name" className="col-span-2"><input className={inputCls} value={m.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Category" className="col-span-2">
          <select className={inputCls} value={m.catId} onChange={(e) => set({ catId: e.target.value })}>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Price (₹)"><input type="number" min="0" className={inputCls} value={m.price} onChange={(e) => set({ price: e.target.value })} /></Field>
        <Field label="GST %">
          <select className={inputCls} value={m.gst} onChange={(e) => set({ gst: +e.target.value })}>
            {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className={inputCls} value={m.veg ? 'v' : 'n'} onChange={(e) => set({ veg: e.target.value === 'v' })}>
            <option value="v">Veg</option><option value="n">Non-veg</option>
          </select>
        </Field>
        <Field label="Available">
          <select className={inputCls} value={m.available ? 'y' : 'n'} onChange={(e) => set({ available: e.target.value === 'y' })}>
            <option value="y">Yes</option><option value="n">No (sold out)</option>
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold">Recipe <span className="text-xs font-normal text-stone-500">(stock deducted per serving when KOT is sent)</span></h4>
          <Btn size="sm" variant="soft" onClick={() => set({ recipe: [...m.recipe, { ingId: data.ingredients[0]?.id, qty: 0 }] })}><Plus size={14} /> Ingredient</Btn>
        </div>
        {m.recipe.map((r, i) => {
          const ing = data.ingredients.find((x) => x.id === r.ingId);
          return (
            <div key={i} className="mb-2 flex items-center gap-2">
              <select className={inputCls} value={r.ingId} onChange={(e) => setRecipe(i, { ingId: e.target.value })}>
                {data.ingredients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <input type="number" step="any" min="0" className={inputCls + ' max-w-[110px]'} value={r.qty} onChange={(e) => setRecipe(i, { qty: e.target.value })} />
              <span className="w-8 text-xs text-stone-500">{ing?.unit}</span>
              <button className="p-1 text-stone-400 hover:text-red-600" onClick={() => set({ recipe: m.recipe.filter((_, x) => x !== i) })}><Trash2 size={16} /></button>
            </div>
          );
        })}
        {m.recipe.length > 0 && <div className="text-sm text-stone-600">Estimated food cost: <b>{inr(cost.toFixed(1))}</b> · Margin: <b>{m.price > 0 ? (((m.price - cost) / m.price) * 100).toFixed(0) : 0}%</b></div>}
      </div>
    </Modal>
  );
}

function CategoryModal({ onClose }) {
  const s = useStore();
  const { data } = s;
  const [name, setName] = useState('');
  return (
    <Modal title="Menu Categories" onClose={onClose}>
      <div className="mb-4 flex gap-2">
        <input className={inputCls} placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <Btn disabled={!name.trim()} onClick={() => { s.save('categories', { id: uid('c'), name: name.trim() }); setName(''); }}>Add</Btn>
      </div>
      {data.categories.map((c) => {
        const used = data.menu.filter((m) => m.catId === c.id).length;
        return (
          <div key={c.id} className="flex items-center gap-2 border-b border-stone-100 py-2">
            <input className={inputCls} value={c.name} onChange={(e) => s.save('categories', { ...c, name: e.target.value })} />
            <span className="w-16 text-xs text-stone-500">{used} dishes</span>
            <button disabled={used > 0} className="p-1 text-stone-400 hover:text-red-600 disabled:opacity-30" title={used ? 'Move dishes first' : 'Delete'} onClick={() => s.del('categories', c.id)}><Trash2 size={16} /></button>
          </div>
        );
      })}
    </Modal>
  );
}

function printMenuCard(data) {
  const st = data.settings;
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const sections = data.categories.map((c) => {
    const items = data.menu.filter((m) => m.catId === c.id && m.available);
    if (!items.length) return '';
    return `<div class="cat"><h2>${esc(c.name)}</h2>${items.map((m) => `<div class="it"><span class="dot ${m.veg ? 'v' : 'n'}"></span><span class="nm">${esc(m.name)}</span><span class="dots"></span><b>₹${m.price}</b></div>`).join('')}</div>`;
  }).join('');
  printHTML(`<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:14mm}body{font-family:Georgia,'Times New Roman',serif;color:#222}
header{text-align:center;margin-bottom:10mm;border-bottom:2px solid #ea580c;padding-bottom:6mm}
header img{max-height:22mm;margin-bottom:3mm}header h1{margin:0;font-size:28px;letter-spacing:1px}header p{margin:2px 0;font-size:12px;color:#555}
.cols{column-count:2;column-gap:14mm}.cat{break-inside:avoid;margin-bottom:7mm}
h2{font-size:16px;text-transform:uppercase;letter-spacing:2px;color:#ea580c;border-bottom:1px solid #ddd;margin:0 0 3mm;padding-bottom:1mm}
.it{display:flex;align-items:baseline;gap:6px;margin:1.6mm 0;font-size:13px}.nm{flex:none}.dots{flex:1;border-bottom:1px dotted #aaa;transform:translateY(-3px)}
.dot{width:9px;height:9px;border:1.5px solid;display:inline-block;border-radius:2px;position:relative;top:1px}.dot.v{border-color:#16a34a}.dot.n{border-color:#dc2626}
footer{text-align:center;font-size:11px;color:#777;margin-top:6mm}
</style></head><body><header>${st.logo ? `<img src="${st.logo}">` : ''}<h1>${esc(st.name)}</h1><p>${esc(st.address || '')}</p><p>${esc(st.phone || '')}</p></header>
<div class="cols">${sections}</div><footer>${st.fssai ? 'FSSAI ' + esc(st.fssai) + ' · ' : ''}Prices in ₹ ${st.taxInclusive ? 'inclusive' : 'exclusive'} of GST</footer></body></html>`);
}
