"use client";

import { useQuery } from "@tanstack/react-query";

import { getChatThreads } from "@/lib/api/chat";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { chatThreadsQueryKey } from "@/lib/query-keys";

export function useChatThreadsQuery() {
  const { ensureAnonymousSession } = useBrowserAuth();

  return useQuery({
    queryKey: chatThreadsQueryKey,
    queryFn: async () => {
      await ensureAnonymousSession();
      return getChatThreads();
    },
    retry: false,
  });
}
