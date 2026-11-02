import { useEffect } from 'react';
import { X } from 'lucide-react';

export const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-stone-100';

const variants = {
  primary: 'bg-orange-600 text-white shadow-sm hover:bg-orange-700 active:bg-orange-800',
  dark: 'bg-stone-800 text-white shadow-sm hover:bg-stone-900',
  ghost: 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  green: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
  soft: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
};
export function Btn({ variant = 'primary', className = '', size = 'md', ...p }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-5 py-3.5 text-base' : 'px-4 py-2.5 text-sm';
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${sz} ${variants[variant]} ${className}`}
    />
  );
}

export const Card = ({ className = '', children, ...p }) => (
  <div {...p} className={`rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,.04)] ${className}`}>{children}</div>
);

/** Bottom sheet on phones, centred dialog on larger screens */
export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/40 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet-in flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-stone-200 sm:hidden" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3 sm:border-b sm:border-stone-100 sm:py-3.5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-xl p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-2 sm:pt-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-stone-100 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-medium text-stone-500">{label}</span>
    {children}
  </label>
);

const tones = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', red: 'bg-red-50 text-red-700 ring-red-600/15', orange: 'bg-orange-50 text-orange-700 ring-orange-600/15',
  gray: 'bg-stone-100 text-stone-600 ring-stone-500/10', blue: 'bg-sky-50 text-sky-700 ring-sky-600/15', yellow: 'bg-amber-50 text-amber-700 ring-amber-600/15',
};
export const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>
);

export const PageHeader = ({ title, sub, children }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
      {sub && <p className="mt-0.5 text-sm text-stone-500">{sub}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

export const Empty = ({ children }) => <div className="py-10 text-center text-sm text-stone-400">{children}</div>;

export const VegDot = ({ veg }) => (
  <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${veg ? 'border-emerald-600' : 'border-red-600'}`}>
    <span className={`h-2 w-2 rounded-full ${veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
  </span>
);

export const Stat = ({ label, value, sub, tone = 'text-stone-900', icon: Icon }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{label}</div>
      {Icon && <Icon size={16} className="text-stone-300" />}
    </div>
    <div className={`mt-1.5 text-xl font-bold sm:text-2xl ${tone}`}>{value}</div>
    {sub && <div className="mt-0.5 text-xs text-stone-500">{sub}</div>}
  </Card>
);

export const Table = ({ head, children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full min-w-[560px] text-sm">
      <thead>
        <tr className="border-b border-stone-100 bg-stone-50/60 text-left text-[11px] uppercase tracking-wider text-stone-400">
          {head.map((h, i) => (
            <th key={i} className={`px-3 py-2.5 font-semibold ${typeof h === 'object' ? h.cls : ''}`}>{typeof h === 'object' ? h.t : h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">{children}</tbody>
    </table>
  </div>
);

export const Chip = ({ active, children, ...p }) => (
  <button {...p} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${active ? 'bg-stone-800 text-white shadow-sm' : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}>{children}</button>
);
