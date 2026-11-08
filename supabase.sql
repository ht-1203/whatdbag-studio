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

-- ─────────────────────────────────────────────────────────────
-- Team chat: one shared room for everyone who can sign in.
-- Any signed-in user can read; people can only send as themselves
-- and delete their own messages.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender_name text not null check (char_length(sender_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "chat read" on public.chat_messages;
drop policy if exists "chat send" on public.chat_messages;
drop policy if exists "chat delete own" on public.chat_messages;

create policy "chat read" on public.chat_messages
  for select to authenticated using (true);
create policy "chat send" on public.chat_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "chat delete own" on public.chat_messages
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The server, not the sender's clock, decides when a message was sent.
create or replace function public.chat_set_created_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists chat_set_created_at on public.chat_messages;
create trigger chat_set_created_at before insert on public.chat_messages
  for each row execute function public.chat_set_created_at();

-- Deliver new and deleted messages to open apps in real time.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
