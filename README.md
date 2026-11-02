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
