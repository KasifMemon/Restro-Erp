import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FolderOpen, RotateCcw, Share2, Trash2 } from 'lucide-react';
import { Badge, Btn, Card } from '../components.jsx';
import { useStore } from '../store.jsx';
import { autoTick, delSnap, downloadBackup, folderForget, folderRequest, folderStatus, folderSupported, getMeta, getSnap, listSnaps, pickFolder, saveSnap, setMeta, shareBackup } from '../backup.js';
import { ago, downloadBlob, fmtDT } from '../utils.js';
import { toast } from '../toast.js';
import CloudBackupCard from './CloudBackupCard.jsx';
import AccountCard from './AccountCard.jsx';

const KIND = { auto: ['Auto', 'green'], manual: ['Manual', 'blue'], 'pre-restore': ['Before restore', 'yellow'], 'pre-reset': ['Before reset', 'yellow'] };

export default function BackupTab() {
  const s = useStore();
  const { data } = s;
  const st = data.settings;
  const [snaps, setSnaps] = useState([]);
  const [folder, setFolder] = useState({ name: '', perm: 'none' });
  const [meta, setM] = useState(getMeta());
  const fileRef = useRef();

  const refresh = useCallback(async () => {
    setSnaps(await listSnaps());
    setFolder(await folderStatus());
    setM(getMeta());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const backupNow = async () => { await saveSnap(data, 'manual'); toast('Backup saved on this device', 'ok'); refresh(); };
  const restoreSnap = async (m) => {
    if (!window.confirm(`Restore the backup from ${fmtDT(m.ts)}? Current data is saved as a safety backup first.`)) return;
    const full = await getSnap(m.id);
    await saveSnap(data, 'pre-restore');
    s.replaceAll(JSON.parse(full.json));
    toast('Backup restored', 'ok'); refresh();
  };
  const downloadSnap = async (m) => { const full = await getSnap(m.id); downloadBlob(`restro-erp-${m.id}.json`, new Blob([full.json], { type: 'application/json' })); };
  const restoreFile = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const obj = JSON.parse(rd.result);
        if (!obj.settings || !obj.menu || !obj.orders) throw new Error('bad');
        if (!window.confirm('Replace ALL current data with this file? (A safety backup is taken first.)')) return;
        await saveSnap(data, 'pre-restore');
        s.replaceAll(obj); toast('Backup file restored', 'ok'); refresh();
      } catch { toast('That is not a valid RestroERP backup file', 'warn'); }
    };
    rd.readAsText(f);
  };
  const share = async () => {
    try { if (!(await shareBackup(data))) toast('Sharing files is not supported here — use Download', 'warn'); } catch (e) { if (e.name !== 'AbortError') toast('Share failed', 'warn'); }
    refresh();
  };
  const chooseFolder = async () => {
    try { await pickFolder(); await autoTick(data, true); toast('Folder backup enabled', 'ok'); } catch (e) { if (e.name !== 'AbortError') toast('Could not use that folder', 'warn'); }
    refresh();
  };
  const reauth = async () => { await folderRequest(); await autoTick(data, true); refresh(); };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Automatic backup</h3>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange-600" checked={st.autoBackup} onChange={(e) => s.setSettings({ autoBackup: e.target.checked })} />
          <span><b>Back up automatically</b><span className="block text-xs text-stone-500">Saves a snapshot every 10 minutes while something changes. Keeps the latest copy of each of the last {st.backupKeep} days.</span></span>
        </label>
        <div className="flex items-center gap-2 text-sm"><span>Keep last</span>
          <select className="rounded-lg border border-stone-200 px-2 py-1" value={st.backupKeep} onChange={(e) => s.setSettings({ backupKeep: +e.target.value })}>{[3, 7, 14, 30].map((n) => <option key={n} value={n}>{n}</option>)}</select><span>days</span></div>
        <div className="rounded-xl bg-stone-50 p-3 text-sm">
          <div>Last automatic backup: <b>{ago(meta.lastAutoAt)}</b></div>
          <div>Last copy saved off this device: <b>{ago(meta.lastExportAt)}</b></div>
        </div>
        <p className="text-xs text-stone-500">Automatic snapshots live inside this browser. If the phone/PC is lost, or browser data is cleared, they go too — so also keep a copy elsewhere:</p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => { downloadBackup(data); refresh(); }}><Download size={16} /> Download backup</Btn>
          <Btn variant="ghost" onClick={share}><Share2 size={16} /> Share (WhatsApp / Drive)</Btn>
          <Btn variant="ghost" onClick={backupNow}>Backup now</Btn>
        </div>

        <div className="border-t border-stone-100 pt-3">
          <div className="mb-1 text-sm font-medium">Auto-save to a folder (PC)</div>
          {!folderSupported() ? (
            <p className="text-xs text-stone-500">Available in Chrome / Edge on a computer. Point it at a Google Drive / OneDrive / Dropbox folder and every backup syncs to the cloud.</p>
          ) : folder.perm === 'none' ? (
            <Btn variant="soft" onClick={chooseFolder}><FolderOpen size={16} /> Choose folder</Btn>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={folder.perm === 'granted' ? 'green' : 'yellow'}>{folder.name} · {folder.perm === 'granted' ? 'active' : 'permission needed'}</Badge>
              {folder.perm !== 'granted' && <Btn size="sm" onClick={reauth}>Allow again</Btn>}
              <Btn size="sm" variant="ghost" onClick={async () => { await folderForget(); refresh(); }}>Stop</Btn>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Saved backups on this device</h3>
          <Btn size="sm" variant="ghost" onClick={() => fileRef.current.click()}>Restore from file</Btn>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={restoreFile} />
        </div>
        {snaps.length === 0 && <div className="py-6 text-center text-sm text-stone-400">No backups yet — the first one is made automatically shortly after you start working.</div>}
        <div className="max-h-[26rem] divide-y divide-stone-100 overflow-y-auto">
          {snaps.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="font-medium">{fmtDT(m.ts)}</span><Badge tone={(KIND[m.kind] || ['', 'gray'])[1]}>{(KIND[m.kind] || [m.kind])[0]}</Badge></div>
                <div className="text-xs text-stone-500">{m.orders} orders · {(m.size / 1024).toFixed(0)} KB</div>
              </div>
              <button title="Restore" className="rounded-lg p-1.5 text-stone-500 hover:bg-orange-50 hover:text-orange-600" onClick={() => restoreSnap(m)}><RotateCcw size={16} /></button>
              <button title="Download" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100" onClick={() => downloadSnap(m)}><Download size={16} /></button>
              <button title="Delete" className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600" onClick={async () => { await delSnap(m.id); refresh(); }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Card>

      <AccountCard />
      <CloudBackupCard />

      <Card className="space-y-3 p-4 lg:col-span-2">
        <h3 className="font-semibold">Reset</h3>
        <p className="text-sm text-stone-600">Both actions take a safety backup first, so you can undo them from the list above.</p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={async () => { if (window.confirm('Reset everything to the demo menu and sample sales?')) { await saveSnap(data, 'pre-reset'); s.resetDemo(); refresh(); } }}>Reset to demo data</Btn>
          <Btn variant="danger" onClick={async () => { if (window.confirm('Delete ALL menu, orders, stock and customers and start fresh? (Settings are kept)')) { await saveSnap(data, 'pre-reset'); s.clearAll(); refresh(); } }}>Clear everything & start fresh</Btn>
        </div>
      </Card>
    </div>
  );
}
