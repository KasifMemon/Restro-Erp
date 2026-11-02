import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { seed, emptyData } from './seed';
import { uid, calcTotals } from './utils';

const KEY = 'restro-erp-v1';
const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

// fill in anything missing (older saves / backups) so new modules never crash
export function normalize(o) {
  const b = emptyData();
  return { ...b, ...o, settings: { ...b.settings, ...(o.settings || {}) }, counters: { ...b.counters, ...(o.counters || {}) } };
}

function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return normalize(JSON.parse(s));
  } catch (e) { /* ignore */ }
  return seed();
}

export function StoreProvider({ children }) {
  const ref = useRef(null);
  if (ref.current === null) ref.current = load();
  const [data, setData] = useState(ref.current);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }, [data]);

  const update = (fn) => {
    const n = structuredClone(ref.current);
    fn(n);
    ref.current = n;
    setData(n);
  };
  const replaceAll = (obj) => { const n = normalize(obj); ref.current = n; setData(n); };
  const get = () => ref.current;

  const api = {
    data, get, update,

    // ---- generic CRUD ----
    save(col, item) {
      update((d) => {
        const i = d[col].findIndex((x) => x.id === item.id);
        if (i >= 0) d[col][i] = item; else d[col].push(item);
      });
    },
    del(col, id) { update((d) => { d[col] = d[col].filter((x) => x.id !== id); }); },
    setSettings(patch) { update((d) => { Object.assign(d.settings, patch); }); },

    // ---- orders ----
    openOrder({ type, tableId = null, guest = {} }) {
      if (type === 'dine') {
        const ex = get().orders.find((o) => o.status === 'open' && o.tableId === tableId);
        if (ex) return ex.id;
      }
      const id = uid('o');
      update((d) => {
        d.orders.push({
          id, no: d.counters.order++, type, tableId, items: [], guest, pax: 0,
          discount: { type: 'pct', value: 0 }, status: 'open', createdAt: Date.now(), billed: false,
        });
      });
      return id;
    },
    patchOrder(orderId, patch) {
      update((d) => { const o = d.orders.find((x) => x.id === orderId); if (o) Object.assign(o, patch); });
    },
    addLine(orderId, m) {
      update((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (!o) return;
        const ex = o.items.find((l) => l.itemId === m.id && !l.note);
        if (ex) ex.qty += 1;
        else o.items.push({ lineId: uid('l'), itemId: m.id, name: m.name, catId: m.catId, price: m.price, gst: m.gst, qty: 1, sent: 0, note: '' });
        o.billed = false;
      });
    },
    setQty(orderId, lineId, qty) {
      update((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        const l = o?.items.find((x) => x.lineId === lineId);
        if (!l) return;
        l.qty = Math.max(l.sent || 0, qty);
        if (l.qty <= 0) o.items = o.items.filter((x) => x.lineId !== lineId);
        o.billed = false;
      });
    },
    setNote(orderId, lineId, note) {
      update((d) => {
        const l = d.orders.find((x) => x.id === orderId)?.items.find((x) => x.lineId === lineId);
        if (l) l.note = note;
      });
    },
    removeLine(orderId, lineId) {
      update((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (o) { o.items = o.items.filter((x) => x.lineId !== lineId); o.billed = false; }
      });
    },
    /** Creates a KOT for unsent quantities and deducts recipe stock. Returns the KOT (or null). */
    sendKOT(orderId) {
      const cur = get();
      const o = cur.orders.find((x) => x.id === orderId);
      if (!o) return null;
      const fresh = o.items.filter((l) => l.qty > (l.sent || 0));
      if (!fresh.length) return null;
      const tb = cur.tables.find((t) => t.id === o.tableId);
      const kot = {
        id: uid('k'), no: cur.counters.kot, orderId, orderNo: o.no, time: Date.now(), status: 'new',
        label: o.type === 'dine' ? 'Table ' + (tb?.name || '?') : o.type === 'take' ? 'TAKEAWAY' : 'DELIVERY',
        items: fresh.map((l) => ({ name: l.name, qty: l.qty - (l.sent || 0), note: l.note })),
      };
      update((d) => {
        const od = d.orders.find((x) => x.id === orderId);
        d.counters.kot++;
        d.kots.push(kot);
        od.items.forEach((l) => {
          const q = l.qty - (l.sent || 0);
          if (q > 0) {
            const m = d.menu.find((x) => x.id === l.itemId);
            m?.recipe?.forEach((r) => {
              const ing = d.ingredients.find((x) => x.id === r.ingId);
              if (ing) ing.stock = Math.round((ing.stock - r.qty * q) * 1000) / 1000;
            });
          }
          l.sent = l.qty;
        });
      });
      return kot;
    },
    kotStatus(id, status) {
      update((d) => { const k = d.kots.find((x) => x.id === id); if (k) { k.status = status; k[status + 'At'] = Date.now(); } });
    },
    moveTable(orderId, tableId) {
      update((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (!o) return;
        o.tableId = tableId;
        const tb = d.tables.find((t) => t.id === tableId);
        d.kots.forEach((k) => { if (k.orderId === orderId && k.status !== 'served') k.label = 'Table ' + (tb?.name || '?'); });
      });
    },
    voidBill(orderId, reason) {
      update((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (!o || o.status !== 'paid') return;
        o.status = 'void'; o.voidReason = reason; o.voidedAt = Date.now();
        const c = d.customers.find((x) => x.id === o.customerId);
        if (c) { c.due = Math.max(0, c.due - (o.due || 0)); c.points = Math.max(0, c.points - Math.floor(o.totals.total / 100)); }
      });
    },
    cancelOrder(orderId) {
      update((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (o) { o.status = 'cancelled'; o.cancelledAt = Date.now(); }
        d.kots.forEach((k) => { if (k.orderId === orderId && k.status !== 'served') k.status = 'served'; });
      });
    },
    settle(orderId, { payments, discount, due, customerId, scOff, guest }) {
      update((d) => {
        const o = d.orders.find((x) => x.id === orderId);
        if (!o) return;
        o.discount = discount; o.scOff = !!scOff; o.guest = guest || o.guest;
        o.totals = calcTotals(o, d.settings);
        o.payments = payments; o.due = due || 0;
        o.status = 'paid'; o.paidAt = Date.now(); o.billNo = d.counters.bill++;
        // customer: pick given id, else match/create by phone
        let c = customerId ? d.customers.find((x) => x.id === customerId) : null;
        if (!c && o.guest?.phone) {
          c = d.customers.find((x) => x.phone === o.guest.phone);
          if (!c) { c = { id: uid('u'), name: o.guest.name || 'Guest', phone: o.guest.phone, points: 0, due: 0 }; d.customers.push(c); }
        }
        if (c) {
          o.customerId = c.id;
          c.due += o.due;
          c.points += Math.floor(o.totals.total / 100);
        }
        d.kots.forEach((k) => { if (k.orderId === orderId && k.status === 'ready') { k.status = 'served'; } });
      });
    },

    // ---- inventory / purchases ----
    adjustStock(ingId, delta, reason) {
      update((d) => {
        const ing = d.ingredients.find((x) => x.id === ingId);
        if (!ing) return;
        ing.stock = Math.round((ing.stock + delta) * 1000) / 1000;
        d.stockLog.unshift({ id: uid('sl'), ts: Date.now(), ingId, delta, reason });
        d.stockLog = d.stockLog.slice(0, 300);
      });
    },
    addPurchase(p) {
      update((d) => {
        d.purchases.unshift({ ...p, id: uid('p'), no: d.purchases.length + 1 });
        p.items.forEach((it) => {
          const ing = d.ingredients.find((x) => x.id === it.ingId);
          if (ing) {
            ing.stock = Math.round((ing.stock + it.qty) * 1000) / 1000;
            ing.cost = it.cost;
            d.stockLog.unshift({ id: uid('sl'), ts: Date.now(), ingId: it.ingId, delta: it.qty, reason: 'Purchase' });
          }
        });
        const s = d.suppliers.find((x) => x.id === p.supplierId);
        if (s) s.balance += p.total - p.paid;
        if (p.paid > 0) d.expenses.push({ id: uid('x'), date: p.date, cat: 'Raw Material', amount: p.paid, note: 'Purchase from ' + (s?.name || '') });
      });
    },
    paySupplier(id, amt) {
      update((d) => {
        const s = d.suppliers.find((x) => x.id === id);
        if (!s) return;
        s.balance -= amt;
        d.expenses.push({ id: uid('x'), date: Date.now(), cat: 'Raw Material', amount: amt, note: 'Paid to ' + s.name });
      });
    },
    receiveDue(id, amt) {
      update((d) => { const c = d.customers.find((x) => x.id === id); if (c) c.due = Math.max(0, c.due - amt); });
    },
    setAttendance(staffId, day, status) {
      update((d) => {
        const s = d.staff.find((x) => x.id === staffId);
        if (!s) return;
        if (status) s.attendance[day] = status; else delete s.attendance[day];
      });
    },

    // ---- data ----
    replaceAll,
    resetDemo() { replaceAll(seed()); },
    clearAll() {
      const keep = get().settings;
      const e = emptyData(); e.settings = keep;
      replaceAll(e);
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
