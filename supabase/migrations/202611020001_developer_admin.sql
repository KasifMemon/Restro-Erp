-- RestroERP private developer access. Run this in Supabase SQL Editor.
-- Create the developer's Auth user first in Authentication -> Users.
create table if not exists public.developer_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  note text
);

alter table public.developer_admins enable row level security;
revoke all on table public.developer_admins from anon, authenticated;

create or replace function public.is_developer_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.developer_admins da
    where da.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_developer_admin() from public;
grant execute on function public.is_developer_admin() to authenticated;

-- Add the Auth user's UUID here after creating the account in Supabase Auth:
-- insert into public.developer_admins (user_id, note)
-- values ('PASTE-AUTH-USER-UUID-HERE', 'Primary RestroERP developer');
