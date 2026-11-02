// Direct thermal-printer transports: WebUSB, Web Serial, Web Bluetooth (BLE) and the RawBT Android app.
// Browsers cannot reach classic-Bluetooth (SPP) printers or raw LAN sockets – use USB, BLE or RawBT for those.
const conns = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slices = (u8, n) => { const o = []; for (let i = 0; i < u8.length; i += n) o.push(u8.slice(i, i + n)); return o; };

export const support = () => ({
  usb: typeof navigator !== 'undefined' && !!navigator.usb,
  serial: typeof navigator !== 'undefined' && !!navigator.serial,
  bluetooth: typeof navigator !== 'undefined' && !!navigator.bluetooth,
});
export const isConnected = (slot) => !!conns[slot];
export const connectedName = (slot) => conns[slot]?.name || '';

async function openUsb(dev) {
  await dev.open();
  if (dev.configuration === null) await dev.selectConfiguration(1);
  let found = null;
  for (const itf of dev.configuration.interfaces) {
    for (const alt of itf.alternates) {
      const ep = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
      if (ep && (!found || alt.interfaceClass === 7)) found = { itf, alt, ep };
    }
  }
  if (!found) throw new Error('No printable (bulk OUT) endpoint on this USB device');
  await dev.claimInterface(found.itf.interfaceNumber);
  if (found.alt.alternateSetting) await dev.selectAlternateInterface(found.itf.interfaceNumber, found.alt.alternateSetting);
  return {
    kind: 'usb', name: dev.productName || 'USB printer', id: `usb:${dev.vendorId}:${dev.productId}`,
    async write(bytes) { for (const c of slices(bytes, 16384)) await dev.transferOut(found.ep.endpointNumber, c); },
    async close() { try { await dev.close(); } catch (e) { /* ignore */ } },
  };
}

async function openSerial(port, baud) {
  await port.open({ baudRate: baud || 9600 });
  const writer = port.writable.getWriter();
  const info = port.getInfo ? port.getInfo() : {};
  return {
    kind: 'serial', name: 'Serial printer', id: `serial:${info.usbVendorId || 0}:${info.usbProductId || 0}`,
    async write(bytes) { for (const c of slices(bytes, 4096)) await writer.write(c); },
    async close() { try { writer.releaseLock(); await port.close(); } catch (e) { /* ignore */ } },
  };
}

const BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', '0000ffe0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455', '0000fee7-0000-1000-8000-00805f9b34fb',
];
async function openBle() {
  const dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES });
  const server = await dev.gatt.connect();
  let ch = null;
  for (const svc of await server.getPrimaryServices()) {
    for (const c of await svc.getCharacteristics()) {
      if (c.properties.writeWithoutResponse || c.properties.write) { ch = c; break; }
    }
    if (ch) break;
  }
  if (!ch) throw new Error('No writable Bluetooth characteristic found (is this a BLE printer?)');
  return {
    kind: 'bluetooth', name: dev.name || 'Bluetooth printer', id: 'ble:' + dev.id,
    async write(bytes) {
      for (const c of slices(bytes, 100)) {
        if (ch.properties.writeWithoutResponse) await ch.writeValueWithoutResponse(c); else await ch.writeValue(c);
        await sleep(25);
      }
    },
    async close() { try { dev.gatt.disconnect(); } catch (e) { /* ignore */ } },
  };
}

/** Must be called from a click (browser security). Returns {name,id}. */
export async function connect(slot, cfg) {
  await disconnect(slot);
  let c;
  if (cfg.kind === 'usb') {
    if (!navigator.usb) throw new Error('USB printing needs Chrome/Edge (desktop or Android)');
    c = await openUsb(await navigator.usb.requestDevice({ filters: [] }));
  } else if (cfg.kind === 'serial') {
    if (!navigator.serial) throw new Error('Serial printing needs Chrome/Edge on desktop');
    c = await openSerial(await navigator.serial.requestPort(), cfg.baud);
  } else if (cfg.kind === 'bluetooth') {
    if (!navigator.bluetooth) throw new Error('Bluetooth printing needs Chrome/Edge (Android or desktop)');
    c = await openBle();
  } else if (cfg.kind === 'rawbt') {
    c = { kind: 'rawbt', name: 'RawBT app', id: 'rawbt', write: async () => {}, close: async () => {} };
  } else throw new Error('Unknown connection type');
  conns[slot] = c;
  return { name: c.name, id: c.id };
}

export async function disconnect(slot) {
  const c = conns[slot];
  delete conns[slot];
  if (c) await c.close();
}

/** Silent reconnect to a previously-authorised USB / serial device */
export async function autoReconnect(slot, cfg) {
  try {
    if (cfg.kind === 'usb' && navigator.usb) {
      const devs = await navigator.usb.getDevices();
      const d = devs.find((x) => `usb:${x.vendorId}:${x.productId}` === cfg.deviceId) || (cfg.deviceId ? null : devs[0]);
      if (d) { conns[slot] = await openUsb(d); return conns[slot]; }
    }
    if (cfg.kind === 'serial' && navigator.serial) {
      const ports = await navigator.serial.getPorts();
      if (ports[0]) { conns[slot] = await openSerial(ports[0], cfg.baud); return conns[slot]; }
    }
  } catch (e) { /* fall through */ }
  return null;
}

export async function sendBytes(slot, cfg, bytes) {
  if (cfg.kind === 'rawbt') {
    let s = '';
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
    window.location.href = 'rawbt:base64,' + btoa(s);
    return;
  }
  let c = conns[slot];
  if (!c) c = await autoReconnect(slot, cfg);
  if (!c) throw new Error('Printer not connected — Settings → Printers → Connect');
  await c.write(bytes);
}
