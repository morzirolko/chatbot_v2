import "server-only";

import {
  buildBrowserSessionResponse,
  getAuthenticatedAppUser,
  getCurrentAppSessionState,
} from "@/lib/auth/app-session";
import { isAnonymousUser } from "@/lib/auth/user";
import type { BrowserSessionResponse } from "@/lib/types/auth";

export class AuthSessionError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthSessionError";
  }
}

export async function getAuthenticatedUser() {
  return getAuthenticatedAppUser();
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
  const { record } = await getCurrentAppSessionState();
  return buildBrowserSessionResponse(record) satisfies BrowserSessionResponse;
}

export async function getSessionUser() {
  const user = await getAuthenticatedUser();

  if (!user || isAnonymousUser(user)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}
