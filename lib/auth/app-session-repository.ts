import "server-only";

import {
  decryptSessionSecret,
  encryptSessionSecret,
  isEncryptedSessionSecret,
} from "@/lib/auth/session-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AppSessionRecord {
  id: string;
  session_token_hash: string;
  user_id: string;
  email: string;
  display_name: string;
  is_anonymous: boolean;
  supabase_access_token_expires_at: string;
  created_at: string;
  updated_at: string;
  last_refreshed_at: string;
  getSupabaseAccessToken: () => string;
  getSupabaseRefreshToken: () => string;
  needsTokenEncryption: boolean;
}

export async function createAppSession(input: {
  sessionTokenHash: string;
  userId: string;
  email: string;
  displayName: string;
  isAnonymous: boolean;
  supabaseAccessToken: string;
  supabaseRefreshToken: string;
  supabaseAccessTokenExpiresAt: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_sessions")
    .insert({
      session_token_hash: input.sessionTokenHash,
      user_id: input.userId,
      email: input.email,
      display_name: input.displayName,
      is_anonymous: input.isAnonymous,
      supabase_access_token_encrypted: encryptSessionSecret(
        input.supabaseAccessToken,
      ),
      supabase_refresh_token_encrypted: encryptSessionSecret(
        input.supabaseRefreshToken,
      ),
      supabase_access_token_expires_at: input.supabaseAccessTokenExpiresAt,
    })
    .select(
      "id, session_token_hash, user_id, email, display_name, is_anonymous, supabase_access_token_encrypted, supabase_refresh_token_encrypted, supabase_access_token_expires_at, created_at, updated_at, last_refreshed_at",
    )
    .single<AppSessionRow>();

  if (error) {
    throw error;
  }

  return mapAppSessionRecord(data as AppSessionRow);
}

export async function getAppSessionByTokenHash(sessionTokenHash: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_sessions")
    .select(
      "id, session_token_hash, user_id, email, display_name, is_anonymous, supabase_access_token_encrypted, supabase_refresh_token_encrypted, supabase_access_token_expires_at, created_at, updated_at, last_refreshed_at",
    )
    .eq("session_token_hash", sessionTokenHash)
    .maybeSingle<AppSessionRow>();

  if (error) {
    throw error;
  }

  return data ? mapAppSessionRecord(data as AppSessionRow) : null;
}

export async function updateAppSessionTokens(input: {
  id: string;
  email: string;
  displayName: string;
  isAnonymous: boolean;
  supabaseAccessToken: string;
  supabaseRefreshToken: string;
  supabaseAccessTokenExpiresAt: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_sessions")
    .update({
      email: input.email,
      display_name: input.displayName,
      is_anonymous: input.isAnonymous,
      supabase_access_token_encrypted: encryptSessionSecret(
        input.supabaseAccessToken,
      ),
      supabase_refresh_token_encrypted: encryptSessionSecret(
        input.supabaseRefreshToken,
      ),
      supabase_access_token_expires_at: input.supabaseAccessTokenExpiresAt,
      last_refreshed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(
      "id, session_token_hash, user_id, email, display_name, is_anonymous, supabase_access_token_encrypted, supabase_refresh_token_encrypted, supabase_access_token_expires_at, created_at, updated_at, last_refreshed_at",
    )
    .single<AppSessionRow>();

  if (error) {
    throw error;
  }

  return mapAppSessionRecord(data as AppSessionRow);
}

export async function deleteAppSessionByTokenHash(sessionTokenHash: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("app_sessions")
    .delete()
    .eq("session_token_hash", sessionTokenHash);

  if (error) {
    throw error;
  }
}

export async function deleteAppSessionById(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("app_sessions").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

interface AppSessionRow {
  id: string;
  session_token_hash: string;
  user_id: string;
  email: string;
  display_name: string;
  is_anonymous: boolean;
  supabase_access_token_encrypted: string;
  supabase_refresh_token_encrypted: string;
  supabase_access_token_expires_at: string;
  created_at: string;
  updated_at: string;
  last_refreshed_at: string;
}

function mapAppSessionRecord(row: AppSessionRow): AppSessionRecord {
  return {
    id: row.id,
    session_token_hash: row.session_token_hash,
    user_id: row.user_id,
    email: row.email,
    display_name: row.display_name,
    is_anonymous: row.is_anonymous,
    supabase_access_token_expires_at: row.supabase_access_token_expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_refreshed_at: row.last_refreshed_at,
    needsTokenEncryption:
      !isEncryptedSessionSecret(row.supabase_access_token_encrypted) ||
      !isEncryptedSessionSecret(row.supabase_refresh_token_encrypted),
    getSupabaseAccessToken() {
      return decryptSessionSecret(row.supabase_access_token_encrypted);
    },
    getSupabaseRefreshToken() {
      return decryptSessionSecret(row.supabase_refresh_token_encrypted);
    },
  };
}
