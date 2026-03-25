"use client";

import { useBrowserAuth } from "@/hooks/use-browser-auth";

export function useSessionQuery() {
  const { isAnonymous, isLoading, user } = useBrowserAuth();

  return {
    data: {
      user: isAnonymous ? null : user,
    },
    isLoading,
  };
}
