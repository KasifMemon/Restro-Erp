# RestroERP

Restaurant POS + ERP: billing, tables, kitchen display, inventory, thermal printing, UPI QR, backups and Supabase-based licensing.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in the two Supabase values
npm run dev                  # http://localhost:5173
```
Windows: double-click `START-WINDOWS.bat`.

## Builds
- `npm run build:customer`: what customers get (licence + 7-day trial, no developer console)
- `npm run build:developer`: private build with Settings -> Business admin
- `SINGLE=1 npm run build`: single portable HTML file

## Deploy on Vercel
Import this repo, framework Vite, output `dist`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and choose the build command above. See `SUPABASE-SETUP.md` for the backend, licensing workflow and the two-project setup. `docs/USER-GUIDE.md` is the end-user guide.

## Backend
`supabase/migrations/` (SQL, run in order) and `supabase/functions/` (Edge Functions `verify-license`, `cloud-backup`; deploy with `supabase functions deploy <name> --no-verify-jwt`).
