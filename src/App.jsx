import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Armchair, ReceiptText, ChefHat, UtensilsCrossed, Package, Truck, Users, UserCog, Wallet,
  BarChart3, Settings as Cog, ScrollText, CalendarClock, Banknote, MoreHorizontal, Lock as LockIcon, X,
} from 'lucide-react';
import { useStore } from './store.jsx';
import { ACCESS, ALL, canVoid } from './access.js';
import Lock from './Lock.jsx';
import Setup from './Setup.jsx';
import { autoTick } from './backup.js';
import Dashboard from './pages/Dashboard.jsx';
import Tables from './pages/Tables.jsx';
import POS from './pages/POS.jsx';
import Kitchen from './pages/Kitchen.jsx';
import Orders from './pages/Orders.jsx';
import Reservations from './pages/Reservations.jsx';
import MenuPage from './pages/MenuPage.jsx';
import Inventory from './pages/Inventory.jsx';
import Purchases from './pages/Purchases.jsx';
import Customers from './pages/Customers.jsx';
import Staff from './pages/Staff.jsx';
import Expenses from './pages/Expenses.jsx';
import DayClose from './pages/DayClose.jsx';
import Reports from './pages/Reports.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const PAGES = {
  dashboard: ['Dashboard', LayoutDashboard], tables: ['Tables', Armchair], pos: ['Billing', ReceiptText], kitchen: ['Kitchen', ChefHat],
  orders: ['Bills', ScrollText], reservations: ['Reservations', CalendarClock], menu: ['Menu', UtensilsCrossed], inventory: ['Inventory', Package],
  purchases: ['Purchases', Truck], customers: ['Customers', Users], staff: ['Staff', UserCog], expenses: ['Expenses', Wallet],
  dayclose: ['Cash Register', Banknote], reports: ['Reports', BarChart3], settings: ['Settings', Cog],
};
const GROUPS = [
  ['Operations', ['dashboard', 'tables', 'pos', 'kitchen', 'orders', 'reservations']],
  ['Back office', ['menu', 'inventory', 'purchases', 'customers', 'staff', 'expenses', 'dayclose', 'reports', 'settings']],
];
const BOTTOM = ['tables', 'pos', 'kitchen', 'orders', 'dashboard'];

function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const h = (e) => {
      const t = e.detail;
      setList((l) => [...l.slice(-2), t]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 5000);
    };
    window.addEventListener('restro-toast', h);
    return () => window.removeEventListener('restro-toast', h);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-3">
      {list.map((t) => (
        <div key={t.id} className={`sheet-in pointer-events-auto max-w-md rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${t.tone === 'warn' ? 'bg-red-600' : t.tone === 'ok' ? 'bg-emerald-600' : 'bg-stone-800'}`}>{t.msg}</div>
      ))}
    </div>
  );
}

