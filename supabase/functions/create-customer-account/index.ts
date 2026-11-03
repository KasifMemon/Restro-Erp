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
  if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, reason: 'bad_request' }, 400); }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ ok: false, reason: 'auth' }, 401);
  const { data: adm } = await db.from('developer_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!adm) return json({ ok: false, reason: 'forbidden' }, 403);

  const action = String(body?.action ?? '');
  const customerId = String(body?.customer_id ?? '');
  const password = String(body?.password ?? '');
  if (password.length < 8 || password.length > 72) return json({ ok: false, reason: 'weak_password' }, 400);
  const { data: cust } = await db.from('customers').select('id, user_id, email').eq('id', customerId).maybeSingle();
  if (!cust) return json({ ok: false, reason: 'no_customer' }, 404);

  if (action === 'create') {
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, reason: 'bad_email' }, 400);
    if (cust.user_id) return json({ ok: false, reason: 'exists' }, 409);
    const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !created?.user) return json({ ok: false, reason: 'create_failed', message: error?.message ?? '' }, 400);
    await db.from('customers').update({ user_id: created.user.id, email }).eq('id', cust.id);
    await db.from('audit_log').insert({ actor: user.id, action: 'customer.login_created', detail: { customer: cust.id } });
    return json({ ok: true, email });
  }
  if (action === 'set_password') {
    if (!cust.user_id) return json({ ok: false, reason: 'no_login' }, 400);
    const { error } = await db.auth.admin.updateUserById(cust.user_id, { password });
    if (error) return json({ ok: false, reason: 'update_failed' }, 400);
    await db.from('audit_log').insert({ actor: user.id, action: 'customer.password_reset', detail: { customer: cust.id } });
    return json({ ok: true });
  }
  return json({ ok: false, reason: 'bad_action' }, 400);
});
