# RestroERP v3.7: Supabase licensing & cloud backup

Your project: **restro-erp** (Mumbai, ref `xlgihybgxfoltwcjgdcu`). The database tables, row-level security and two server functions are already deployed.

## What lives in Supabase
| Item | Where |
|---|---|
| Customers, licences, payments, devices, audit log | tables, developer-only access (RLS) |
| Licence keys | generated on the server (`create_license`) |
| Licence check | Edge Function `verify-license` (checks status, expiry, device limit) |
| Customer cloud backup | Edge Function `cloud-backup` (one copy per licence, max 4 MB) |

Restaurant sales data is **not** synced live. It stays on each device; the cloud backup is a once-a-day copy you can restore on another device.

## One-time steps for you
1. Supabase dashboard -> project **restro-erp** -> Authentication -> Users -> **Add user** (your email + strong password, tick auto-confirm).
2. Authentication -> Sign In / Providers -> turn **off** "Allow new users to sign up".
3. Copy that user's UUID, then in SQL Editor run:
   ```sql
   insert into public.developer_admins (user_id, note) values ('PASTE-UUID', 'Primary developer');
   ```
4. Two builds, from the same code:
   - **Customer build** (give/sell this): `npm run build:customer`. It requires a licence (7-day free trial) and does NOT contain the Developer Console.
   - **Developer build** (keep private, only you): `npm run build:developer`. Shows Settings -> Business admin.
5. Environment variables (Vercel -> Settings -> Environment Variables, or `.env.local`):
   ```
   VITE_SUPABASE_URL=https://xlgihybgxfoltwcjgdcu.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_mECHryco1t2oJFLxwblcYw__o-95stZ
   ```
   (The publishable key is meant to be public. Never use the service_role key in the app.)
6. Deploy **two Vercel projects** from the same repo:
   - Customer: build command `npm run build:customer` (or set `VITE_REQUIRE_LICENSE=1`).
   - Developer: build command `npm run build:developer`, and keep its URL private.

## Selling workflow
1. Developer app -> Customers -> add the restaurant.
2. Licences -> choose customer, plan, expiry, max devices -> **Generate licence key** -> send via the WhatsApp button.
3. Customer opens the customer app URL -> enters the key -> activated (checked online once, then works offline for 7 days between checks).
4. When they pay: Payments -> Record. Renew with **Renew +1 year**. Suspend/Revoke any time; the app locks on its next online check.

## Honest limits
- Licence enforcement is client-side. It stops normal misuse (expiry, sharing across more devices than allowed) but a technically skilled person could modify their copy of the code.
- Offline grace is 7 days; the app also locks if the device clock is moved back.
- The two server functions were deployed and checked for security (anon cannot read tables or call `create_license`), but could not be called end-to-end from the build environment. Do one test: create a customer and licence in the developer app, activate it in the customer app, and press Back up now / Restore.
- Two test licences (`RESTRO-TESTKEY001`, `RESTRO-TESTEXP001`) and a customer "ZZ TEST" remain in the database. They are revoked. Delete the customer "ZZ TEST" in the developer app or SQL Editor.
