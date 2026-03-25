"use client";

import { useQuery } from "@tanstack/react-query";

import { getChatThread } from "@/lib/api/chat";
import { chatThreadQueryKey } from "@/lib/query-keys";

export function useChatThreadQuery(enabled: boolean) {
  return useQuery({
    queryKey: chatThreadQueryKey,
    queryFn: getChatThread,
    enabled,
    retry: false,
  });
}
