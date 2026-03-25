alter table public.chat_threads
drop constraint if exists chat_threads_user_id_key;

alter table public.chat_threads
add column if not exists title text;

create index if not exists chat_threads_user_id_updated_at_idx
  on public.chat_threads (user_id, updated_at desc);

update public.chat_threads as threads
set title = (
  select left(regexp_replace(trim(messages.content), '\s+', ' ', 'g'), 72)
  from public.chat_messages as messages
  where messages.thread_id = threads.id
    and messages.role = 'user'
  order by messages.created_at asc, messages.id asc
  limit 1
)
where coalesce(nullif(trim(threads.title), ''), '') = ''
  and exists (
    select 1
    from public.chat_messages as messages
    where messages.thread_id = threads.id
      and messages.role = 'user'
  );

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

  delete from public.user_usage where user_id = source_user_id;

  return moved_thread_count > 0;
end;
$$;
