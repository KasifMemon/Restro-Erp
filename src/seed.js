import { calcTotals, DAY, startOfDay } from './utils';

export const defaultSettings = {
  name: 'Spice Garden Restaurant',
  address: '12, Main Road, Your City - 380001',
  phone: '+91 98765 43210',
  gstin: '',
  taxInclusive: false,
  serviceCharge: 0,
  upiId: '',
  footer: 'Thank you! Visit again.',
};

const cats = [
  ['c1', 'Starters'], ['c2', 'Main Course'], ['c3', 'Breads'],
  ['c4', 'Rice & Biryani'], ['c5', 'Beverages'], ['c6', 'Desserts'],
];

// id, name, unit, stock, min, cost per unit
const ings = [
  ['i1', 'Paneer', 'kg', 12, 3, 320], ['i2', 'Chicken', 'kg', 20, 5, 220], ['i3', 'Basmati Rice', 'kg', 40, 10, 110],
  ['i4', 'Wheat Flour (Atta)', 'kg', 30, 8, 40], ['i5', 'Cooking Oil', 'l', 25, 6, 140], ['i6', 'Tomato', 'kg', 15, 5, 40],
  ['i7', 'Onion', 'kg', 25, 8, 35], ['i8', 'Milk', 'l', 20, 6, 60], ['i9', 'Butter', 'kg', 5, 1.5, 520],
  ['i10', 'Cream', 'l', 4, 1, 240], ['i11', 'Tea Leaves', 'kg', 2, 0.5, 450], ['i12', 'Sugar', 'kg', 15, 4, 45],
  ['i13', 'Soft Drink Bottle', 'pcs', 48, 12, 18], ['i14', 'Ice Cream', 'l', 6, 2, 260], ['i15', 'Mixed Vegetables', 'kg', 10, 3, 60],
  ['i16', 'Eggs', 'pcs', 60, 12, 7], ['i17', 'Curd', 'kg', 8, 2, 70],
];

// id, name, cat, price, veg, recipe[[ing, qty]]
const items = [
  ['m1', 'Paneer Tikka', 'c1', 260, 1, [['i1', 0.15], ['i7', 0.05], ['i5', 0.02]]],
  ['m2', 'Veg Spring Roll', 'c1', 160, 1, [['i15', 0.1], ['i5', 0.03]]],
  ['m3', 'Chicken 65', 'c1', 280, 0, [['i2', 0.2], ['i5', 0.05]]],
  ['m4', 'Chicken Tikka', 'c1', 320, 0, [['i2', 0.25], ['i17', 0.05]]],
  ['m5', 'Hara Bhara Kebab', 'c1', 220, 1, [['i15', 0.15], ['i5', 0.03]]],
  ['m6', 'Paneer Butter Masala', 'c2', 280, 1, [['i1', 0.15], ['i6', 0.15], ['i9', 0.02], ['i10', 0.03]]],
  ['m7', 'Dal Makhani', 'c2', 220, 1, [['i9', 0.02], ['i10', 0.03], ['i6', 0.1]]],
  ['m8', 'Kadai Paneer', 'c2', 290, 1, [['i1', 0.15], ['i6', 0.1], ['i7', 0.08]]],
  ['m9', 'Butter Chicken', 'c2', 340, 0, [['i2', 0.25], ['i6', 0.15], ['i9', 0.03], ['i10', 0.04]]],
  ['m10', 'Chicken Curry', 'c2', 310, 0, [['i2', 0.25], ['i6', 0.12], ['i7', 0.1]]],
  ['m11', 'Mix Veg', 'c2', 210, 1, [['i15', 0.2], ['i5', 0.03]]],
  ['m12', 'Egg Curry', 'c2', 190, 0, [['i16', 2], ['i6', 0.1], ['i7', 0.08]]],
  ['m13', 'Butter Naan', 'c3', 45, 1, [['i4', 0.08], ['i9', 0.01]]],
  ['m14', 'Tandoori Roti', 'c3', 25, 1, [['i4', 0.06]]],
  ['m15', 'Garlic Naan', 'c3', 60, 1, [['i4', 0.08], ['i9', 0.01]]],
  ['m16', 'Lachha Paratha', 'c3', 50, 1, [['i4', 0.09], ['i5', 0.01]]],
  ['m17', 'Veg Biryani', 'c4', 240, 1, [['i3', 0.15], ['i15', 0.1], ['i5', 0.03]]],
  ['m18', 'Chicken Biryani', 'c4', 300, 0, [['i3', 0.15], ['i2', 0.2], ['i5', 0.03]]],
  ['m19', 'Jeera Rice', 'c4', 140, 1, [['i3', 0.15]]],
  ['m20', 'Steamed Rice', 'c4', 110, 1, [['i3', 0.15]]],
  ['m21', 'Masala Chai', 'c5', 30, 1, [['i8', 0.1], ['i11', 0.005], ['i12', 0.01]]],
  ['m22', 'Cold Coffee', 'c5', 120, 1, [['i8', 0.2], ['i12', 0.02]]],
  ['m23', 'Fresh Lime Soda', 'c5', 70, 1, [['i12', 0.02]]],
  ['m24', 'Soft Drink', 'c5', 50, 1, [['i13', 1]]],
  ['m25', 'Sweet Lassi', 'c5', 90, 1, [['i17', 0.15], ['i12', 0.02]]],
  ['m26', 'Gulab Jamun (2 pc)', 'c6', 80, 1, [['i8', 0.05], ['i12', 0.03]]],
  ['m27', 'Ice Cream', 'c6', 100, 1, [['i14', 0.1]]],
  ['m28', 'Brownie with Ice Cream', 'c6', 180, 1, [['i14', 0.1], ['i9', 0.02]]],
];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emptyData() {
  return {
    settings: { ...defaultSettings },
    categories: [], menu: [], tables: [], orders: [], kots: [], ingredients: [], stockLog: [],
    suppliers: [], purchases: [], customers: [], staff: [], expenses: [], counters: { order: 1, kot: 1, bill: 1 },
  };
}

