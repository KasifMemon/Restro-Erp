import { useEffect, useState } from 'react';
import { Printer as PrinterIcon, Plug, Unplug } from 'lucide-react';
import { Badge, Btn, Card, Field, inputCls } from '../components.jsx';
import { useStore } from '../store.jsx';
import { connect, connectedName, disconnect, isConnected, sendBytes, support } from '../printer.js';
import { kotDoc, previewThermal, receiptDoc, runPrint, sampleOrder, testDoc } from '../print.js';
import { toast } from '../toast.js';

const KINDS = [['usb', 'USB (cable)'], ['bluetooth', 'Bluetooth LE'], ['serial', 'Serial / COM port'], ['rawbt', 'RawBT app (Android)']];

export default function PrinterTab() {
  const s = useStore();
  const st = s.data.settings;
  const sup = support();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="space-y-2 p-4 lg:col-span-2">
        <h3 className="font-semibold">Printing options</h3>
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="h-4 w-4 accent-orange-600" checked={st.autoPrintBill} onChange={(e) => s.setSettings({ autoPrintBill: e.target.checked })} /> Print the bill automatically when settled</label>
          <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="h-4 w-4 accent-orange-600" checked={st.autoPrintKot} onChange={(e) => s.setSettings({ autoPrintKot: e.target.checked })} /> Print KOT automatically when sent to kitchen</label>
          <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="h-4 w-4 accent-orange-600" checked={st.drawerKick} onChange={(e) => s.setSettings({ drawerKick: e.target.checked })} /> Open cash drawer on cash payments (thermal)</label>
          <label className="flex items-center gap-2 py-1 text-sm">KOT copies <input type="number" min="1" max="4" className={inputCls + ' !w-16 !py-1.5'} value={st.kotCopies} onChange={(e) => s.setSettings({ kotCopies: Math.min(4, Math.max(1, +e.target.value || 1)) })} /></label>
        </div>
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <Badge tone={sup.usb ? 'green' : 'gray'}>USB {sup.usb ? 'available' : 'not in this browser'}</Badge>
          <Badge tone={sup.bluetooth ? 'green' : 'gray'}>Bluetooth {sup.bluetooth ? 'available' : 'not in this browser'}</Badge>
          <Badge tone={sup.serial ? 'green' : 'gray'}>Serial {sup.serial ? 'available' : 'not in this browser'}</Badge>
        </div>
        <p className="text-xs text-stone-500">
          Direct printing works in Chrome / Edge (desktop and Android). Most cheap <b>classic-Bluetooth</b> 58mm printers can’t be reached by any website — use their USB cable,
          a BLE printer, or install the free <b>RawBT</b> app on Android. Safari/iPhone: use "Browser print" (AirPrint).
        </p>
      </Card>
      <Slot slot="bill" title="Bill printer" />
      <Slot slot="kitchen" title="Kitchen (KOT) printer" />
    </div>
  );
}

