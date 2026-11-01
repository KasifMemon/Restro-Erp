import { useState } from 'react';
import {
  LayoutDashboard, Armchair, ReceiptText, ChefHat, UtensilsCrossed, Package, Truck, Users,
  UserCog, Wallet, BarChart3, Settings as Cog, Menu as MenuIcon, X,
} from 'lucide-react';
import { useStore } from './store.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tables from './pages/Tables.jsx';
import POS from './pages/POS.jsx';
import Kitchen from './pages/Kitchen.jsx';
import MenuPage from './pages/MenuPage.jsx';
import Inventory from './pages/Inventory.jsx';
import Purchases from './pages/Purchases.jsx';
import Customers from './pages/Customers.jsx';
import Staff from './pages/Staff.jsx';
import Expenses from './pages/Expenses.jsx';
import Reports from './pages/Reports.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['tables', 'Tables & Orders', Armchair],
  ['pos', 'Billing (POS)', ReceiptText],
  ['kitchen', 'Kitchen (KDS)', ChefHat],
  ['menu', 'Menu', UtensilsCrossed],
  ['inventory', 'Inventory', Package],
  ['purchases', 'Purchases', Truck],
  ['customers', 'Customers', Users],
  ['staff', 'Staff', UserCog],
  ['expenses', 'Expenses', Wallet],
  ['reports', 'Reports', BarChart3],
  ['settings', 'Settings', Cog],
];

export default function App() {
  const { data } = useStore();
  const [page, setPage] = useState('tables');
  const [orderId, setOrderId] = useState(null);
  const [open, setOpen] = useState(false);

  const go = (p, oid) => {
    if (oid !== undefined) setOrderId(oid);
    setPage(p);
    setOpen(false);
  };
  const pendingKots = data.kots.filter((k) => k.status !== 'served').length;
  const openOrders = data.orders.filter((o) => o.status === 'open').length;

  const view = {
    dashboard: <Dashboard go={go} />,
    tables: <Tables go={go} />,
    pos: <POS orderId={orderId} go={go} />,
    kitchen: <Kitchen />,
    menu: <MenuPage />,
    inventory: <Inventory />,
    purchases: <Purchases />,
    customers: <Customers />,
    staff: <Staff />,
    expenses: <Expenses />,
    reports: <Reports />,
    settings: <SettingsPage />,
  }[page];

  const sidebar = (
    <nav className="flex h-full w-60 flex-col bg-stone-900 text-stone-300">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white"><UtensilsCrossed size={20} /></div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{data.settings.name}</div>
          <div className="text-[11px] text-stone-500">RestroERP</div>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {NAV.map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => go(k)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${page === k ? 'bg-orange-600 text-white' : 'hover:bg-stone-800 hover:text-white'}`}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
            {k === 'kitchen' && pendingKots > 0 && <span className="rounded-full bg-white px-1.5 text-xs font-bold text-orange-700">{pendingKots}</span>}
            {k === 'tables' && openOrders > 0 && <span className="rounded-full bg-stone-700 px-1.5 text-xs text-white">{openOrders}</span>}
          </button>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="shadow-2xl">{sidebar}</div>
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-2 lg:hidden">
          <button onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <MenuIcon />}</button>
          <span className="font-semibold">{NAV.find((n) => n[0] === page)?.[1]}</span>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">{view}</div>
      </main>
    </div>
  );
}