export function seed({ history = true } = {}) {
  const settings = { ...defaultSettings };
  const categories = cats.map(([id, name]) => ({ id, name }));
  const ingredients = ings.map(([id, name, unit, stock, min, cost]) => ({ id, name, unit, stock, min, cost }));
  const menu = items.map(([id, name, catId, price, veg, recipe]) => ({
    id, name, catId, price, veg: !!veg, gst: 5, available: true,
    recipe: recipe.map(([ingId, qty]) => ({ ingId, qty })),
  }));
  const tables = [];
  for (let i = 1; i <= 6; i++) tables.push({ id: 't' + i, name: 'T' + i, seats: 4, section: 'AC Hall' });
  for (let i = 1; i <= 4; i++) tables.push({ id: 'f' + i, name: 'F' + i, seats: 6, section: 'Family' });
  for (let i = 1; i <= 4; i++) tables.push({ id: 'r' + i, name: 'R' + i, seats: i < 3 ? 2 : 4, section: 'Rooftop' });

  const suppliers = [
    { id: 's1', name: 'Fresh Veg Mandi', phone: '9800000001', balance: 0 },
    { id: 's2', name: 'Sharma Dairy', phone: '9800000002', balance: 1200 },
    { id: 's3', name: 'City Meat Traders', phone: '9800000003', balance: 0 },
  ];
  const customers = [
    { id: 'u1', name: 'Rahul Mehta', phone: '9811111111', points: 42, due: 0 },
    { id: 'u2', name: 'Priya Shah', phone: '9822222222', points: 18, due: 350 },
    { id: 'u3', name: 'Imran Khan', phone: '9833333333', points: 7, due: 0 },
  ];
  const staff = [
    { id: 'e1', name: 'Ramesh Patel', role: 'Manager', phone: '9844444441', salary: 28000, attendance: {} },
    { id: 'e2', name: 'Suresh Kumar', role: 'Chef', phone: '9844444442', salary: 24000, attendance: {} },
    { id: 'e3', name: 'Anita Devi', role: 'Cashier', phone: '9844444443', salary: 15000, attendance: {} },
    { id: 'e4', name: 'Vikas Yadav', role: 'Waiter', phone: '9844444444', salary: 12000, attendance: {} },
    { id: 'e5', name: 'Mohan Lal', role: 'Waiter', phone: '9844444445', salary: 12000, attendance: {} },
  ];

  const orders = [];
  const expenses = [];
  let no = 1;
  if (history) {
    const r = rng(7);
    const today = startOfDay(Date.now());
    for (let back = 6; back >= 0; back--) {
      const day = today - back * DAY;
      const count = 8 + Math.floor(r() * 8);
      for (let k = 0; k < count; k++) {
        let ts = day + (11 + r() * 10.5) * 3600000;
        if (ts > Date.now()) ts = Date.now() - r() * 3600000 * 3;
        if (ts < day) ts = day + 3600000;
        const type = r() < 0.65 ? 'dine' : r() < 0.6 ? 'take' : 'delivery';
        const n = 1 + Math.floor(r() * 4);
        const chosen = new Set();
        const lines = [];
        for (let j = 0; j < n; j++) {
          const m = menu[Math.floor(r() * menu.length)];
          if (chosen.has(m.id)) continue;
          chosen.add(m.id);
          const qty = 1 + Math.floor(r() * 3);
          lines.push({ lineId: 'h' + no + '-' + j, itemId: m.id, name: m.name, catId: m.catId, price: m.price, gst: m.gst, qty, sent: qty, note: '' });
        }
        const tb = tables[Math.floor(r() * tables.length)];
        const o = {
          id: 'h' + no, no, type, tableId: type === 'dine' ? tb.id : null, items: lines, guest: {},
          discount: { type: 'pct', value: r() < 0.12 ? 10 : 0 }, status: 'paid', createdAt: ts - 2400000, paidAt: ts,
          due: 0, billNo: no, customerId: null,
        };
        o.totals = calcTotals(o, settings);
        const p = r();
        o.payments = [{ mode: p < 0.4 ? 'cash' : p < 0.85 ? 'upi' : 'card', amount: o.totals.total }];
        orders.push(o);
        no++;
      }
      expenses.push({ id: 'x' + back + 'a', date: day + 9 * 3600000, cat: 'Raw Material', amount: 2500 + Math.round(r() * 2500), note: 'Daily vegetables & dairy' });
      if (back % 3 === 0) expenses.push({ id: 'x' + back + 'b', date: day + 10 * 3600000, cat: 'Utilities', amount: 800 + Math.round(r() * 700), note: 'Gas cylinder / misc' });
    }
  }

  return {
    settings, categories, menu, tables, orders, kots: [], ingredients, stockLog: [],
    suppliers, purchases: [], customers, staff, expenses, counters: { order: no, kot: 1, bill: no },
  };
}
