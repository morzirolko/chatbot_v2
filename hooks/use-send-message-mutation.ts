"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { ApiError } from "@/lib/api/error";
import { upsertThreadMessage } from "@/lib/chat/cache";
import { sendChatMessage } from "@/lib/api/chat";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { chatThreadQueryKey } from "@/lib/query-keys";
import type { ChatMessage, ChatThreadResponse } from "@/lib/types/chat";

interface UseSendMessageMutationOptions {
  onAcknowledged?: (message: ChatMessage) => void | Promise<void>;
  onCompleted?: (message: ChatMessage) => void | Promise<void>;
}

export function useSendMessageMutation(
  options: UseSendMessageMutationOptions = {},
) {
  const queryClient = useQueryClient();
  const { ensureAnonymousSession } = useBrowserAuth();
  const [streamingText, setStreamingText] = useState("");
  const [streamingCreatedAt, setStreamingCreatedAt] = useState<string | null>(
    null,
  );
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamErrorCode, setStreamErrorCode] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      await ensureAnonymousSession();

      await sendChatMessage({
        content,
        onEvent: async (event) => {
          switch (event.type) {
            case "ack":
              queryClient.setQueryData<ChatThreadResponse>(
                chatThreadQueryKey,
                (currentThread) =>
                  upsertThreadMessage(currentThread, event.message),
              );
              await options.onAcknowledged?.(event.message);
              break;
            case "delta":
              setStreamingCreatedAt(
                (currentValue) => currentValue ?? new Date().toISOString(),
              );
              setStreamingText((currentValue) => currentValue + event.delta);
              break;
            case "done":
              setStreamingText("");
              setStreamingCreatedAt(null);
              queryClient.setQueryData<ChatThreadResponse>(
                chatThreadQueryKey,
                (currentThread) =>
                  upsertThreadMessage(currentThread, event.message),
              );
              await options.onCompleted?.(event.message);
              break;
            case "error":
              setStreamError(event.error);
              setStreamErrorCode(event.code ?? null);
              break;
            default:
              break;
          }
        },
      });
    },
    onMutate: () => {
      setStreamError(null);
      setStreamErrorCode(null);
      setStreamingText("");
      setStreamingCreatedAt(null);
    },
    onError: (error) => {
      setStreamingText("");
      setStreamingCreatedAt(null);
      setStreamError(
        error instanceof Error ? error.message : "Unable to send message.",
      );
      setStreamErrorCode(
        error instanceof ApiError ? (error.code ?? null) : null,
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatThreadQueryKey,
      });
    },
  });

  const clearStreamError = useCallback(() => {
    setStreamError(null);
    setStreamErrorCode(null);
  }, []);

  return {
    sendMessage: mutation.mutateAsync,
    isPending: mutation.isPending,
    streamingText,
    streamingCreatedAt,
    streamError,
    streamErrorCode,
    clearStreamError,
  };
}
