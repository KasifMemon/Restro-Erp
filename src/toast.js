export const toast = (msg, tone = 'info') => window.dispatchEvent(new CustomEvent('restro-toast', { detail: { msg, tone, id: Math.random() } }));
