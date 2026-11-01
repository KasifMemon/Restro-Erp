import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Btn, Card, Empty, PageHeader, Stat, Badge } from '../components.jsx';
import { useStore } from '../store.jsx';
import { DAY, dkey, inr, startOfDay, calcTotals } from '../utils.js';

export default function Dashboard({ go }) {
  const { data } = useStore();
  const paid = useMemo(() => data.orders.filter((o) => o.status === 'paid'), [data.orders]);
  const today = dkey(Date.now());
  const todays = paid.filter((o) => dkey(o.paidAt) === today);
  const sales = todays.reduce((a, o) => a + o.totals.total, 0);
  const avg = todays.length ? sales / todays.length : 0;
  const open = data.orders.filter((o) => o.status === 'open');
  const openValue = open.reduce((a, o) => a + calcTotals(o, data.settings).total, 0);
  const expToday = data.expenses.filter((e) => dkey(e.date) === today).reduce((a, e) => a + e.amount, 0);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const k = dkey(startOfDay(Date.now()) - i * DAY);
    days.push({ day: k.slice(5), sales: Math.round(paid.filter((o) => dkey(o.paidAt) === k).reduce((a, o) => a + o.totals.total, 0)) });
  }

  const top = useMemo(() => {
    const m = {};
    paid.filter((o) => Date.now() - o.paidAt < 7 * DAY).forEach((o) => o.items.forEach((l) => { m[l.name] = (m[l.name] || 0) + l.qty; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [paid]);

  const modes = {};
  todays.forEach((o) => o.payments.forEach((p) => { modes[p.mode] = (modes[p.mode] || 0) + p.amount; }));
  const low = data.ingredients.filter((i) => i.stock <= i.min);
  const kotPending = data.kots.filter((k) => k.status !== 'served').length;

  return (
    <>
      <PageHeader title="Dashboard" sub={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}>
        <Btn onClick={() => go('tables')}>Open Tables</Btn>
        <Btn variant="dark" onClick={() => go('kitchen')}>Kitchen ({kotPending})</Btn>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Today's Sales" value={inr(sales)} sub={`${todays.length} bills`} tone="text-orange-600" />
        <Stat label="Avg. Bill" value={inr(avg)} />
        <Stat label="Running Orders" value={open.length} sub={inr(openValue) + ' pending'} />
        <Stat label="Today's Expenses" value={inr(expToday)} />
        <Stat label="Low Stock Items" value={low.length} tone={low.length ? 'text-red-600' : 'text-emerald-600'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Last 7 days sales</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => inr(v)} />
                <Bar dataKey="sales" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Top sellers (7 days)</h3>
          {top.length === 0 && <Empty>No sales yet</Empty>}
          {top.map(([n, q], i) => (
            <div key={n} className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm last:border-0">
              <span>{i + 1}. {n}</span><Badge tone="orange">{q} sold</Badge>
            </div>
          ))}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Today by payment mode</h3>
          {Object.keys(modes).length === 0 && <Empty>No payments yet today</Empty>}
          {Object.entries(modes).map(([m, v]) => (
            <div key={m} className="flex justify-between border-b border-stone-100 py-1.5 text-sm last:border-0">
              <span className="uppercase">{m}</span><b>{inr(v)}</b>
            </div>
          ))}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Low stock alerts</h3>
          {low.length === 0 && <Empty>All ingredients are above minimum level 🎉</Empty>}
          <div className="grid gap-2 sm:grid-cols-2">
            {low.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm">
                <span>{i.name}</span>
                <span className="font-semibold text-red-700">{i.stock} {i.unit} <span className="font-normal text-red-400">(min {i.min})</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
