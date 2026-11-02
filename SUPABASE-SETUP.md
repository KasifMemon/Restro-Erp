# RestroERP secure Developer Portal setup

This edition uses Supabase Auth for password verification and a server-side allow-list for developer access. The browser never receives the Supabase service-role key.

## 1. Create the backend
1. Create a Supabase project at https://supabase.com.
2. Open **SQL Editor** and run `supabase/migrations/202611020001_developer_admin.sql`.
3. In **Authentication → Users**, create your developer account with your email and a strong unique password. Disable public sign-ups in Authentication settings if you do not need customer self-registration.
4. Copy that user's UUID from the Auth users list.
5. In SQL Editor run, replacing the placeholder with the UUID:

   ```sql
   insert into public.developer_admins (user_id, note)
   values ('PASTE-AUTH-USER-UUID-HERE', 'Primary RestroERP developer');
   ```

Only UUIDs in `developer_admins` pass the server-side `is_developer_admin()` check. A normal restaurant staff account cannot enter the portal even if it has a valid Supabase login.

## 2. Configure the frontend
Copy `.env.example` to `.env.local` and set:
- `VITE_SUPABASE_URL` to the Project URL.
- `VITE_SUPABASE_ANON_KEY` to the publishable/anon key.

For Vercel, add those same two variables under **Project → Settings → Environment Variables**, then redeploy. Never put a `service_role` or secret key in a `VITE_` variable or in frontend code.

## 3. Sign in
Open **Settings → Business admin**. Use the developer email and password created in Supabase Auth. The app validates the login against Supabase and then checks the server-side developer allow-list. Sign out when finished.

## Security notes and current scope
- Developer portal access is server-authenticated and server-authorized; this is not a password hard-coded in JavaScript or localStorage.
- The session is held in sessionStorage for the current browser tab/session and is rechecked with the server when the portal loads. Expired sessions require signing in again.
- This v3.5 change secures entry to the existing Developer Console. The existing customer/subscription/key records are still stored in this app's local RestroERP browser data; they are **not yet moved to shared Supabase tables**. Therefore this is not yet a complete multi-customer SaaS control plane or server-enforced licence system.
- Do not deploy for commercial use until shared customer/licence tables, RLS policies, server-side key generation/verification, audit logs, and end-to-end tests are added.
