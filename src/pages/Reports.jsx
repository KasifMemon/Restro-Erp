import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Btn, Card, PageHeader, Stat, Table, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { DAY, dkey, downloadCSV, fmtDT, inr, startOfDay } from '../utils.js';

const PRESETS = [['today', 'Today', 0], ['7d', 'Last 7 days', 6], ['30d', 'Last 30 days', 29]];

export default function Reports() {
  const { data } = useStore();
  const [preset, setPreset] = useState('7d');
  const [from, setFrom] = useState(dkey(Date.now() - 6 * DAY));
  const [to, setTo] = useState(dkey(Date.now()));

  const pick = (k, back) => { setPreset(k); setFrom(dkey(startOfDay(Date.now()) - back * DAY)); setTo(dkey(Date.now())); };

  const r = useMemo(() => {
    const orders = data.orders.filter((o) => o.status === 'paid' && dkey(o.paidAt) >= from && dkey(o.paidAt) <= to);
    const sum = (f) => orders.reduce((a, o) => a + f(o), 0);
    const byDay = {}, byItem = {}, byCat = {}, byPay = {}, byType = {}, gst = {};
    let foodCost = 0;
    const costOf = (itemId) => {
      const m = data.menu.find((x) => x.id === itemId);
      return (m?.recipe || []).reduce((a, x) => a + x.qty * (data.ingredients.find((i) => i.id === x.ingId)?.cost || 0), 0);
    };
    orders.forEach((o) => {
      const k = dkey(o.paidAt);
      byDay[k] = (byDay[k] || 0) + o.totals.total;
      byType[o.type] = (byType[o.type] || 0) + o.totals.total;
      o.payments.forEach((p) => { byPay[p.mode] = (byPay[p.mode] || 0) + p.amount; });
      if (o.due) byPay.credit = (byPay.credit || 0) + o.due;
      const ratio = o.totals.sub ? o.totals.taxable / o.totals.sub : 1;
      o.items.forEach((l) => {
        const base = l.price * l.qty;
        byItem[l.name] = byItem[l.name] || { qty: 0, amt: 0 };
        byItem[l.name].qty += l.qty; byItem[l.name].amt += base;
        const cn = data.categories.find((c) => c.id === l.catId)?.name || 'Other';
        byCat[cn] = (byCat[cn] || 0) + base * ratio;
        foodCost += costOf(l.itemId) * l.qty;
      });
      Object.entries(o.totals.taxByRate || {}).forEach(([rate, v]) => {
        gst[rate] = gst[rate] || { taxable: 0, tax: 0 };
        gst[rate].taxable += v.taxable; gst[rate].tax += v.tax;
      });
    });
    const exp = data.expenses.filter((e) => dkey(e.date) >= from && dkey(e.date) <= to);
    // days list for chart
    const days = [];
    for (let t = new Date(from + 'T00:00:00').getTime(); dkey(t) <= to && days.length < 120; t += DAY) days.push({ day: dkey(t).slice(5), sales: Math.round(byDay[dkey(t)] || 0) });
    return {
      orders, total: sum((o) => o.totals.total), taxable: sum((o) => o.totals.taxable), tax: sum((o) => o.totals.tax),
      disc: sum((o) => o.totals.disc), sc: sum((o) => o.totals.sc), byItem, byCat, byPay, byType, gst, foodCost,
      expenses: exp.reduce((a, e) => a + e.amount, 0), expList: exp, days,
    };
  }, [data, from, to]);

  const items = Object.entries(r.byItem).sort((a, b) => b[1].amt - a[1].amt);
  const profit = r.taxable - r.foodCost - r.expenses;

  const exportSales = () =>
    downloadCSV(`sales-${from}-to-${to}.csv`, [
      ['Bill No', 'Order No', 'Date/Time', 'Type', 'Table', 'Subtotal', 'Discount', 'Service Charge', 'CGST', 'SGST', 'Round Off', 'Total', 'Payment', 'Credit Due'],
      ...r.orders.map((o) => [o.billNo, o.no, fmtDT(o.paidAt), o.type, data.tables.find((t) => t.id === o.tableId)?.name || '', o.totals.sub.toFixed(2), o.totals.disc.toFixed(2), o.totals.sc.toFixed(2), o.totals.cgst.toFixed(2), o.totals.sgst.toFixed(2), o.totals.round.toFixed(2), o.totals.total, o.payments.map((p) => p.mode + ':' + p.amount).join(' | '), o.due || 0]),
    ]);
  const exportItems = () => downloadCSV(`item-sales-${from}-to-${to}.csv`, [['Item', 'Qty', 'Amount'], ...items.map(([n, v]) => [n, v.qty, v.amt])]);
  const exportGST = () => downloadCSV(`gst-${from}-to-${to}.csv`, [['GST %', 'Taxable Value', 'CGST', 'SGST', 'Total Tax'], ...Object.entries(r.gst).map(([k, v]) => [k, v.taxable.toFixed(2), (v.tax / 2).toFixed(2), (v.tax / 2).toFixed(2), v.tax.toFixed(2)])]);

  return (
    <>
      <PageHeader title="Reports" sub="Sales, GST, item performance and profit estimate">
        {PRESETS.map(([k, n, b]) => (
          <button key={k} onClick={() => pick(k, b)} className={`rounded-lg px-3 py-2 text-sm ${preset === k ? 'bg-stone-800 text-white' : 'border border-stone-300 bg-white'}`}>{n}</button>
        ))}
        <input type="date" className={inputCls + ' !w-40'} value={from} onChange={(e) => { setPreset('custom'); setFrom(e.target.value); }} />
        <span className="text-stone-400">to</span>
        <input type="date" className={inputCls + ' !w-40'} value={to} onChange={(e) => { setPreset('custom'); setTo(e.target.value); }} />
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Net sales (bill total)" value={inr(Math.round(r.total))} sub={`${r.orders.length} bills`} tone="text-orange-600" />
        <Stat label="GST collected" value={inr(Math.round(r.tax))} />
        <Stat label="Discounts given" value={inr(Math.round(r.disc))} />
        <Stat label="Expenses" value={inr(Math.round(r.expenses))} />
        <Stat label="Est. profit" value={inr(Math.round(profit))} sub="sales(ex-GST) − food cost − expenses" tone={profit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
      </div>

      <Card className="mb-4 p-4">
        <h3 className="mb-3 font-semibold">Sales by day</h3>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={r.days}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip formatter={(v) => inr(v)} />
              <Bar dataKey="sales" fill="#ea580c" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Mini title="By payment mode" obj={r.byPay} />
        <Mini title="By order type" obj={r.byType} map={{ dine: 'Dine-in', take: 'Takeaway', delivery: 'Delivery' }} />
        <Mini title="By category (ex-GST)" obj={r.byCat} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between p-4 pb-0"><h3 className="font-semibold">Item-wise sales</h3><Btn size="sm" variant="ghost" onClick={exportItems}>CSV</Btn></div>
          <Table head={['Item', { t: 'Qty', cls: 'text-right' }, { t: 'Amount', cls: 'text-right' }]}>
            {items.slice(0, 15).map(([n, v]) => <tr key={n}><td className="px-3 py-1.5">{n}</td><td className="px-3 py-1.5 text-right">{v.qty}</td><td className="px-3 py-1.5 text-right">{inr(v.amt)}</td></tr>)}
          </Table>
        </Card>
        <Card>
          <div className="flex items-center justify-between p-4 pb-0"><h3 className="font-semibold">GST summary</h3><Btn size="sm" variant="ghost" onClick={exportGST}>CSV</Btn></div>
          <Table head={['Rate', { t: 'Taxable', cls: 'text-right' }, { t: 'CGST', cls: 'text-right' }, { t: 'SGST', cls: 'text-right' }]}>
            {Object.entries(r.gst).map(([k, v]) => <tr key={k}><td className="px-3 py-1.5">{k}%</td><td className="px-3 py-1.5 text-right">{inr(v.taxable.toFixed(2))}</td><td className="px-3 py-1.5 text-right">{inr((v.tax / 2).toFixed(2))}</td><td className="px-3 py-1.5 text-right">{inr((v.tax / 2).toFixed(2))}</td></tr>)}
          </Table>
          <div className="space-y-1 border-t border-stone-100 p-4 text-sm">
            <div className="flex justify-between"><span>Service charge collected</span><b>{inr(Math.round(r.sc))}</b></div>
            <div className="flex justify-between"><span>Estimated food cost (recipes)</span><b>{inr(Math.round(r.foodCost))}</b></div>
          </div>
        </Card>
      </div>

      <div className="mt-4 flex gap-2"><Btn onClick={exportSales}>Download sales register (CSV)</Btn></div>
    </>
  );
}

function Mini({ title, obj, map = {} }) {
  const rows = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const tot = rows.reduce((a, [, v]) => a + v, 0) || 1;
  return (
    <Card className="p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      {rows.length === 0 && <div className="text-sm text-stone-400">No data</div>}
      {rows.map(([k, v]) => (
        <div key={k} className="mb-2">
          <div className="flex justify-between text-sm"><span className="capitalize">{map[k] || k}</span><b>{inr(Math.round(v))}</b></div>
          <div className="h-1.5 rounded bg-stone-100"><div className="h-1.5 rounded bg-orange-500" style={{ width: (v / tot) * 100 + '%' }} /></div>
        </div>
      ))}
    </Card>
  );
}
