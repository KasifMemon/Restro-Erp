import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ valid: false, reason: 'method' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ valid: false, reason: 'bad_request' }, 400); }
  const key = String(body?.key ?? '').trim().toUpperCase();
  const deviceId = String(body?.device_id ?? '').slice(0, 80);
  const label = String(body?.label ?? '').slice(0, 80);
  const appVersion = String(body?.app_version ?? '').slice(0, 20);
  if (!/^RESTRO-[A-Z0-9]{6,12}$/.test(key) || deviceId.length < 8) {
    return json({ valid: false, reason: 'bad_key' });
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: lic } = await db.from('licenses')
    .select('id, plan, status, starts_on, expires_on, max_devices, customers(restaurant)')
    .eq('license_key', key).maybeSingle();
  if (!lic) return json({ valid: false, reason: 'not_found' });

  const today = new Date().toISOString().slice(0, 10);
  const base = {
    plan: lic.plan,
    expires_on: lic.expires_on,
    restaurant: (lic as any).customers?.restaurant ?? '',
    server_time: Date.now(),
    grace_days: 7,
  };
  if (lic.status !== 'active') return json({ valid: false, reason: lic.status, ...base });
  if (lic.starts_on > today) return json({ valid: false, reason: 'not_started', ...base });
  if (lic.expires_on < today) return json({ valid: false, reason: 'expired', ...base });

  const { data: devices } = await db.from('license_devices').select('device_id').eq('license_id', lic.id);
  const known = (devices ?? []).some((d) => d.device_id === deviceId);
  if (!known && (devices?.length ?? 0) >= lic.max_devices) {
    return json({ valid: false, reason: 'device_limit', ...base });
  }
  await db.from('license_devices').upsert(
    { license_id: lic.id, device_id: deviceId, label, app_version: appVersion, last_seen: new Date().toISOString() },
    { onConflict: 'license_id,device_id' },
  );
  return json({ valid: true, ...base });
});
