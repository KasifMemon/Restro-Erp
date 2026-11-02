# RestroERP – Restaurant POS + ERP

Phone / tablet / desktop. Installable (PWA), works offline. React + Vite + Tailwind. Local-first (browser storage).

## Modules
Dashboard · Tables · Billing · Kitchen display · Bills (reprint/void) · Reservations · Menu & recipes (CSV import, printable menu card) ·
Inventory · Purchases & suppliers · Customers (loyalty redeem + credit) · Staff, attendance & PIN roles · Expenses · Cash register (day close) ·
Reports (GST, items, profit) · Settings (business, receipt designer, printers, tables, backup)

## Print engine
One document model → browser print (58/80mm/A4) · ESC/POS text · ESC/POS graphic (Hindi/Gujarati, logo, QR).
Transports: WebUSB, Web Serial, Web Bluetooth (BLE), RawBT (Android). UPI payment QR with exact amount, review QR, cash-drawer pulse, separate kitchen printer.
Source: src/print.js, src/escpos.js, src/printer.js

## Backups
Auto snapshots every 10 min when data changed (IndexedDB, last N days) · optional folder sync · Download / Share · restore with safety copy. Source: src/backup.js

## Run
    npm install
    npm run dev                # http://localhost:5173
    npm run build              # -> dist/  (deploy to Vercel as a Vite project)
    SINGLE=1 npm run build     # one portable dist/index.html

## Deploy
Push to GitHub -> Vercel -> Add New Project -> import (Vite auto-detected). vercel.json sets no-cache for the service worker.

## Hand-over
docs/USER-GUIDE.md is written for the restaurant owner.

## Not built yet
Cloud sync / multi-device (Firebase), licence & multi-tenant management, Hindi/Gujarati UI translation, Zomato/Swiggy integration, QR table ordering, LAN-printer agent.

## v3.1 offline administration additions
- Language preference: English, Gujarati and Hindi. The main navigation labels are translated; individual business screens still contain English labels and need a full translation pass.
- Local outlet directory in Settings → Business admin. It stores outlet contact/profile records on this device. It does not yet isolate orders, stock, staff, or reports by outlet and does not sync between branches.
- Local licence-key record and format check. This is not secure licence enforcement; production activation needs signed keys or a licensing service.
- Integration URL setting and basic local system diagnostics. No delivery aggregator, payment, WhatsApp, or online-ordering API is connected.

Cloud database and cross-device sync remain intentionally out of scope. This build must not be marketed as a production multi-branch ERP until outlet-level data isolation, full translations, and end-to-end testing are completed.
