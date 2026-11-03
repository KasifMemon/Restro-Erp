alter table public.licenses add column if not exists profile jsonb, add column if not exists profile_updated_at timestamptz;
