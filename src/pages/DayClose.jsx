import { useState } from 'react';
import { Badge, Btn, Card, Field, PageHeader, Stat, Table, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { dkey, fmtDT, inr } from '../utils.js';

export default function DayClose() {
  const s = useStore();
  const { data } = s;
  const [date, setDate] = useState(dkey(Date.now()));
  const closes = [...data.dayCloses].sort((a, b) => b.date.localeCompare(a.date));
  const saved = data.dayCloses.find((c) => c.date === date);
  const prev = closes.find((c) => c.date < date);

  const orders = data.orders.filter((o) => o.status === 'paid' && dkey(o.paidAt) === date);
  const by = { cash: 0, upi: 0, card: 0 };
  orders.forEach((o) => o.payments.forEach((p) => { by[p.mode] += p.amount; }));
  const credit = orders.reduce((a, o) => a + (o.due || 0), 0);
  const sales = orders.reduce((a, o) => a + o.totals.total, 0);
  const exp = data.expenses.filter((e) => dkey(e.date) === date).reduce((a, e) => a + e.amount, 0);

  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const op = opening !== '' ? +opening : saved ? saved.opening : prev ? prev.counted : 0;
  const expected = op + by.cash - exp;
  const cnt = counted !== '' ? +counted : saved ? saved.counted : null;
  const diff = cnt == null ? null : cnt - expected;

  const close = () => {
    s.save('dayCloses', { id: 'dc' + date, date, opening: op, cash: by.cash, upi: by.upi, card: by.card, credit, sales, expenses: exp, expected, counted: cnt, diff, note: note || saved?.note || '', closedAt: Date.now() });
    setCounted(''); setNote('');
  };

  return (
    <>
      <PageHeader title="Cash Register" sub="Count the drawer and close the day">
        <input type="date" className={inputCls + ' !w-44'} value={date} onChange={(e) => { setDate(e.target.value); setOpening(''); setCounted(''); }} />
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Sales" value={inr(Math.round(sales))} sub={`${orders.length} bills`} tone="text-orange-600" />
        <Stat label="Cash" value={inr(Math.round(by.cash))} />
        <Stat label="UPI" value={inr(Math.round(by.upi))} />
        <Stat label="Card" value={inr(Math.round(by.card))} />
        <Stat label="On credit" value={inr(Math.round(credit))} />
      </div>

      <Card className="mb-6 max-w-xl space-y-3 p-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Drawer for {date}</h3>{saved && <Badge tone="green">Closed {fmtDT(saved.closedAt)}</Badge>}</div>
        <Field label={`Opening cash${!saved && prev ? ` (yesterday's count: ${inr(prev.counted)})` : ''}`}>
          <input type="number" className={inputCls} placeholder={String(op)} value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
        <div className="space-y-1 rounded-xl bg-stone-50 p-3 text-sm">
          <div className="flex justify-between"><span>Opening</span><span>{inr(op)}</span></div>
          <div className="flex justify-between"><span>+ Cash sales</span><span>{inr(by.cash)}</span></div>
          <div className="flex justify-between"><span>− Expenses paid</span><span>{inr(exp)}</span></div>
          <div className="flex justify-between border-t border-stone-200 pt-1 font-bold"><span>Expected in drawer</span><span>{inr(Math.round(expected))}</span></div>
        </div>
        <Field label="Counted cash in drawer">
          <input type="number" className={inputCls} placeholder={saved ? String(saved.counted) : 'Enter counted amount'} value={counted} onChange={(e) => setCounted(e.target.value)} />
        </Field>
        {diff != null && (
          <div className={`rounded-xl p-3 text-sm font-semibold ${Math.abs(diff) < 1 ? 'bg-emerald-50 text-emerald-700' : diff > 0 ? 'bg-sky-50 text-sky-700' : 'bg-red-50 text-red-700'}`}>
            {Math.abs(diff) < 1 ? 'Drawer matches ✓' : diff > 0 ? `Excess ${inr(Math.round(diff))}` : `Short ${inr(Math.round(-diff))}`}
          </div>
        )}
        <Field label="Note"><input className={inputCls} value={note} placeholder={saved?.note || ''} onChange={(e) => setNote(e.target.value)} /></Field>
        <Btn variant="green" className="w-full" disabled={cnt == null} onClick={close}>{saved ? 'Update closing' : 'Close the day'}</Btn>
        <p className="text-xs text-stone-400">Expenses entered for the day are treated as paid from the drawer. Customer credit recoveries are not included.</p>
      </Card>

      <h3 className="mb-2 font-semibold">Closing history</h3>
      <Card>
        <Table head={['Date', { t: 'Sales', cls: 'text-right' }, { t: 'Opening', cls: 'text-right' }, { t: 'Expected', cls: 'text-right' }, { t: 'Counted', cls: 'text-right' }, { t: 'Difference', cls: 'text-right' }]}>
          {closes.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-stone-400">No closings yet</td></tr>}
          {closes.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2">{c.date}</td>
              <td className="px-3 py-2 text-right">{inr(Math.round(c.sales))}</td>
              <td className="px-3 py-2 text-right">{inr(c.opening)}</td>
              <td className="px-3 py-2 text-right">{inr(Math.round(c.expected))}</td>
              <td className="px-3 py-2 text-right">{inr(c.counted)}</td>
              <td className={`px-3 py-2 text-right font-medium ${Math.abs(c.diff) < 1 ? 'text-emerald-600' : c.diff > 0 ? 'text-sky-600' : 'text-red-600'}`}>{Math.abs(c.diff) < 1 ? '—' : (c.diff > 0 ? '+' : '') + Math.round(c.diff)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
