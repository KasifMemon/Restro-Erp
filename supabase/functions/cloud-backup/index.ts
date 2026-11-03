import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const MAX_BYTES = 4 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);
  const raw = await req.text();
  if (raw.length > MAX_BYTES + 4096) return json({ ok: false, reason: 'too_large' }, 413);
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, reason: 'bad_request' }, 400); }

  const key = String(body?.key ?? '').trim().toUpperCase();
  const deviceId = String(body?.device_id ?? '');
  const action = String(body?.action ?? '');
  if (!/^RESTRO-[A-Z0-9]{6,12}$/.test(key) || deviceId.length < 8 || !['put', 'get', 'info'].includes(action)) {
    return json({ ok: false, reason: 'bad_request' }, 400);
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: lic } = await db.from('licenses').select('id, status, expires_on').eq('license_key', key).maybeSingle();
  const today = new Date().toISOString().slice(0, 10);
  if (!lic || lic.status !== 'active' || lic.expires_on < today) return json({ ok: false, reason: 'license' }, 403);
  const { data: dev } = await db.from('license_devices').select('id').eq('license_id', lic.id).eq('device_id', deviceId).maybeSingle();
  if (!dev) return json({ ok: false, reason: 'device' }, 403);

  if (action === 'put') {
    const payload = body?.data;
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.menu) || !Array.isArray(payload.orders)) {
      return json({ ok: false, reason: 'bad_data' }, 400);
    }
    const size = new TextEncoder().encode(JSON.stringify(payload)).length;
    if (size > MAX_BYTES) return json({ ok: false, reason: 'too_large' }, 413);
    const { error } = await db.from('cloud_backups').upsert({
      license_id: lic.id, data: payload, size_bytes: size, device_id: deviceId, updated_at: new Date().toISOString(),
    });
    if (error) return json({ ok: false, reason: 'db' }, 500);
    return json({ ok: true, size, updated_at: new Date().toISOString() });
  }
  const { data: row } = await db.from('cloud_backups').select('data, size_bytes, updated_at').eq('license_id', lic.id).maybeSingle();
  if (!row) return json({ ok: true, exists: false });
  if (action === 'info') return json({ ok: true, exists: true, size: row.size_bytes, updated_at: row.updated_at });
  return json({ ok: true, exists: true, data: row.data, size: row.size_bytes, updated_at: row.updated_at });
});
