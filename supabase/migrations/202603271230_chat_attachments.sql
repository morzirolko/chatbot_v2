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

create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  uploaded_by_user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid references public.chat_messages (id) on delete cascade,
  status text not null check (status in ('uploaded', 'attached')),
  kind text not null check (kind in ('image', 'pdf', 'text')),
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  bucket_name text not null default 'chat-attachments',
  object_path text not null unique,
  extracted_text text,
  text_extraction_status text not null check (
    text_extraction_status in ('not_applicable', 'ready', 'failed')
  ),
  text_truncated boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_attachments_message_id_idx
  on public.chat_attachments (message_id);

create index if not exists chat_attachments_uploaded_staging_idx
  on public.chat_attachments (uploaded_by_user_id, created_at desc)
  where public.chat_attachments.message_id is null
    and public.chat_attachments.status = 'uploaded';

alter table public.chat_attachments disable row level security;

revoke all on public.chat_attachments from anon, authenticated;

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
  expected_attachment_count integer;
  attached_attachment_count integer;
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

  expected_attachment_count := coalesce(
    array_length(target_attachment_ids, 1),
    0
  );

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
    perform 1
    from public.chat_attachments as attachments
    where attachments.id = any(target_attachment_ids)
    for update;

    update public.chat_attachments as attachments
    set
      message_id = new_message_id,
      status = 'attached'
    where attachments.id = any(target_attachment_ids)
      and attachments.uploaded_by_user_id = target_user_id
      and attachments.message_id is null
      and attachments.status = 'uploaded';

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
as $$
declare
  moved_thread_count integer;
begin
  if source_user_id is null or destination_user_id is null then
    return false;
  end if;

  if source_user_id = destination_user_id then
    delete from public.user_usage where user_id = source_user_id;
    return false;
  end if;

  update public.chat_threads
  set user_id = destination_user_id
  where user_id = source_user_id;

  get diagnostics moved_thread_count = row_count;

  update public.chat_attachments as attachments
  set uploaded_by_user_id = destination_user_id
  where attachments.uploaded_by_user_id = source_user_id
    and attachments.message_id is null
    and attachments.status = 'uploaded';

  delete from public.user_usage where user_id = source_user_id;

  return moved_thread_count > 0;
end;
$$;
