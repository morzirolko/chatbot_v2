do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_sessions'
      and column_name = 'supabase_access_token'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_sessions'
      and column_name = 'supabase_access_token_encrypted'
  ) then
    alter table public.app_sessions
    rename column supabase_access_token to supabase_access_token_encrypted;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_sessions'
      and column_name = 'supabase_refresh_token'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_sessions'
      and column_name = 'supabase_refresh_token_encrypted'
  ) then
    alter table public.app_sessions
    rename column supabase_refresh_token to supabase_refresh_token_encrypted;
  end if;
end
$$;
