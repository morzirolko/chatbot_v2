"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { upsertThreadMessage, upsertThreadSummary } from "@/lib/chat/cache";
import { CHAT_PERSISTED_MESSAGE_EVENT } from "@/lib/chat/realtime";
import { chatThreadQueryKey } from "@/lib/query-keys";
import { chatThreadsQueryKey } from "@/lib/query-keys";
import { createRealtimeClient } from "@/lib/supabase/client";
import type { ChatMessage, ChatThreadResponse } from "@/lib/types/chat";
import type { ChatThreadSummary } from "@/lib/types/chat";

type RealtimeClient = ReturnType<typeof createRealtimeClient>;
type RealtimeChannel = ReturnType<RealtimeClient["channel"]>;

export function useRealtimeChat(
  threadId?: string | null,
  channelName?: string,
) {
  const queryClient = useQueryClient();
  const { realtimeAccessToken } = useBrowserAuth();
  const accessTokenRef = useRef<string | null>(realtimeAccessToken);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    accessTokenRef.current = realtimeAccessToken;
  }, [realtimeAccessToken]);

  useEffect(() => {
    if (!channelName || !realtimeAccessToken) {
      channelRef.current = null;
      setIsConnected(false);
      return;
    }

    let isActive = true;
    const supabase = createRealtimeClient(() => accessTokenRef.current);
    const nextChannel = supabase.channel(channelName, {
      config: {
        broadcast: {
          ack: true,
          self: true,
        },
        private: true,
      },
    });
    channelRef.current = nextChannel;

    const subscribeToChannel = async () => {
      try {
        nextChannel
          .on(
            "broadcast",
            { event: CHAT_PERSISTED_MESSAGE_EVENT },
            (payload) => {
              const message = payload.payload as ChatMessage;

              if (threadId) {
                queryClient.setQueryData<ChatThreadResponse>(
                  chatThreadQueryKey(threadId),
                  (currentThread) =>
                    upsertThreadMessage(currentThread, message),
                );
              }

              queryClient.setQueryData<ChatThreadSummary[]>(
                chatThreadsQueryKey,
                (currentThreads) =>
                  upsertThreadSummary(currentThreads, message),
              );
            },
          )
          .subscribe((status, error) => {
            if (!isActive) {
              return;
            }

            setIsConnected(status === "SUBSCRIBED");

            if (status === "CHANNEL_ERROR") {
              console.warn(
                "[chat/realtime] Failed to subscribe to private chat channel.",
                error,
              );
            }

            if (status === "TIMED_OUT") {
              console.warn(
                "[chat/realtime] Subscription timed out. Realtime will retry automatically.",
              );
            }
          });
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error(
          "[chat/realtime] Failed to authorize realtime client.",
          error,
        );
        channelRef.current = null;
        setIsConnected(false);
      }
    };

    void subscribeToChannel();

    return () => {
      isActive = false;
      channelRef.current = null;
      setIsConnected(false);
      void supabase.removeChannel(nextChannel);
    };
  }, [channelName, queryClient, realtimeAccessToken, threadId]);

  const broadcastMessage = useCallback(
    async (message: ChatMessage) => {
      if (!channelRef.current || !isConnected) return;

      await channelRef.current.send({
        type: "broadcast",
        event: CHAT_PERSISTED_MESSAGE_EVENT,
        payload: message,
      });
    },
    [isConnected],
  );

  return { broadcastMessage, isConnected };
}
