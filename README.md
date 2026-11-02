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


## v3.2 Developer console update
Open Settings → Business admin to access the Developer Console. It includes local outlet directory management (add/enable/disable/remove), local licence record, integration base URL, global language and backup settings, system diagnostics, full JSON export, and JSON backup restore. Importing a backup replaces all data on the current browser/device and asks for confirmation. Export a backup before importing.

Important limitations: this is a client-side local administration console, not a secure server-side super-admin portal. Local licence records are not cryptographically verified. Outlet records are not yet connected to outlet-specific sales, inventory, staff, or reports. Vercel hosts the frontend but does not create shared storage or cross-device sync. Do not expose this installation as a multi-tenant SaaS without server-side authentication, authorization, and a shared backend.


## v3.3 Master Admin additions
- Settings → Business admin now includes a Master Admin customer register for restaurant accounts, owner/contact details, subscription plan/fee, start and expiry dates, licence reference, and installed app version.
- Customer records can be added, edited, deleted, and have manual payment entries recorded. Expiry is displayed from the entered expiry date.
- All Master Admin records are stored inside this browser's local settings and included in the JSON backup/export. They do not sync to other devices.
- Payment entries are manual notes only: there is no UPI/bank gateway verification, invoicing, automatic renewal, or remote licence activation. Expiry does not technically lock the POS.
- This is a local prototype. A real SaaS master admin requires a backend database, secure admin authentication, server-side authorization, audit logs, tenant isolation, payment gateway webhooks, and signed licence enforcement.


## v3.4 Subscription key generator
- Master Admin includes a per-customer subscription key generator. Select one restaurant account, choose a plan and expiry date, and generate a unique formatted key.
- The generated key is assigned to that customer's licence field and stored in the local key register. Keys can be copied and marked revoked. A new active key for the same customer supersedes the previous active key in the local register.
- Keys are generated with the browser cryptographic random number generator. However, local storage is not a secure licensing authority: key validation, expiry enforcement, anti-tamper protection, and customer/device activation require a server-side licensing API.
