"use client";

import { useQuery } from "@tanstack/react-query";

import { getChatThread } from "@/lib/api/chat";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { chatThreadQueryKey } from "@/lib/query-keys";

export function useChatThreadQuery(enabled: boolean) {
  const { ensureAnonymousSession } = useBrowserAuth();

  return useQuery({
    queryKey: chatThreadQueryKey,
    queryFn: async () => {
      await ensureAnonymousSession();
      return getChatThread();
    },
    enabled,
    retry: false,
  });
}
