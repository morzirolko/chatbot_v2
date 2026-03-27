import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import {
  APP_SESSION_COOKIE_MAX_AGE_SECONDS,
  APP_SESSION_COOKIE_NAME,
  APP_SESSION_REFRESH_BUFFER_SECONDS,
} from "@/lib/auth/constants";
import {
  createAppSession,
  deleteAppSessionById,
  deleteAppSessionByTokenHash,
  getAppSessionByTokenHash,
  type AppSessionRecord,
  updateAppSessionTokens,
} from "@/lib/auth/app-session-repository";
import { getUserDisplayName } from "@/lib/auth/user";
import {
  refreshGatewaySession,
  type AuthenticatedGatewaySession,
} from "@/lib/supabase/auth-gateway";
import type { BrowserSessionResponse, BrowserSessionUser } from "@/lib/types/auth";

interface AppSessionUser {
  id: string
  email: string
  displayName: string
  isAnonymous: boolean;
}

interface AppSessionState {
  record: AppSessionRecord | null;
  shouldClearCookie: boolean;
}

function hashSessionToken(sessionToken: string) {
  return createHash("sha256").update(sessionToken).digest("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function getAccessTokenExpiresAtIso(expiresAtSeconds: number) {
  return new Date(expiresAtSeconds * 1000).toISOString();
}

function shouldRefreshSession(record: AppSessionRecord) {
  const expiresAt = new Date(record.supabase_access_token_expires_at).getTime();
  return expiresAt - Date.now() <= APP_SESSION_REFRESH_BUFFER_SECONDS * 1000;
}

function mapAppSessionUser(record: AppSessionRecord): AppSessionUser {
  return {
    id: record.user_id,
    email: record.email,
    displayName: record.display_name,
    isAnonymous: record.is_anonymous,
  };
}

function mapBrowserSessionUser(record: AppSessionRecord): BrowserSessionUser {
  const user = mapAppSessionUser(record);

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAnonymous: user.isAnonymous,
  };
}

export function buildBrowserSessionResponse(
  record: AppSessionRecord | null
): BrowserSessionResponse {
  if (!record) {
    return {
      user: null,
      isAnonymous: false,
      realtimeAccessToken: null,
    };
  }

  return {
    user: mapBrowserSessionUser(record),
    isAnonymous: record.is_anonymous,
    realtimeAccessToken: record.getSupabaseAccessToken(),
  };
}

function applySessionCookie(
  response: NextResponse,
  sessionToken: string
) {
  response.cookies.set(APP_SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: APP_SESSION_COOKIE_MAX_AGE_SECONDS,
  })
}

export function clearAppSessionCookie(response: NextResponse) {
  response.cookies.set(APP_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  })
}

async function replaceExistingCookieSession() {
  const cookieStore = await cookies()
  const existingToken = cookieStore.get(APP_SESSION_COOKIE_NAME)?.value

  if (!existingToken) {
    return
  }

  await deleteAppSessionByTokenHash(hashSessionToken(existingToken)).catch(
    () => undefined
  )
}

export async function createManagedAppSession(
  session: AuthenticatedGatewaySession | null
) {
  if (!session) {
    throw new Error("Cannot create an app session without a Supabase session.")
  }

  await replaceExistingCookieSession()

  const sessionToken = createSessionToken()
  const record = await createAppSession({
    sessionTokenHash: hashSessionToken(sessionToken),
    userId: session.user.id,
    email: session.user.email ?? "",
    displayName: getUserDisplayName(session.user),
    isAnonymous: session.user.is_anonymous === true,
    supabaseAccessToken: session.accessToken,
    supabaseRefreshToken: session.refreshToken,
    supabaseAccessTokenExpiresAt: getAccessTokenExpiresAtIso(session.expiresAt),
  })

  return {
    record,
    sessionToken,
  }
}

export function attachAppSessionToResponse(
  response: NextResponse,
  input: {
    sessionToken: string;
    record: AppSessionRecord;
  }
) {
  void input.record;
  applySessionCookie(response, input.sessionToken);
}

async function refreshAppSessionRecord(record: AppSessionRecord) {
  try {
    const refreshedSession = await refreshGatewaySession({
      accessToken: record.getSupabaseAccessToken(),
      refreshToken: record.getSupabaseRefreshToken(),
    });

    return await updateAppSessionTokens({
      id: record.id,
      email: refreshedSession.user.email ?? "",
      displayName: getUserDisplayName(refreshedSession.user as User),
      isAnonymous: refreshedSession.user.is_anonymous === true,
      supabaseAccessToken: refreshedSession.accessToken,
      supabaseRefreshToken: refreshedSession.refreshToken,
      supabaseAccessTokenExpiresAt: getAccessTokenExpiresAtIso(
        refreshedSession.expiresAt
      ),
    });
  } catch (error) {
    await deleteAppSessionById(record.id).catch(() => undefined);
    throw error;
  }
}

async function encryptLegacySessionRecord(record: AppSessionRecord) {
  if (!record.needsTokenEncryption) {
    return record;
  }

  return updateAppSessionTokens({
    id: record.id,
    email: record.email,
    displayName: record.display_name,
    isAnonymous: record.is_anonymous,
    supabaseAccessToken: record.getSupabaseAccessToken(),
    supabaseRefreshToken: record.getSupabaseRefreshToken(),
    supabaseAccessTokenExpiresAt: record.supabase_access_token_expires_at,
  });
}

export async function getCurrentAppSessionState(): Promise<AppSessionState> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return {
      record: null,
      shouldClearCookie: false,
    }
  }

  const record = await getAppSessionByTokenHash(hashSessionToken(sessionToken));

  if (!record) {
    return {
      record: null,
      shouldClearCookie: true,
    }
  }

  const normalizedRecord = await encryptLegacySessionRecord(record);

  if (!shouldRefreshSession(normalizedRecord)) {
    return {
      record: normalizedRecord,
      shouldClearCookie: false,
    }
  }

  try {
    const refreshedRecord = await refreshAppSessionRecord(normalizedRecord)

    return {
      record: refreshedRecord,
      shouldClearCookie: false,
    }
  } catch {
    return {
      record: null,
      shouldClearCookie: true,
    }
  }
}

export async function destroyCurrentAppSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(APP_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return
  }

  await deleteAppSessionByTokenHash(hashSessionToken(sessionToken)).catch(
    () => undefined,
  );
}

export async function getAuthenticatedAppUser() {
  const { record } = await getCurrentAppSessionState();

  return record ? mapAppSessionUser(record) : null;
}
