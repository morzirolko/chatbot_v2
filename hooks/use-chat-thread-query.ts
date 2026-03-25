"use client";

import { useQuery } from "@tanstack/react-query";

import { getChatThread } from "@/lib/api/chat";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { chatThreadQueryKey } from "@/lib/query-keys";

export function useChatThreadQuery(threadId: string | null) {
  const { ensureAnonymousSession } = useBrowserAuth();

  return useQuery({
    queryKey: threadId ? chatThreadQueryKey(threadId) : ["chat-thread", "draft"],
    queryFn: async () => {
      await ensureAnonymousSession();
      if (!threadId) {
        return null;
      }

      return getChatThread(threadId);
    },
    enabled: Boolean(threadId),
    retry: false,
  });
}
