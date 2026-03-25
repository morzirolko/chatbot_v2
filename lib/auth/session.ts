import "server-only";

import {
  isAnonymousUser,
  mapBrowserSessionUser,
  mapSessionUser,
} from "@/lib/auth/user";
import type { BrowserSessionResponse } from "@/lib/types/auth";
import { createClient } from "@/lib/supabase/server";

export class AuthSessionError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthSessionError";
  }
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function requireAuthenticatedUser(options?: {
  allowAnonymous?: boolean;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new AuthSessionError();
  }

  if (options?.allowAnonymous === false && isAnonymousUser(user)) {
    throw new AuthSessionError();
  }

  return user;
}

export async function getBrowserSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      isAnonymous: false,
      realtimeAccessToken: null,
    } satisfies BrowserSessionResponse;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    user: mapBrowserSessionUser(user),
    isAnonymous: isAnonymousUser(user),
    realtimeAccessToken: session?.access_token ?? null,
  } satisfies BrowserSessionResponse;
}

export async function getSessionUser() {
  const user = await getAuthenticatedUser();

  if (!user || isAnonymousUser(user)) {
    return null;
  }

  return mapSessionUser(user);
}
