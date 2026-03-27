import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export interface AppSessionRecord {
  id: string
  session_token_hash: string
  user_id: string
  email: string
  display_name: string
  is_anonymous: boolean
  supabase_access_token: string
  supabase_refresh_token: string
  supabase_access_token_expires_at: string
  created_at: string
  updated_at: string
  last_refreshed_at: string
}

export async function createAppSession(input: {
  sessionTokenHash: string
  userId: string
  email: string
  displayName: string
  isAnonymous: boolean
  supabaseAccessToken: string
  supabaseRefreshToken: string
  supabaseAccessTokenExpiresAt: string
}) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("app_sessions")
    .insert({
      session_token_hash: input.sessionTokenHash,
      user_id: input.userId,
      email: input.email,
      display_name: input.displayName,
      is_anonymous: input.isAnonymous,
      supabase_access_token: input.supabaseAccessToken,
      supabase_refresh_token: input.supabaseRefreshToken,
      supabase_access_token_expires_at: input.supabaseAccessTokenExpiresAt,
    })
    .select(
      "id, session_token_hash, user_id, email, display_name, is_anonymous, supabase_access_token, supabase_refresh_token, supabase_access_token_expires_at, created_at, updated_at, last_refreshed_at"
    )
    .single<AppSessionRecord>()

  if (error) {
    throw error
  }

  return data as AppSessionRecord
}

export async function getAppSessionByTokenHash(sessionTokenHash: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("app_sessions")
    .select(
      "id, session_token_hash, user_id, email, display_name, is_anonymous, supabase_access_token, supabase_refresh_token, supabase_access_token_expires_at, created_at, updated_at, last_refreshed_at"
    )
    .eq("session_token_hash", sessionTokenHash)
    .maybeSingle<AppSessionRecord>()

  if (error) {
    throw error
  }

  return (data as AppSessionRecord | null) ?? null
}

export async function updateAppSessionTokens(input: {
  id: string
  email: string
  displayName: string
  isAnonymous: boolean
  supabaseAccessToken: string
  supabaseRefreshToken: string
  supabaseAccessTokenExpiresAt: string
}) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("app_sessions")
    .update({
      email: input.email,
      display_name: input.displayName,
      is_anonymous: input.isAnonymous,
      supabase_access_token: input.supabaseAccessToken,
      supabase_refresh_token: input.supabaseRefreshToken,
      supabase_access_token_expires_at: input.supabaseAccessTokenExpiresAt,
      last_refreshed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(
      "id, session_token_hash, user_id, email, display_name, is_anonymous, supabase_access_token, supabase_refresh_token, supabase_access_token_expires_at, created_at, updated_at, last_refreshed_at"
    )
    .single<AppSessionRecord>()

  if (error) {
    throw error
  }

  return data as AppSessionRecord
}

export async function deleteAppSessionByTokenHash(sessionTokenHash: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("app_sessions")
    .delete()
    .eq("session_token_hash", sessionTokenHash)

  if (error) {
    throw error
  }
}

export async function deleteAppSessionById(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from("app_sessions").delete().eq("id", id)

  if (error) {
    throw error
  }
}
