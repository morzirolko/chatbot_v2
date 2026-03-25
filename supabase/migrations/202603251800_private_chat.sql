create extension if not exists pgcrypto;

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  realtime_channel_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(trim(content)) > 0),
  openai_response_id text,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_created_at_idx
  on public.chat_messages (thread_id, created_at);

create or replace function public.set_chat_threads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_chat_thread_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.chat_threads
  set updated_at = now()
  where id = coalesce(new.thread_id, old.thread_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists set_chat_threads_updated_at on public.chat_threads;
drop trigger if exists touch_chat_thread_updated_at on public.chat_messages;

create trigger set_chat_threads_updated_at
before update on public.chat_threads
for each row
execute function public.set_chat_threads_updated_at();

create trigger touch_chat_thread_updated_at
after insert or update or delete on public.chat_messages
for each row
execute function public.touch_chat_thread_updated_at();

alter table public.chat_threads disable row level security;
alter table public.chat_messages disable row level security;

revoke all on public.chat_threads from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
