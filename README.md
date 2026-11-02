# RestroERP – Restaurant POS + ERP

One app for the whole restaurant. Works on phone, tablet and desktop; installable as an app (PWA) and works offline.

## Modules
Dashboard · Tables · Billing (POS) · Kitchen display · Bills history · Reservations · Menu & recipes · Inventory ·
Purchases & suppliers · Customers (loyalty + credit) · Staff & attendance · Expenses · Cash register (day close) · Reports · Settings

## Run
    npm install
    npm run dev                # http://localhost:5173
    npm run build              # production build -> dist/   (deploy to Vercel as a Vite project)
    SINGLE=1 npm run build     # one portable dist/index.html (double-click to open)

## Deploy to Vercel
Push this folder to GitHub -> Vercel -> Add New Project -> import. Framework "Vite" is auto-detected (build: npm run build, output: dist).

## Using it
- Dine-in: Tables -> tap table -> add dishes -> Send KOT (kitchen ticket + stock deduction) -> Settle. Move table from the order header.
- Takeaway / Delivery start from the Tables page. Reservations can be seated straight into billing.
- Bill: discount -> GST per dish (CGST+SGST) -> optional service charge -> round-off. Split Cash/UPI/Card or leave the balance as customer credit.
- UPI QR: add your UPI ID in Settings; the settle screen shows a QR for the amount, and it prints on the provisional bill.
- Bills: search any bill, reprint, share on WhatsApp, or void (owner/manager) — voids drop out of sales and GST reports.
- Cash register: enter opening cash, count the drawer, close the day; history shows short/excess.
- PIN login: give an Owner/Manager a 4-digit PIN in Staff to turn on the lock screen. Roles then see only their modules
  (Cashier: billing/bills/cash register - Waiter: tables+billing - Chef/Cook: kitchen - Delivery: bills).
- Data lives in the browser. Settings -> Download backup regularly. "Clear everything & start fresh" removes the demo data.

## Not built yet
Firebase Auth + Firestore (multi-device live sync), Zomato/Swiggy integration, direct ESC/POS thermal printing, QR table ordering, multi-branch.
