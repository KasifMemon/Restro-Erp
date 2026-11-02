import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Btn, Card, Empty, PageHeader } from '../components.jsx';
import { useStore } from '../store.jsx';
import { fmtTime, kotHTML, printHTML } from '../utils.js';

const COLS = [
  ['new', 'New', 'border-red-200 bg-red-50', 'Start cooking', 'preparing'],
  ['preparing', 'Preparing', 'border-amber-200 bg-amber-50', 'Mark ready', 'ready'],
  ['ready', 'Ready to serve', 'border-emerald-200 bg-emerald-50', 'Served', 'served'],
];

export default function Kitchen() {
  const s = useStore();
  const { data } = s;
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 20000); return () => clearInterval(i); }, []);
  const mins = (ts) => Math.max(0, Math.round((Date.now() - ts) / 60000));
  const active = data.kots.filter((k) => k.status !== 'served');
  const [sound, setSound] = useState(true);
  const prevNew = useRef(active.filter((k) => k.status === 'new').length);
  const newCount = active.filter((k) => k.status === 'new').length;
  useEffect(() => {
    if (sound && newCount > prevNew.current) {
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        [880, 1175].forEach((f, i) => {
          const o = ac.createOscillator(), g = ac.createGain();
          o.frequency.value = f; o.connect(g); g.connect(ac.destination);
          g.gain.setValueAtTime(0.2, ac.currentTime + i * 0.18); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.18 + 0.16);
          o.start(ac.currentTime + i * 0.18); o.stop(ac.currentTime + i * 0.18 + 0.17);
        });
      } catch (e) { /* ignore */ }
    }
    prevNew.current = newCount;
  }, [newCount, sound]);

  return (
    <>
      <PageHeader title="Kitchen Display" sub={`${active.length} active tickets`}>
        <Btn variant="ghost" size="sm" onClick={() => setSound(!sound)}>{sound ? <Volume2 size={15} /> : <VolumeX size={15} />} {sound ? 'Sound on' : 'Muted'}</Btn>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLS.map(([st, title, cls, btn, next]) => {
          const list = active.filter((k) => k.status === st);
          return (
            <div key={st}>
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-stone-600">
                {title}<span className="rounded-full bg-stone-200 px-2 text-xs">{list.length}</span>
              </h3>
              <div className="space-y-3">
                {list.length === 0 && <Empty>Nothing here</Empty>}
                {list.map((k) => {
                  const m = mins(k.time);
                  return (
                    <Card key={k.id} className={`border-2 p-3 ${cls}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <div><span className="text-lg font-bold">{k.label}</span> <span className="text-xs text-stone-500">KOT #{k.no}</span></div>
                        <span className={`text-sm font-semibold ${m >= 20 ? 'text-red-600' : 'text-stone-600'}`}>{m} min · {fmtTime(k.time)}</span>
                      </div>
                      <ul className="mb-3 space-y-1 text-sm">
                        {k.items.map((i, x) => (
                          <li key={x}><b>{i.qty} ×</b> {i.name}{i.note && <div className="text-xs italic text-orange-700">» {i.note}</div>}</li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <Btn className="flex-1" variant={st === 'ready' ? 'green' : 'dark'} onClick={() => s.kotStatus(k.id, next)}>{btn}</Btn>
                        <Btn variant="ghost" onClick={() => printHTML(kotHTML(k, data.settings))}>Print</Btn>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
