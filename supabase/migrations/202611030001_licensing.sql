-- Customers, licences, devices, payments, audit log (developer-only via RLS)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant text not null, owner text not null, phone text, email text, city text, notes text,
  created_at timestamptz not null default now()
);
create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  license_key text not null unique,
  plan text not null default 'Standard',
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  starts_on date not null default current_date,
  expires_on date not null,
  max_devices int not null default 2 check (max_devices between 1 and 50),
  fee numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index on public.licenses(customer_id);
create table public.license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  device_id text not null, label text, app_version text,
  first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
  unique (license_id, device_id)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  license_id uuid references public.licenses(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  paid_on date not null default current_date, method text, note text,
  created_at timestamptz not null default now()
);
create index on public.payments(customer_id);
create index on public.payments(license_id);
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, detail jsonb, created_at timestamptz not null default now()
);
alter table public.customers enable row level security;
alter table public.licenses enable row level security;
alter table public.license_devices enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;
revoke all on table public.customers, public.licenses, public.license_devices, public.payments, public.audit_log from anon;
create policy dev_all_customers on public.customers for all to authenticated using ((select public.is_developer_admin())) with check ((select public.is_developer_admin()));
create policy dev_all_licenses on public.licenses for all to authenticated using ((select public.is_developer_admin())) with check ((select public.is_developer_admin()));
create policy dev_all_devices on public.license_devices for all to authenticated using ((select public.is_developer_admin())) with check ((select public.is_developer_admin()));
create policy dev_all_payments on public.payments for all to authenticated using ((select public.is_developer_admin())) with check ((select public.is_developer_admin()));
create policy dev_read_audit on public.audit_log for select to authenticated using ((select public.is_developer_admin()));

create or replace function public.create_license(p_customer uuid, p_plan text, p_expires date, p_max_devices int default 2, p_fee numeric default 0)
returns public.licenses language plpgsql security definer set search_path = ''
as $$
declare k text; r public.licenses;
begin
  if not public.is_developer_admin() then raise exception 'not authorized'; end if;
  loop
    k := 'RESTRO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    exit when not exists (select 1 from public.licenses where license_key = k);
  end loop;
  insert into public.licenses(customer_id, license_key, plan, expires_on, max_devices, fee)
  values (p_customer, k, coalesce(nullif(p_plan,''),'Standard'), p_expires, p_max_devices, p_fee) returning * into r;
  insert into public.audit_log(actor, action, detail) values ((select auth.uid()), 'license.create', jsonb_build_object('license', r.id, 'customer', p_customer, 'expires_on', p_expires));
  return r;
end $$;
revoke all on function public.create_license(uuid,text,date,int,numeric) from public, anon;
grant execute on function public.create_license(uuid,text,date,int,numeric) to authenticated;

create or replace function public.audit_license_change() returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.audit_log(actor, action, detail) values ((select auth.uid()), 'license.' || lower(tg_op),
    jsonb_build_object('license', coalesce(new.id, old.id), 'status', new.status, 'expires_on', new.expires_on, 'max_devices', new.max_devices));
  return coalesce(new, old);
end $$;
revoke all on function public.audit_license_change() from public, anon, authenticated;
create trigger trg_audit_license after update or delete on public.licenses for each row execute function public.audit_license_change();
