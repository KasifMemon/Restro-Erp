create sequence if not exists public.sync_seq;
create table public.sync_records (
  license_id uuid not null references public.licenses(id) on delete cascade,
  coll text not null, rec_id text not null, data jsonb, deleted boolean not null default false,
  seq bigint not null default nextval('public.sync_seq'), device_id text, updated_at timestamptz not null default now(),
  primary key (license_id, coll, rec_id)
);
create index sync_records_license_seq on public.sync_records (license_id, seq);
create or replace function public.sync_stamp() returns trigger language plpgsql set search_path = ''
as $$ begin new.seq := nextval('public.sync_seq'); new.updated_at := now(); return new; end $$;
create trigger trg_sync_stamp before insert or update on public.sync_records for each row execute function public.sync_stamp();
create or replace function public.can_sync(lid uuid) returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.licenses l join public.customers c on c.id = l.customer_id
  where l.id = lid and c.user_id = (select auth.uid()) and l.status = 'active' and l.expires_on >= current_date); $$;
revoke all on function public.can_sync(uuid) from public, anon;
grant execute on function public.can_sync(uuid) to authenticated;
alter table public.sync_records enable row level security;
revoke all on table public.sync_records from anon;
create policy sync_select on public.sync_records for select to authenticated using ((select public.can_sync(license_id)));
create policy sync_insert on public.sync_records for insert to authenticated with check ((select public.can_sync(license_id)));
create policy sync_update on public.sync_records for update to authenticated using ((select public.can_sync(license_id))) with check ((select public.can_sync(license_id)));
