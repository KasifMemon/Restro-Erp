create table public.cloud_backups (
  license_id uuid primary key references public.licenses(id) on delete cascade,
  data jsonb not null, size_bytes int not null, device_id text,
  updated_at timestamptz not null default now()
);
alter table public.cloud_backups enable row level security;
revoke all on table public.cloud_backups from anon, authenticated;
