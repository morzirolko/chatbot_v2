create or replace function public.can_access_chat_realtime_topic(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.chat_threads
    where id = public.chat_thread_id_from_realtime_topic(topic)
      and user_id = auth.uid()
  );
end;
$$;

revoke all on function public.can_access_chat_realtime_topic(text) from public;
grant execute on function public.can_access_chat_realtime_topic(text) to authenticated;
