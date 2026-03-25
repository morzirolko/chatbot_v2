"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { upsertThreadMessage } from "@/lib/chat/cache";
import { CHAT_PERSISTED_MESSAGE_EVENT } from "@/lib/chat/realtime";
import { chatThreadQueryKey } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, ChatThreadResponse } from "@/lib/types/chat";

export function useRealtimeChat(channelName?: string) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [channel, setChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!channelName) {
      setChannel(null);
      setIsConnected(false);
      return;
    }

    let isActive = true;
    let newChannel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeToChannel = async () => {
      try {
        await supabase.realtime.setAuth();

        if (!isActive) {
          return;
        }

        newChannel = supabase.channel(channelName, {
          config: {
            broadcast: {
              ack: true,
              self: true,
            },
            private: true,
          },
        });

        newChannel
          .on(
            "broadcast",
            { event: CHAT_PERSISTED_MESSAGE_EVENT },
            (payload) => {
              queryClient.setQueryData<ChatThreadResponse>(
                chatThreadQueryKey,
                (currentThread) =>
                  upsertThreadMessage(
                    currentThread,
                    payload.payload as ChatMessage,
                  ),
              );
            },
          )
          .subscribe((status, error) => {
            if (!isActive) {
              return;
            }

            setIsConnected(status === "SUBSCRIBED");

            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.error(
                "[chat/realtime] Failed to subscribe to private chat channel.",
                error,
              );
            }
          });

        setChannel(newChannel);
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error("[chat/realtime] Failed to authorize realtime client.", error);
        setChannel(null);
        setIsConnected(false);
      }
    };

    void subscribeToChannel();

    return () => {
      isActive = false;
      setChannel(null);
      setIsConnected(false);

      if (newChannel) {
        void supabase.removeChannel(newChannel);
      }
    };
  }, [channelName, queryClient, supabase]);

  const broadcastMessage = useCallback(
    async (message: ChatMessage) => {
      if (!channel || !isConnected) return;

      await channel.send({
        type: "broadcast",
        event: CHAT_PERSISTED_MESSAGE_EVENT,
        payload: message,
      });
    },
    [channel, isConnected],
  );

  return { broadcastMessage, isConnected };
}