export default function App() {
  const { data, get } = useStore();

  // automatic backups: on start, then every 10 min (only saves when something changed)
  useEffect(() => {
    try { navigator.storage?.persist?.(); } catch { /* ignore */ }
    const run = () => autoTick(get()).catch(() => {});
    const first = setTimeout(run, 4000);
    const iv = setInterval(run, 10 * 60 * 1000);
    const vis = () => { if (document.visibilityState === 'hidden') run(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearTimeout(first); clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
    // eslint-disable-next-line
  }, []);

  const [page, setPage] = useState('tables');
  const [orderId, setOrderId] = useState(null);
  const [more, setMore] = useState(false);
  const [uid, setUid] = useState(() => { try { return sessionStorage.getItem('restro-user'); } catch { return null; } });

  const lockOn = data.staff.some((s) => s.pin);
  if (!data.settings.setupDone) return <><Setup /><Toasts /></>;
  const user = data.staff.find((s) => s.id === uid);
  if (lockOn && !user) {
    return <><Toasts /><Lock staff={data.staff.filter((s) => s.pin)} name={data.settings.name} logo={data.settings.logo} onLogin={(id) => { try { sessionStorage.setItem('restro-user', id); } catch { /* ignore */ } setUid(id); setPage('tables'); }} /></>;
  }
  const role = lockOn ? user.role : 'Owner';
  const allowed = lockOn ? ACCESS[role] || ['tables'] : ALL;
  const cur = allowed.includes(page) ? page : allowed[0];
  const lock = () => { try { sessionStorage.removeItem('restro-user'); } catch { /* ignore */ } setUid(null); setMore(false); };

  const go = (p, oid) => { if (oid !== undefined) setOrderId(oid); setPage(p); setMore(false); };
  const pendingKots = data.kots.filter((k) => k.status !== 'served').length;
  const openOrders = data.orders.filter((o) => o.status === 'open').length;
  const badge = (k) => (k === 'kitchen' && pendingKots ? pendingKots : k === 'tables' && openOrders ? openOrders : 0);

  const view = {
    dashboard: <Dashboard go={go} />,
    tables: <Tables go={go} />,
    pos: <POS orderId={orderId} go={go} />,
    kitchen: <Kitchen />,
    orders: <Orders go={go} canVoid={canVoid(role) || !lockOn} />,
    reservations: <Reservations go={go} />,
    menu: <MenuPage />,
    inventory: <Inventory />,
    purchases: <Purchases />,
    customers: <Customers />,
    staff: <Staff />,
    expenses: <Expenses />,
    dayclose: <DayClose />,
    reports: <Reports />,
    settings: <SettingsPage />,
  }[cur];

  const bottom = BOTTOM.filter((k) => allowed.includes(k)).slice(0, 4);
  const rest = allowed.filter((k) => !bottom.includes(k));

  return (
    <div className="flex h-full">
      <Toasts />
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="flex items-center gap-3 px-4 py-5">
          {data.settings.logo
            ? <img src={data.settings.logo} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-stone-200 bg-white object-contain" />
            : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm"><UtensilsCrossed size={20} /></div>}
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{data.settings.name}</div>
            <div className="text-[11px] text-stone-400">RestroERP</div>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {GROUPS.map(([g, keys]) => {
            const ks = keys.filter((k) => allowed.includes(k));
            if (!ks.length) return null;
            return (
              <div key={g}>
                <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">{g}</div>
                {ks.map((k) => {
                  const [n, Icon] = PAGES[k];
                  return (
                    <button key={k} onClick={() => go(k)} className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${cur === k ? 'bg-orange-50 font-semibold text-orange-700' : 'text-stone-600 hover:bg-stone-50'}`}>
                      <Icon size={18} className={cur === k ? 'text-orange-600' : 'text-stone-400'} />
                      <span className="flex-1 text-left">{n}</span>
                      {badge(k) > 0 && <span className={`rounded-full px-1.5 text-xs font-bold ${k === 'kitchen' ? 'bg-orange-600 text-white' : 'bg-stone-200 text-stone-700'}`}>{badge(k)}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        {lockOn && (
          <div className="border-t border-stone-100 p-3">
            <button onClick={lock} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-stone-600 hover:bg-stone-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-white">{user.name[0]}</span>
              <span className="min-w-0 flex-1 text-left"><div className="truncate font-medium">{user.name}</div><div className="text-[11px] text-stone-400">{role} · tap to lock</div></span>
              <LockIcon size={16} className="text-stone-400" />
            </button>
          </div>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white"><UtensilsCrossed size={16} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold leading-tight">{PAGES[cur][0]}</div>
            <div className="truncate text-[11px] text-stone-400">{data.settings.name}</div>
          </div>
          {lockOn && <button onClick={lock} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="Lock"><LockIcon size={18} /></button>}
        </header>
        <div className={`flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6 ${cur === 'pos' ? 'pb-4' : ''}`}>{view}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {bottom.map((k) => {
          const [n, Icon] = PAGES[k];
          return (
            <button key={k} onClick={() => go(k)} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${cur === k ? 'text-orange-600' : 'text-stone-400'}`}>
              <Icon size={22} />{n}
              {badge(k) > 0 && <span className="absolute right-1/4 top-1 rounded-full bg-orange-600 px-1.5 text-[10px] font-bold text-white">{badge(k)}</span>}
            </button>
          );
        })}
        {rest.length > 0 && (
          <button onClick={() => setMore(true)} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${rest.includes(cur) ? 'text-orange-600' : 'text-stone-400'}`}>
            <MoreHorizontal size={22} />More
          </button>
        )}
      </nav>

      {more && (
        <div className="fixed inset-0 z-[55] flex items-end bg-stone-900/40 lg:hidden" onClick={() => setMore(false)}>
          <div className="sheet-in w-full rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">All modules</h3>
              <button onClick={() => setMore(false)} className="rounded-xl p-1.5 text-stone-500 hover:bg-stone-100"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {rest.map((k) => {
                const [n, Icon] = PAGES[k];
                return (
                  <button key={k} onClick={() => go(k)} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium ${cur === k ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-stone-200 text-stone-600'}`}>
                    <Icon size={22} />{n}
                  </button>
                );
              })}
            </div>
            {lockOn && <button onClick={lock} className="mt-3 w-full rounded-xl bg-stone-100 py-2.5 text-sm font-medium text-stone-700">Lock · {user.name} ({role})</button>}
          </div>
        </div>
      )}
    </div>
  );
}
