create table if not exists public.user_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  question_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_usage_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_usage_updated_at on public.user_usage;

create trigger set_user_usage_updated_at
before update on public.user_usage
for each row
execute function public.set_user_usage_updated_at();

alter table public.user_usage disable row level security;

revoke all on public.user_usage from anon, authenticated;

create or replace function public.increment_user_question_count(target_user_id uuid)
returns integer
language plpgsql
as $$
declare
  next_count integer;
begin
  insert into public.user_usage (user_id, question_count)
  values (target_user_id, 1)
  on conflict (user_id) do update
  set question_count = public.user_usage.question_count + 1,
      updated_at = now()
  returning question_count into next_count;

  return next_count;
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
  source_thread_id uuid;
  destination_thread_id uuid;
begin
  if source_user_id is null or destination_user_id is null then
    return false;
  end if;

  if source_user_id = destination_user_id then
    delete from public.user_usage where user_id = source_user_id;
    return false;
  end if;

  select id into source_thread_id
  from public.chat_threads
  where user_id = source_user_id;

  if source_thread_id is null then
    delete from public.user_usage where user_id = source_user_id;
    return false;
  end if;

  select id into destination_thread_id
  from public.chat_threads
  where user_id = destination_user_id;

  if destination_thread_id is null then
    update public.chat_threads
    set user_id = destination_user_id
    where id = source_thread_id;
  else
    insert into public.chat_messages (
      thread_id,
      role,
      content,
      openai_response_id,
      created_at
    )
    select
      destination_thread_id,
      role,
      content,
      openai_response_id,
      created_at
    from public.chat_messages
    where thread_id = source_thread_id
    order by created_at, id;

    delete from public.chat_threads
    where id = source_thread_id;
  end if;

  delete from public.user_usage where user_id = source_user_id;

  return true;
end;
$$;
