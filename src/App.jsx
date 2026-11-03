import { lazy, Suspense, useEffect, useState } from 'react';
import {
  LayoutDashboard, Armchair, ReceiptText, ChefHat, UtensilsCrossed, Package, Truck, Users, UserCog, Wallet,
  BarChart3, Settings as Cog, ScrollText, CalendarClock, Banknote, MoreHorizontal, Lock as LockIcon, X,
  Search, Bell, ChevronRight, CircleHelp, Sparkles, Store, ShieldCheck,
} from 'lucide-react';
import { useStore } from './store.jsx';
import { ACCESS, ALL, canVoid } from './access.js';
import Lock from './Lock.jsx';
import Setup from './Setup.jsx';
import { autoTick } from './backup.js';
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Tables = lazy(() => import('./pages/Tables.jsx'));
const POS = lazy(() => import('./pages/POS.jsx'));
const Kitchen = lazy(() => import('./pages/Kitchen.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const Reservations = lazy(() => import('./pages/Reservations.jsx'));
const MenuPage = lazy(() => import('./pages/MenuPage.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));
const Purchases = lazy(() => import('./pages/Purchases.jsx'));
const Customers = lazy(() => import('./pages/Customers.jsx'));
const Staff = lazy(() => import('./pages/Staff.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const DayClose = lazy(() => import('./pages/DayClose.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));

const PAGES = {
  dashboard: ['Dashboard', LayoutDashboard], tables: ['Tables', Armchair], pos: ['Billing', ReceiptText], kitchen: ['Kitchen display', ChefHat],
  orders: ['Bills & orders', ScrollText], reservations: ['Reservations', CalendarClock], menu: ['Menu management', UtensilsCrossed], inventory: ['Inventory', Package],
  purchases: ['Purchases', Truck], customers: ['Customers', Users], staff: ['Staff & access', UserCog], expenses: ['Expenses', Wallet],
  dayclose: ['Cash register', Banknote], reports: ['Reports & insights', BarChart3], settings: ['Settings', Cog],
};
const GROUPS = [
  ['Restaurant', ['dashboard', 'tables', 'pos', 'kitchen', 'orders', 'reservations']],
  ['Management', ['menu', 'inventory', 'purchases', 'customers', 'staff', 'expenses', 'dayclose', 'reports', 'settings']],
];
const BOTTOM = ['dashboard', 'tables', 'pos', 'kitchen'];
const NAV_TEXT = {
  en: {Dashboard:'Dashboard',Tables:'Tables',Billing:'Billing','Kitchen display':'Kitchen', 'Bills & orders':'Bills',Reservations:'Reservations','Menu management':'Menu',Inventory:'Inventory',Purchases:'Purchases',Customers:'Customers','Staff & access':'Staff',Expenses:'Expenses','Cash register':'Cash register','Reports & insights':'Reports',Settings:'Settings',Restaurant:'Restaurant',Management:'Management',More:'More','All modules':'All modules'},
  gu: {Dashboard:'ડેશબોર્ડ',Tables:'ટેબલ',Billing:'બિલિંગ','Kitchen display':'રસોડું','Bills & orders':'બિલ',Reservations:'બુકિંગ','Menu management':'મેનુ',Inventory:'સ્ટોક',Purchases:'ખરીદી',Customers:'ગ્રાહકો','Staff & access':'સ્ટાફ',Expenses:'ખર્ચ','Cash register':'રોકડ રજીસ્ટર','Reports & insights':'રિપોર્ટ',Settings:'સેટિંગ્સ',Restaurant:'રેસ્ટોરન્ટ',Management:'મેનેજમેન્ટ',More:'વધુ','All modules':'બધા મોડ્યુલ'},
  hi: {Dashboard:'डैशबोर्ड',Tables:'टेबल',Billing:'बिलिंग','Kitchen display':'रसोई','Bills & orders':'बिल',Reservations:'बुकिंग','Menu management':'मेन्यू',Inventory:'स्टॉक',Purchases:'खरीद',Customers:'ग्राहक','Staff & access':'स्टाफ',Expenses:'खर्च','Cash register':'कैश रजिस्टर','Reports & insights':'रिपोर्ट',Settings:'सेटिंग्स',Restaurant:'रेस्टोरेंट',Management:'मैनेजमेंट',More:'और','All modules':'सभी मॉड्यूल'}
};

function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const h = (e) => { const t = e.detail; setList((l) => [...l.slice(-2), t]); setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 5000); };
    window.addEventListener('restro-toast', h);
    return () => window.removeEventListener('restro-toast', h);
  }, []);
  return <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-3">{list.map((t) => <div key={t.id} className={`sheet-in pointer-events-auto max-w-md rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${t.tone === 'warn' ? 'bg-red-600' : t.tone === 'ok' ? 'bg-emerald-600' : 'bg-slate-800'}`}>{t.msg}</div>)}</div>;
}

