-- whatdbag studio: one private row per user, protected by Row Level Security.
-- Safe to run more than once.

create table if not exists public.studio_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.studio_data enable row level security;

drop policy if exists "owner read" on public.studio_data;
drop policy if exists "owner insert" on public.studio_data;
drop policy if exists "owner update" on public.studio_data;
drop policy if exists "owner delete" on public.studio_data;

create policy "owner read" on public.studio_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner insert" on public.studio_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner update" on public.studio_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "owner delete" on public.studio_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Guard against oversized payloads (5 MB).
alter table public.studio_data drop constraint if exists payload_size;
alter table public.studio_data add constraint payload_size check (pg_column_size(payload) < 5242880);