function Slot({ slot, title }) {
  const s = useStore();
  const { data } = s;
  const st = data.settings;
  const cfg = st.printers[slot];
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState(null);
  const set = (p) => s.setSettings({ printers: { ...st.printers, [slot]: { ...cfg, ...p } } });
  const effSlot = slot === 'kitchen' && cfg.mode === 'bill' ? 'bill' : slot;
  const effCfg = st.printers[effSlot];
  const connected = isConnected(effSlot);

  const doConnect = async () => {
    setBusy(true);
    try {
      const r = await connect(effSlot, effCfg);
      s.setSettings({ printers: { ...st.printers, [effSlot]: { ...effCfg, deviceId: r.id } } });
      toast('Connected: ' + r.name, 'ok');
    } catch (e) { toast(e.message || 'Could not connect', 'warn'); }
    setBusy(false); force((x) => x + 1);
  };
  const doDisconnect = async () => { await disconnect(effSlot); force((x) => x + 1); };
  const test = async () => {
    setBusy(true);
    const r = await runPrint(slot, st, (cur) => testDoc(st, cur));
    if (r.via === 'thermal') toast('Test sent to printer', 'ok');
    setBusy(false);
  };
  const drawer = async () => {
    try { await sendBytes(effSlot, effCfg, Uint8Array.from([0x1b, 0x70, 0, 60, 120])); toast('Drawer pulse sent', 'ok'); } catch (e) { toast(e.message, 'warn'); }
  };

  const key = JSON.stringify([effCfg.paper, effCfg.graphic, effCfg.mode, st.receipt, st.name, st.logo.length, st.upiId, st.gstin, st.fssai, st.footer, slot]);
  useEffect(() => {
    if (cfg.mode === 'off' || cfg.mode === 'browser') { setPrev(null); return undefined; }
    let off = false;
    const t = setTimeout(async () => {
      try {
        let ops;
        if (slot === 'kitchen') ops = kotDoc({ no: 12, label: 'Table T3', orderNo: 84, time: Date.now(), items: [{ qty: 2, name: 'Butter Naan', note: '' }, { qty: 1, name: 'Paneer Tikka', note: 'less spicy' }] });
        else { const { order, totals } = sampleOrder(data); ops = receiptDoc(order, st, data.tables[0]?.name, totals, { cur: effCfg.graphic ? '₹' : 'Rs.' }); }
        const r = await previewThermal(ops, effCfg);
        if (!off) setPrev(r);
      } catch (e) { if (!off) setPrev({ text: 'Preview unavailable: ' + e.message }); }
    }, 300);
    return () => { off = true; clearTimeout(t); };
    // eslint-disable-next-line
  }, [key]);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold"><PrinterIcon size={18} /> {title}</h3>
        {cfg.mode === 'thermal' || (slot === 'kitchen' && cfg.mode === 'bill' && st.printers.bill.mode === 'thermal')
          ? (connected ? <Badge tone="green">● {connectedName(effSlot) || 'Connected'}</Badge> : <Badge tone="yellow">Not connected</Badge>) : null}
      </div>

      <Field label="Print with">
        <select className={inputCls} value={cfg.mode} onChange={(e) => set({ mode: e.target.value })}>
          <option value="browser">Browser print (any printer, PDF, AirPrint)</option>
          <option value="thermal">Thermal printer – direct (ESC/POS)</option>
          {slot === 'kitchen' && <option value="bill">Same printer as bill</option>}
          {slot === 'kitchen' && <option value="off">Don’t print KOT (kitchen screen only)</option>}
        </select>
      </Field>

      {cfg.mode === 'browser' && (
        <Field label="Paper">
          <select className={inputCls} value={cfg.paper} onChange={(e) => set({ paper: e.target.value === 'a4' ? 'a4' : +e.target.value })}>
            <option value={80}>Thermal roll 80mm</option><option value={58}>Thermal roll 58mm</option><option value="a4">A4 / Letter</option>
          </select>
        </Field>
      )}

      {cfg.mode === 'thermal' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Connection">
              <select className={inputCls} value={cfg.kind} onChange={(e) => set({ kind: e.target.value, deviceId: '' })}>{KINDS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
            </Field>
            <Field label="Paper width">
              <select className={inputCls} value={cfg.paper === 58 ? 58 : 80} onChange={(e) => set({ paper: +e.target.value })}><option value={80}>80 mm</option><option value={58}>58 mm</option></select>
            </Field>
            {cfg.kind === 'serial' && (
              <Field label="Baud rate"><select className={inputCls} value={cfg.baud} onChange={(e) => set({ baud: +e.target.value })}>{[9600, 19200, 38400, 57600, 115200].map((b) => <option key={b}>{b}</option>)}</select></Field>
            )}
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange-600" checked={!!cfg.graphic} onChange={(e) => set({ graphic: e.target.checked })} />
            <span><b>Print as image</b> — shows Hindi / Gujarati dish names, logo and nicer text. Slightly slower. Turn off for the fastest plain-text print.</span>
          </label>
          {cfg.kind === 'rawbt' ? (
            <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">Install <b>RawBT</b> from Play Store, pair your Bluetooth printer inside it, and set RawBT as the handler. Printing then opens RawBT automatically. (Not verified on every phone — use the Test button.)</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {!connected ? <Btn disabled={busy} onClick={doConnect}><Plug size={16} /> Connect printer</Btn> : <Btn variant="ghost" onClick={doDisconnect}><Unplug size={16} /> Disconnect</Btn>}
              {cfg.kind === 'bluetooth' && <span className="self-center text-xs text-stone-500">Bluetooth must be re-connected each time the page is reopened.</span>}
              {(cfg.kind === 'usb' || cfg.kind === 'serial') && <span className="self-center text-xs text-stone-500">USB/serial reconnects automatically next time.</span>}
            </div>
          )}
        </>
      )}

      {cfg.mode !== 'off' && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="soft" disabled={busy} onClick={test}>Print test</Btn>
          {slot === 'bill' && cfg.mode === 'thermal' && <Btn variant="ghost" onClick={drawer}>Test cash drawer</Btn>}
        </div>
      )}

      {prev && (
        <div>
          <div className="mb-1 text-xs font-medium text-stone-500">Preview of what the thermal printer will print</div>
          <div className="max-h-[420px] overflow-auto rounded-xl bg-stone-100 p-3">
            {prev.image ? <img src={prev.image} alt="preview" className="mx-auto bg-white shadow" style={{ width: effCfg.paper === 58 ? 260 : 340 }} />
              : <pre className="mx-auto w-fit rounded bg-white p-2 font-mono text-[10px] leading-tight shadow">{prev.text}</pre>}
          </div>
        </div>
      )}
    </Card>
  );
}
