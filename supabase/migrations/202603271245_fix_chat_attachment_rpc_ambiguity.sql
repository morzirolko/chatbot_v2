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
