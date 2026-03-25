"use client";

import { useSessionQuery } from "@/hooks/use-session-query";

export function ProtectedUserDetails() {
  const { data, isLoading } = useSessionQuery();

  if (isLoading) {
    return "Loading user details...";
  }

  if (!data?.user) {
    return "No active user session.";
  }

  return JSON.stringify(data.user, null, 2);
}
