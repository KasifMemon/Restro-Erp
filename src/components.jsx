import { X } from 'lucide-react';

export const inputCls =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-stone-100';

const variants = {
  primary: 'bg-orange-600 text-white hover:bg-orange-700',
  dark: 'bg-stone-800 text-white hover:bg-stone-900',
  ghost: 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  green: 'bg-emerald-600 text-white hover:bg-emerald-700',
  soft: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
};
export function Btn({ variant = 'primary', className = '', size = 'md', ...p }) {
  const sz = size === 'sm' ? 'px-2.5 py-1 text-xs' : size === 'lg' ? 'px-5 py-3 text-base' : 'px-3.5 py-2 text-sm';
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${sz} ${variants[variant]} ${className}`}
    />
  );
}

export const Card = ({ className = '', children, ...p }) => (
  <div {...p} className={`rounded-xl border border-stone-200 bg-white shadow-sm ${className}`}>{children}</div>
);

export function Modal({ title, onClose, children, wide, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`flex max-h-[92vh] w-full flex-col rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-stone-100" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-stone-200 px-5 py-3">{footer}</div>}
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
  green: 'bg-emerald-100 text-emerald-700', red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700',
  gray: 'bg-stone-100 text-stone-600', blue: 'bg-sky-100 text-sky-700', yellow: 'bg-amber-100 text-amber-700',
};
export const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
);

export const PageHeader = ({ title, sub, children }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      {sub && <p className="text-sm text-stone-500">{sub}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

export const Empty = ({ children }) => <div className="py-10 text-center text-sm text-stone-400">{children}</div>;

export const VegDot = ({ veg }) => (
  <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${veg ? 'border-emerald-600' : 'border-red-600'}`}>
    <span className={`h-2 w-2 rounded-full ${veg ? 'bg-emerald-600' : 'bg-red-600'}`} />
  </span>
);

export const Stat = ({ label, value, sub, tone = 'text-stone-900' }) => (
  <Card className="p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
    <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    {sub && <div className="mt-0.5 text-xs text-stone-500">{sub}</div>}
  </Card>
);

export const Table = ({ head, children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
          {head.map((h, i) => (
            <th key={i} className={`px-3 py-2 font-medium ${typeof h === 'object' ? h.cls : ''}`}>{typeof h === 'object' ? h.t : h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">{children}</tbody>
    </table>
  </div>
);