export default function App() {
  const { data, get } = useStore();
  const tr = (label) => NAV_TEXT[data.settings.language || 'en']?.[label] || label;
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
  const [mobileSearch, setMobileSearch] = useState(false);
  const [quickFind, setQuickFind] = useState('');

  const lockOn = data.staff.some((s) => s.pin);
  if (!data.settings.setupDone) return <><Setup /><Toasts /></>;
  const user = data.staff.find((s) => s.id === uid);
  if (lockOn && !user) return <><Toasts /><Lock staff={data.staff.filter((s) => s.pin)} name={data.settings.name} logo={data.settings.logo} onLogin={(id) => { try { sessionStorage.setItem('restro-user', id); } catch { /* ignore */ } setUid(id); setPage('tables'); }} /></>;
  const role = lockOn ? user.role : 'Owner';
  const allowed = lockOn ? ACCESS[role] || ['tables'] : ALL;
  const cur = allowed.includes(page) ? page : allowed[0];
  const lock = () => { try { sessionStorage.removeItem('restro-user'); } catch { /* ignore */ } setUid(null); setMore(false); };
  const go = (p, oid) => { if (oid !== undefined) setOrderId(oid); setPage(p); setMore(false); setMobileSearch(false); };
  const pendingKots = data.kots.filter((k) => k.status !== 'served').length;
  const openOrders = data.orders.filter((o) => o.status === 'open').length;
  const badge = (k) => (k === 'kitchen' && pendingKots ? pendingKots : k === 'tables' && openOrders ? openOrders : 0);
  const [pageTitle, PageIcon] = PAGES[cur];
  const view = {
    dashboard: <Dashboard go={go} />, tables: <Tables go={go} />, pos: <POS orderId={orderId} go={go} />, kitchen: <Kitchen />,
    orders: <Orders go={go} canVoid={canVoid(role) || !lockOn} />, reservations: <Reservations go={go} />, menu: <MenuPage />,
    inventory: <Inventory />, purchases: <Purchases />, customers: <Customers />, staff: <Staff />, expenses: <Expenses />,
    dayclose: <DayClose />, reports: <Reports />, settings: <SettingsPage />,
  }[cur];
  const bottom = BOTTOM.filter((k) => allowed.includes(k)).slice(0, 4);
  const rest = allowed.filter((k) => !bottom.includes(k));
  const filteredRest = rest.filter((k) => PAGES[k][0].toLowerCase().includes(quickFind.toLowerCase()));

  return (
    <div className="restro-shell flex h-full min-h-0">
      <Toasts />
      {/* Desktop navigation */}
      <aside className="restro-sidebar hidden w-[258px] shrink-0 flex-col lg:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="restro-brand-mark"><UtensilsCrossed size={21} strokeWidth={2.3} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold tracking-tight text-white">{data.settings.name || 'RestroERP'}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">Restaurant OS</div>
          </div>
        </div>
        <div className="mx-4 mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400/15 text-teal-300"><Store size={16}/></span>
          <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-slate-200">Main outlet</div><div className="text-[10px] text-slate-400">Local testing workspace</div></div>
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.12)]" />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-5">
          {GROUPS.map(([g, keys]) => { const ks = keys.filter((k) => allowed.includes(k)); if (!ks.length) return null; return (
            <div key={g}>
              <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.22em] text-slate-500">{tr(g)}</div>
              <div className="space-y-1">{ks.map((k) => { const [n, Icon] = PAGES[k]; const active = cur === k; return (
                <button key={k} onClick={() => go(k)} className={`restro-nav-item ${active ? 'active' : ''}`}>
                  <Icon size={17} strokeWidth={active ? 2.3 : 1.8}/><span className="min-w-0 flex-1 truncate text-left">{tr(n)}</span>
                  {badge(k) > 0 && <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${k === 'kitchen' ? 'bg-teal-400 text-slate-950' : 'bg-white/15 text-white'}`}>{badge(k)}</span>}
                  {active && <ChevronRight size={14} className="text-teal-300"/>}
                </button>
              );})}</div>
            </div>
          );})}
        </nav>
        <div className="mx-4 mb-4 rounded-2xl border border-teal-300/15 bg-teal-300/[.08] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-200"><ShieldCheck size={14}/> Testing mode</div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">Your current data is saved in this browser on this device.</p>
        </div>
        {lockOn && <button onClick={lock} className="mx-3 mb-4 flex items-center gap-3 rounded-xl border-t border-white/10 px-2 pt-4 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-400 text-xs font-bold text-slate-950">{user.name[0]}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{user.name}</span><span className="text-[10px] text-slate-400">{role} · Lock screen</span></span><LockIcon size={15} className="text-slate-400"/>
        </button>}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="restro-topbar flex shrink-0 items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 lg:hidden"><UtensilsCrossed size={18}/></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="hidden text-[10px] font-bold uppercase tracking-[.18em] text-slate-400 sm:inline">Workspace</span><ChevronRight size={12} className="hidden text-slate-300 sm:inline"/><h1 className="truncate text-[15px] font-bold tracking-tight text-slate-800 sm:text-base">{tr(pageTitle)}</h1></div>
              <p className="mt-0.5 truncate text-[10px] text-slate-400 sm:text-[11px]">{data.settings.name || 'Restaurant'} <span className="mx-1">·</span>{new Date().toLocaleDateString(data.settings.language === 'gu' ? 'gu-IN' : data.settings.language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          {mobileSearch && <input autoFocus value={quickFind} onChange={(e) => setQuickFind(e.target.value)} placeholder="Find a module…" className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-teal-500 sm:w-44 lg:hidden"/>}
          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>LOCAL TEST MODE</div>
          <button onClick={() => setMobileSearch((v) => !v)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Search modules"><Search size={18}/></button>
          <button onClick={() => go('settings')} className="hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-teal-200 hover:text-teal-700 sm:inline-flex" title="Settings"><Cog size={17}/></button>
          {lockOn && <button onClick={lock} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50" aria-label="Lock"><LockIcon size={17}/></button>}
        </header>
        <div className={`restro-content min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-8 ${cur === 'pos' ? 'pb-4' : ''}`}>
          <div className="mx-auto w-full max-w-[1600px]"><Suspense fallback={<div className="p-10 text-center text-sm text-slate-400">Loading…</div>}>{view}</Suspense></div>
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="restro-mobile-nav fixed inset-x-0 bottom-0 z-30 flex pb-[env(safe-area-inset-bottom)] lg:hidden">
        {bottom.map((k) => { const [n, Icon] = PAGES[k]; return <button key={k} onClick={() => go(k)} className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold ${cur === k ? 'selected' : ''}`}><Icon size={20} strokeWidth={cur === k ? 2.4 : 1.8}/>{tr(n)}{badge(k) > 0 && <span className="absolute right-1/4 top-0.5 min-w-4 rounded-full bg-teal-600 px-1 text-[9px] font-bold text-white">{badge(k)}</span>}</button>;})}
        {rest.length > 0 && <button onClick={() => setMore(true)} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold ${rest.includes(cur) ? 'selected' : ''}`}><MoreHorizontal size={20}/>{tr('More')}</button>}
      </nav>
      {more && <div className="fixed inset-0 z-[55] flex items-end bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setMore(false)}>
        <div className="sheet-in w-full rounded-t-[28px] bg-[#fbfcfc] p-5 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-bold text-slate-800">All modules</h3><p className="text-xs text-slate-400">Everything you need to run your restaurant</p></div><button onClick={() => setMore(false)} className="rounded-xl bg-slate-100 p-2 text-slate-500"><X size={19}/></button></div>
          <div className="relative mb-3"><Search size={15} className="absolute left-3 top-3 text-slate-400"/><input value={quickFind} onChange={(e) => setQuickFind(e.target.value)} placeholder="Search modules" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500"/></div>
          <div className="grid max-h-[48dvh] grid-cols-3 gap-2 overflow-y-auto">{filteredRest.map((k) => { const [n, Icon] = PAGES[k]; return <button key={k} onClick={() => go(k)} className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-[11px] font-semibold ${cur === k ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600'}`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50"><Icon size={19}/></span>{tr(n)}</button>;})}</div>
          {lockOn && <button onClick={lock} className="mt-4 w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700">Lock · {user.name} ({role})</button>}
        </div>
      </div>}
    </div>
  );
}
