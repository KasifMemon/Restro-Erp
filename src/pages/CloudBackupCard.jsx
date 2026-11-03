import { useEffect, useState } from 'react';
import { Cloud, CloudDownload, CloudUpload } from 'lucide-react';
import { Btn, Card } from '../components.jsx';
import { useStore, normalize } from '../store.jsx';
import { LICENSE_REQUIRED, cloudBackup, getCloudMeta, getLicenseCache, setCloudMeta } from '../cloud.js';
import { saveSnap } from '../backup.js';
import { fmtDT } from '../utils.js';
import { toast } from '../toast.js';

const WHY = { license: 'Your licence is not active.', device: 'This device is not registered. Reopen the app online.', offline: 'No internet connection.', too_large: 'Data is larger than the 4 MB cloud limit. Use file backup.', nolicense: 'Activate a licence first.' };

export default function CloudBackupCard() {
  const s = useStore();
  const [meta, setMeta] = useState(getCloudMeta());
  const [remote, setRemote] = useState(null);
  const [busy, setBusy] = useState(false);
  const active = LICENSE_REQUIRED && getLicenseCache()?.result?.valid;

  useEffect(() => { if (active) cloudBackup('info').then((r) => r.ok && setRemote(r)); }, [active]);
  if (!LICENSE_REQUIRED) return null;

  const upload = async () => {
    setBusy(true);
    const r = await cloudBackup('put', s.get());
    setBusy(false);
    if (!r.ok) return toast(WHY[r.reason] || 'Cloud backup failed', 'warn');
    setCloudMeta({ lastUp: Date.now(), size: r.size }); setMeta(getCloudMeta()); setRemote({ exists: true, updated_at: r.updated_at, size: r.size });
    toast('Backed up to the cloud', 'ok');
  };
  const restore = async () => {
    if (!window.confirm('Replace ALL data on this device with the cloud backup? A safety backup is taken first.')) return;
    setBusy(true);
    const r = await cloudBackup('get');
    setBusy(false);
    if (!r.ok || !r.exists) return toast(r.ok ? 'No cloud backup found' : WHY[r.reason] || 'Restore failed', 'warn');
    await saveSnap(s.get(), 'pre-restore');
    s.replaceAll(normalize(r.data));
    toast('Restored from the cloud', 'ok');
  };
  const auto = meta.auto !== false;
  return (
    <Card className="space-y-3 p-4 lg:col-span-2">
      <div className="flex items-center gap-2"><Cloud size={18} /><h3 className="font-semibold">Cloud backup</h3></div>
      <p className="text-sm text-stone-600">One copy of your data is kept safely online under your licence. Use it to move to a new phone or recover a lost device. It is a backup, not live sync between devices.</p>
      <div className="text-xs text-stone-500">{remote?.exists ? `Latest cloud copy: ${fmtDT(new Date(remote.updated_at).getTime())} · ${(remote.size / 1024).toFixed(0)} KB` : 'No cloud copy yet.'}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={auto} onChange={(e) => { setCloudMeta({ auto: e.target.checked }); setMeta(getCloudMeta()); }} />Back up automatically once a day</label>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={upload} disabled={busy || !active}><CloudUpload size={15} />Back up now</Btn>
        <Btn variant="ghost" onClick={restore} disabled={busy || !active}><CloudDownload size={15} />Restore from cloud</Btn>
      </div>
    </Card>
  );
}
