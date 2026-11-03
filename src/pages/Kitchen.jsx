import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Btn, Card, Empty, PageHeader } from '../components.jsx';
import { useStore } from '../store.jsx';
import { fmtTime } from '../utils.js';
import { printKOT } from '../print.js';
import { audioSupported, ding, unlockAudio, audioReady } from '../sound.js';

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
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('restro-kitchen-sound') !== 'off'; } catch { return true; } });
  const [ready, setReady] = useState(audioReady());
  useEffect(() => { const i = setInterval(() => setReady(audioReady()), 700); return () => clearInterval(i); }, []);
  // Ring for every ticket that is new and not seen before (also when it arrives from another device)
  const seen = useRef(new Set(active.filter((k) => k.status === 'new').map((k) => k.id)));
  const newIds = active.filter((k) => k.status === 'new').map((k) => k.id);
  const key = newIds.join(',');
  useEffect(() => {
    const fresh = newIds.filter((id) => !seen.current.has(id));
    if (fresh.length && sound) ding();
    newIds.forEach((id) => seen.current.add(id));
    // eslint-disable-next-line
  }, [key, sound]);
  const toggle = () => { const n = !sound; setSound(n); try { localStorage.setItem('restro-kitchen-sound', n ? 'on' : 'off'); } catch { /* ignore */ } if (n) { unlockAudio(); ding(); } };

  return (
    <>
      <PageHeader title="Kitchen Display" sub={`${active.length} active tickets`}>
        {sound && !ready && audioSupported()
          ? <Btn size="sm" onClick={() => { unlockAudio(); ding(); setReady(audioReady()); }}><Volume2 size={15} /> Tap to enable sound</Btn>
          : <Btn variant="ghost" size="sm" onClick={toggle}>{sound ? <Volume2 size={15} /> : <VolumeX size={15} />} {sound ? 'Sound on' : 'Muted'}</Btn>}
        {sound && ready && <Btn variant="ghost" size="sm" onClick={ding}>Test</Btn>}
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
                        <Btn variant="ghost" onClick={() => printKOT(k, data.settings)}>Print</Btn>
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
