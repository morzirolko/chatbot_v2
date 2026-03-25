-- Requires Supabase Realtime "Allow public access" to be disabled so clients
-- must use authenticated private channels.

create or replace function public.chat_thread_id_from_realtime_topic(topic text)
returns uuid
language plpgsql
immutable
as $$
declare
  thread_id_text text;
begin
  if topic !~ '^chat:thread:[0-9a-fA-F-]{36}$' then
    return null;
  end if;

  thread_id_text := substring(topic from '^chat:thread:(.*)$');
  return thread_id_text::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.can_access_chat_realtime_topic(topic text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.chat_threads
    where id = public.chat_thread_id_from_realtime_topic(topic)
      and user_id = auth.uid()
  );
$$;

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
