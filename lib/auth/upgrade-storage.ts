"use client";

const PENDING_ANONYMOUS_UPGRADE_TOKEN_KEY = "pendingAnonymousUpgradeToken";

export function readPendingAnonymousUpgradeToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(PENDING_ANONYMOUS_UPGRADE_TOKEN_KEY);
}

export function writePendingAnonymousUpgradeToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_ANONYMOUS_UPGRADE_TOKEN_KEY, token);
}

export function clearPendingAnonymousUpgradeToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_ANONYMOUS_UPGRADE_TOKEN_KEY);
}
