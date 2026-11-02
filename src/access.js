export const ALL = ['dashboard', 'tables', 'pos', 'kitchen', 'orders', 'reservations', 'menu', 'inventory', 'purchases', 'customers', 'staff', 'expenses', 'dayclose', 'reports', 'settings'];

// What each staff role can open once PIN login is enabled
export const ACCESS = {
  Owner: ALL,
  Manager: ALL,
  Cashier: ['tables', 'pos', 'kitchen', 'orders', 'reservations', 'customers', 'expenses', 'dayclose'],
  Waiter: ['tables', 'pos', 'reservations'],
  Chef: ['kitchen', 'menu', 'inventory'],
  Cook: ['kitchen'],
  Helper: ['kitchen', 'tables'],
  Delivery: ['orders', 'tables'],
};
export const canVoid = (role) => role === 'Owner' || role === 'Manager';
