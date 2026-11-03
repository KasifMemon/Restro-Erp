alter table public.customers add column if not exists user_id uuid unique references auth.users(id) on delete set null;
