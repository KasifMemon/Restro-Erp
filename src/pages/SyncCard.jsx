import { RefreshCw } from 'lucide-react';
import { Btn, Card } from '../components.jsx';
import { LICENSE_REQUIRED } from '../cloud.js';
import { pokeSync, useSyncStatus } from '../sync.js';
import { ago } from '../utils.js';

const TEXT = { off: 'Not syncing', waiting: 'Waiting for setup to finish', syncing: 'Syncing…', idle: 'Up to date', offline: 'Offline. Changes are saved here and will upload when you are back online.', needs_choice: 'Waiting for your choice', blocked: 'Sync is paused for this licence', error: 'Sync problem' };

export default function SyncCard() {
  const s = useSyncStatus();
  if (!LICENSE_REQUIRED) return null;
  return (
    <Card className="space-y-3 p-4 lg:col-span-2">
      <div className="flex items-center gap-2"><RefreshCw size={18} /><h3 className="font-semibold">Device sync</h3></div>
      <p className="text-sm text-stone-600">Your other devices stay in step within a few seconds: menu, tables, orders, kitchen tickets, stock and customers. Printer settings stay on each device.</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${s.state === 'idle' ? 'bg-emerald-500' : s.state === 'offline' || s.state === 'syncing' ? 'bg-amber-400' : 'bg-red-500'}`} />
        <b>{TEXT[s.state] || s.state}</b>
        {s.last > 0 && <span className="text-stone-400">· last sync {ago(s.last)}</span>}
        {s.pending > 0 && <span className="text-stone-400">· {s.pending} waiting to upload</span>}
      </div>
      {s.error && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{s.error}</div>}
      <Btn variant="ghost" onClick={() => pokeSync(true)} disabled={s.state === 'off'}><RefreshCw size={14} />Sync now</Btn>
    </Card>
  );
}
