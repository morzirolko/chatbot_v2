"use client";

import { useBrowserAuth } from "@/hooks/use-browser-auth";

export function ProtectedUserDetails() {
  const { user, isAnonymous, isLoading } = useBrowserAuth();

  if (isLoading) {
    return "Loading user details...";
  }

  if (!user || isAnonymous) {
    return "No active user session.";
  }

  return JSON.stringify(user, null, 2);
}
