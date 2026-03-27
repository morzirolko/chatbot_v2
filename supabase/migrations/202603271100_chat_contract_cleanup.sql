create index if not exists chat_messages_thread_created_at_latest_idx
  on public.chat_messages (thread_id, created_at desc, id desc);

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
    (
      select messages.content
      from public.chat_messages as messages
      where messages.thread_id = threads.id
      order by messages.created_at desc, messages.id desc
      limit 1
    ) as latest_message_content,
    threads.created_at,
    threads.updated_at
  from public.chat_threads as threads
  where threads.user_id = target_user_id
  order by threads.updated_at desc;
$$;

alter table public.chat_threads
drop column if exists realtime_channel_token;

alter table public.chat_messages
drop column if exists openai_response_id;
