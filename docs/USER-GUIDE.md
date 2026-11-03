# RestroERP – Owner's Quick Guide

## 1. First start (2 minutes)
Open the app → follow the setup screen: restaurant name, logo, GSTIN/FSSAI, **UPI ID**, tables, and whether to start empty or with a sample menu.
Everything can be changed later in **Settings**.

## 2. Daily routine
1. **Cash Register** → enter opening cash.
2. Waiter/cashier: **Tables** → tap table → add dishes → **Send KOT** (kitchen ticket prints) .
3. Kitchen: **Kitchen** screen → Start cooking → Ready → Served.
4. Customer asks for bill: **Print Bill** (has a UPI QR for the exact amount) → customer pays → **Settle** → choose Cash / UPI / Card (or credit for regular customers).
5. Night: **Cash Register** → count drawer → **Close the day**. Check **Reports**.

## 3. Printing
Settings → **Printers**. Two printers can be set: Bill and Kitchen (KOT).

| Your printer | How to connect |
|---|---|
| Any normal printer / A4 / PDF / iPhone AirPrint | Choose **Browser print** |
| Thermal printer with **USB cable** (Chrome/Edge, PC or Android) | **Thermal – direct → USB → Connect printer** (reconnects by itself next time) |
| **BLE** Bluetooth thermal printer | Thermal → Bluetooth → Connect (must reconnect when the page is reopened) |
| Cheap **classic-Bluetooth** 58mm printer (most common) | Websites cannot reach these. Use the USB cable, or on Android install the free **RawBT** app, pair the printer inside it, and choose "RawBT" |
| LAN/Wi-Fi network printer | Browser print (choose the printer in the print dialog) |

Tips
* 58mm or 80mm — choose the paper width that matches the roll.
* Tick **Print as image** if dish names are in Hindi/Gujarati or you want the logo — slower but exact.
* **Print test** in Settings confirms everything. If the thermal printer fails, the app falls back to the normal print dialog and shows a message.
* Cash drawer (RJ11 on the printer) opens on cash payments if enabled.

## 4. Payment QR on the bill
Add your **UPI ID** (Settings → Business). The provisional bill (before payment) and any credit balance print a QR with the exact amount — customers scan, pay, done. Change this in Settings → Bill & receipt.

## 5. Backups — please read
* The app backs itself up automatically (last 7 days) **inside the device**.
* That is not enough if the phone/PC is lost or browser data is cleared. Once a week:
  Settings → Backup & data → **Share** (WhatsApp / Google Drive) or **Download**.
* On a PC with Chrome/Edge, choose a Google Drive / OneDrive folder under **Auto-save to a folder** — every backup then syncs to the cloud automatically.
* Restore: Settings → Backup & data → pick a backup → ↻ Restore (a safety copy is taken first).

## 6. Staff PINs
Staff → edit a person → 4-digit PIN. As soon as one Owner/Manager has a PIN, the lock screen turns on and each role sees only its modules
(Cashier: billing/bills/cash register · Waiter: tables+billing · Chef/Cook: kitchen · Delivery: bills). Keep two managers with PINs.

## 7. Moving a menu in
Menu → **Import CSV** (Excel → Save as CSV): `name,category,price,veg,gst`. Download the template inside the import window.
Stock items can be imported the same way in Inventory.

## 8. Good to know
* All data is stored on the device you use. Two devices = two separate sets of data until cloud sync is added.
* GST: 5% default per dish (no input credit). Change per dish. Voiding a bill removes it from reports.
* Loyalty: customers earn points (default 1 per ₹100) and redeem at settle time.

## Business admin (offline)
Open Settings → Business admin to register outlet profile records, save a local licence-key record, configure a future integration URL, and review basic local diagnostics. Outlet records are currently an owner directory only; transactions and inventory are not separated by outlet. Licence-key format checking is not cryptographic verification and should not be treated as anti-piracy protection.

## Language
Open Settings → Business → App language and choose English, Gujarati, or Hindi. The primary navigation changes language; not every page label has been translated yet.
