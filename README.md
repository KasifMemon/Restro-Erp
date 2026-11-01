# RestroERP – Restaurant POS + ERP

One app for the whole restaurant: tables, billing (GST), KOT/kitchen display, menu & recipes,
inventory, purchases/suppliers, customers (loyalty + udhaar), staff & attendance, expenses, reports.

## Run
    npm install
    npm run dev          # http://localhost:5173
    npm run build        # production build -> dist/ (deploy to Vercel as a Vite project)
    SINGLE=1 npm run build   # one portable dist/index.html (open directly, no server)

## How it works
- Data is saved in the browser (localStorage). Take backups from Settings -> Download backup.
- Dine-in: Tables -> tap table -> add dishes -> Send KOT (kitchen ticket + stock deduction) -> Settle.
- Takeaway / Delivery orders start from the Tables page.
- Bill: discount -> GST per dish (CGST+SGST) -> optional service charge -> round-off. Split Cash/UPI/Card, or leave
  the balance as credit (udhaar) against a customer.
- Menu -> recipe: every dish can list ingredients; inventory drops automatically when the KOT is sent.
- Settings -> "Clear everything & start fresh" removes the demo data before real use.

## Next steps (not built yet)
Firebase Auth + Firestore (multi-device sync, staff roles), online-order integrations (Zomato/Swiggy),
thermal-printer direct ESC/POS, QR table ordering, multi-branch.
