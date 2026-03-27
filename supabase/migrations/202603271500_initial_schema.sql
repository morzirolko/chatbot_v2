create extension if not exists pgcrypto;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  12582912,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
    'text/csv'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_threads_title_not_blank
    check (title is null or char_length(trim(title)) > 0)
);

create index if not exists chat_threads_user_id_updated_at_idx
  on public.chat_threads (user_id, updated_at desc, id desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_id_created_at_id_idx
  on public.chat_messages (thread_id, created_at, id);

create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  uploaded_by_user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid references public.chat_messages (id) on delete cascade,
  kind text not null check (kind in ('image', 'pdf', 'text')),
  original_name text not null check (char_length(trim(original_name)) > 0),
  mime_type text not null check (char_length(trim(mime_type)) > 0),
  size_bytes bigint not null check (size_bytes > 0),
  object_path text not null unique check (char_length(trim(object_path)) > 0),
  extracted_text text,
  created_at timestamptz not null default now(),
  constraint chat_attachments_text_payload_check
    check (
      (kind = 'image' and extracted_text is null)
      or (kind in ('pdf', 'text') and extracted_text is not null)
    )
);

create index if not exists chat_attachments_message_id_created_at_idx
  on public.chat_attachments (message_id, created_at, id)
  where message_id is not null;

create index if not exists chat_attachments_staged_by_user_idx
  on public.chat_attachments (uploaded_by_user_id, created_at desc, id desc)
  where message_id is null;

create table if not exists public.user_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  question_count integer not null default 0 check (question_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null unique
    check (char_length(trim(session_token_hash)) > 0),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  display_name text check (char_length(trim(display_name)) > 0),
  is_anonymous boolean not null default false,
  supabase_access_token_encrypted text not null
    check (char_length(trim(supabase_access_token_encrypted)) > 0),
  supabase_refresh_token_encrypted text not null
    check (char_length(trim(supabase_refresh_token_encrypted)) > 0),
  supabase_access_token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_refreshed_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
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
set search_path = public
as $$
begin
  update public.chat_threads
  set updated_at = now()
  where id = coalesce(new.thread_id, old.thread_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row
execute function public.set_updated_at();

drop trigger if exists user_usage_set_updated_at on public.user_usage;
create trigger user_usage_set_updated_at
before update on public.user_usage
for each row
execute function public.set_updated_at();

drop trigger if exists app_sessions_set_updated_at on public.app_sessions;
create trigger app_sessions_set_updated_at
before update on public.app_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists chat_messages_touch_thread_updated_at on public.chat_messages;
create trigger chat_messages_touch_thread_updated_at
after insert or update or delete on public.chat_messages
for each row
execute function public.touch_chat_thread_updated_at();

create or replace function public.list_chat_thread_summaries(target_user_id uuid)
returns table (
  id uuid,
  title text,
  latest_message_content text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    threads.id,
    threads.title,
    latest_message.content,
    threads.created_at,
    threads.updated_at
  from public.chat_threads as threads
  left join lateral (
    select messages.content
    from public.chat_messages as messages
    where messages.thread_id = threads.id
    order by messages.created_at desc, messages.id desc
    limit 1
  ) as latest_message on true
  where threads.user_id = target_user_id
  order by threads.updated_at desc, threads.id desc;
$$;

create or replace function public.chat_thread_id_from_realtime_topic(topic text)
returns uuid
language sql
immutable
as $$
  select
    case
      when topic ~ '^chat:thread:[0-9a-fA-F-]{36}$' then split_part(topic, ':', 3)::uuid
      else null
    end;
$$;

create or replace function public.can_access_chat_realtime_topic(topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_threads
    where id = public.chat_thread_id_from_realtime_topic(topic)
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.chat_thread_id_from_realtime_topic(text) from public;
revoke all on function public.can_access_chat_realtime_topic(text) from public;
grant execute on function public.can_access_chat_realtime_topic(text) to authenticated;

alter table realtime.messages enable row level security;

drop policy if exists "authenticated users can receive chat broadcasts"
  on realtime.messages;
drop policy if exists "authenticated users can send chat broadcasts"
  on realtime.messages;

create policy "authenticated users can receive chat broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and public.can_access_chat_realtime_topic(realtime.topic())
);

create policy "authenticated users can send chat broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and public.can_access_chat_realtime_topic(realtime.topic())
);

create or replace function public.increment_user_question_count(target_user_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  next_count integer;
begin
  insert into public.user_usage (user_id, question_count)
  values (target_user_id, 1)
  on conflict (user_id) do update
  set
    question_count = public.user_usage.question_count + 1,
    updated_at = now()
  returning question_count into next_count;

  return next_count;
end;
$$;

create or replace function public.create_user_message_with_attachments(
  target_user_id uuid,
  target_thread_id uuid,
  target_content text,
  target_attachment_ids uuid[],
  target_created_at timestamptz default now()
)
returns table (
  thread_id uuid,
  message_id uuid
)
language plpgsql
set search_path = public
as $$
declare
  new_message_id uuid;
  expected_attachment_count integer := coalesce(cardinality(target_attachment_ids), 0);
  attached_attachment_count integer := 0;
begin
  if target_thread_id is null or target_user_id is null then
    raise exception 'chat_thread_not_found';
  end if;

  if coalesce(trim(target_content), '') = '' then
    raise exception 'message_content_required';
  end if;

  if not exists (
    select 1
    from public.chat_threads
    where id = target_thread_id
      and user_id = target_user_id
  ) then
    raise exception 'chat_thread_not_found';
  end if;

  insert into public.chat_messages (
    thread_id,
    role,
    content,
    created_at
  )
  values (
    target_thread_id,
    'user',
    target_content,
    target_created_at
  )
  returning id into new_message_id;

  if expected_attachment_count > 0 then
    update public.chat_attachments as attachments
    set message_id = new_message_id
    where attachments.id = any(target_attachment_ids)
      and attachments.uploaded_by_user_id = target_user_id
      and attachments.message_id is null;

    get diagnostics attached_attachment_count = row_count;

    if attached_attachment_count <> expected_attachment_count then
      raise exception 'invalid_attachment_selection';
    end if;
  end if;

  return query
  select target_thread_id, new_message_id;
end;
$$;

create or replace function public.migrate_anonymous_chat_data(
  source_user_id uuid,
  destination_user_id uuid
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  moved_thread_count integer := 0;
  moved_attachment_count integer := 0;
begin
  if source_user_id is null or destination_user_id is null then
    return false;
  end if;

  if source_user_id = destination_user_id then
    delete from public.user_usage
    where user_id = source_user_id;

    return false;
  end if;

  update public.chat_threads
  set user_id = destination_user_id
  where user_id = source_user_id;

  get diagnostics moved_thread_count = row_count;

  update public.chat_attachments
  set uploaded_by_user_id = destination_user_id
  where uploaded_by_user_id = source_user_id;

  get diagnostics moved_attachment_count = row_count;

  delete from public.user_usage
  where user_id = source_user_id;

  return moved_thread_count > 0 or moved_attachment_count > 0;
end;
$$;

alter table public.chat_threads disable row level security;
alter table public.chat_messages disable row level security;
alter table public.chat_attachments disable row level security;
alter table public.user_usage disable row level security;
alter table public.app_sessions disable row level security;

revoke all on public.chat_threads from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
revoke all on public.chat_attachments from anon, authenticated;
revoke all on public.user_usage from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;
