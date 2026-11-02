import { useState } from 'react';
import { Delete, UtensilsCrossed } from 'lucide-react';

export default function Lock({ staff, name, logo, onLogin }) {
  const [sel, setSel] = useState(null);
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);

  const press = (d) => {
    if (bad) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      if (next === sel.pin) onLogin(sel.id);
      else { setBad(true); setTimeout(() => { setBad(false); setPin(''); }, 450); }
    }
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-gradient-to-b from-orange-50 to-stone-100 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-5 text-center">
          {logo ? <img src={logo} alt="" className="mx-auto mb-3 h-16 max-w-[160px] object-contain" /> : <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-white shadow"><UtensilsCrossed size={26} /></div>}
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="text-sm text-stone-500">{sel ? `Enter PIN for ${sel.name}` : 'Who is working?'}</p>
        </div>

        {!sel ? (
          <div className="grid grid-cols-2 gap-2.5">
            {staff.map((s) => (
              <button key={s.id} onClick={() => setSel(s)} className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3 text-left hover:border-orange-400 hover:bg-orange-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-800 font-bold text-white">{s.name[0]}</span>
                <span className="min-w-0"><div className="truncate text-sm font-semibold">{s.name}</div><div className="text-xs text-stone-500">{s.role}</div></span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className={`mb-5 flex justify-center gap-3 ${bad ? 'shake' : ''}`}>
              {[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 ${i < pin.length ? (bad ? 'border-red-500 bg-red-500' : 'border-orange-600 bg-orange-600') : 'border-stone-300'}`} />)}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button key={d} onClick={() => press(d)} className="rounded-2xl bg-stone-100 py-4 text-xl font-semibold hover:bg-stone-200 active:bg-orange-100">{d}</button>
              ))}
              <button onClick={() => { setSel(null); setPin(''); }} className="rounded-2xl py-4 text-sm text-stone-500">Back</button>
              <button onClick={() => press('0')} className="rounded-2xl bg-stone-100 py-4 text-xl font-semibold hover:bg-stone-200 active:bg-orange-100">0</button>
              <button onClick={() => setPin(pin.slice(0, -1))} className="flex items-center justify-center rounded-2xl text-stone-500"><Delete size={22} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
