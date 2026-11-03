import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import LicenseGate from './License.jsx';
import { installAutoUnlock } from './sound.js';
installAutoUnlock();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <LicenseGate><App /></LicenseGate>
    </StoreProvider>
  </React.StrictMode>
);

// Installable + works offline (only over http/https, e.g. on Vercel)
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
