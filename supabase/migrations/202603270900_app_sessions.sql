create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Anonymous',
  is_anonymous boolean not null default false,
  supabase_access_token text not null,
  supabase_refresh_token text not null,
  supabase_access_token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_refreshed_at timestamptz not null default now()
);

create index if not exists app_sessions_user_id_idx
  on public.app_sessions (user_id);

create index if not exists app_sessions_access_token_expires_at_idx
  on public.app_sessions (supabase_access_token_expires_at);

create or replace function public.set_app_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_sessions_updated_at on public.app_sessions;

create trigger set_app_sessions_updated_at
before update on public.app_sessions
for each row
execute function public.set_app_sessions_updated_at();

alter table public.app_sessions disable row level security;

revoke all on public.app_sessions from anon, authenticated;
