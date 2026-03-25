"use client";

import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { ChatMessageItem } from "@/components/chat-message";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useChatThreadQuery } from "@/hooks/use-chat-thread-query";
import { useRealtimeChat } from "@/hooks/use-realtime-chat";
import { useSendMessageMutation } from "@/hooks/use-send-message-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/lib/types/chat";

const STREAMING_MESSAGE_ID = "streaming-assistant-message";

export const RealtimeChat = () => {
  const { containerRef, scrollToBottom } = useChatScroll();
  const {
    user,
    isAnonymous,
    isLoading: isAuthLoading,
    realtimeAccessToken,
  } = useBrowserAuth();
  const {
    data: threadData,
    error: threadError,
    isLoading: isThreadLoading,
  } = useChatThreadQuery(true);
  const { broadcastMessage, isConnected } = useRealtimeChat(
    threadData?.thread.realtimeChannelName,
    realtimeAccessToken,
  );
  const {
    sendMessage,
    isPending,
    streamingText,
    streamingCreatedAt,
    streamError,
    streamErrorCode,
    clearStreamError,
  } = useSendMessageMutation({
    onAcknowledged: broadcastMessage,
    onCompleted: broadcastMessage,
  });
  const [newMessage, setNewMessage] = useState("");
  const isGuest = isAnonymous || !user;
  const isQuotaExceeded = isAnonymous && streamErrorCode === "quota_exceeded";
  const isAnonymousProviderDisabled =
    threadError instanceof Error &&
    threadError.message.includes("Supabase anonymous sign-ins are disabled");

  const allMessages = useMemo(() => {
    const persistedMessages = threadData?.messages ?? [];

    if (!threadData?.thread || !streamingText) {
      return persistedMessages;
    }

    const streamingMessage: ChatMessage = {
      id: STREAMING_MESSAGE_ID,
      threadId: threadData.thread.id,
      role: "assistant",
      content: streamingText,
      createdAt: streamingCreatedAt ?? new Date().toISOString(),
    };

    return [...persistedMessages, streamingMessage];
  }, [streamingCreatedAt, streamingText, threadData]);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages, scrollToBottom]);

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = newMessage.trim();
      if (!content || isPending || isQuotaExceeded) return;

      clearStreamError();
      await sendMessage(content)
        .then(() => {
          setNewMessage("");
        })
        .catch(() => undefined);
    },
    [clearStreamError, isPending, isQuotaExceeded, newMessage, sendMessage],
  );

  if (isAuthLoading) {
    return (
      <div className="w-full max-w-3xl rounded-2xl border bg-background p-6 text-sm text-muted-foreground">
        Loading chat...
      </div>
    );
  }

  if (isThreadLoading || !threadData) {
    if (threadError instanceof Error) {
      if (isAnonymousProviderDisabled) {
        return (
          <div className="w-full max-w-3xl rounded-2xl border bg-background p-6 text-sm">
            <p className="text-foreground">
              Guest chat is currently unavailable.
            </p>
            <p className="mt-2 text-muted-foreground">
              Sign in or create an account to keep using the chat while
              anonymous sign-ins are disabled.
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/sign-up">Create account</Link>
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="w-full max-w-3xl rounded-2xl border bg-background p-6 text-sm text-red-500">
          {threadError.message}
        </div>
      );
    }

    return (
      <div className="w-full max-w-3xl rounded-2xl border bg-background p-6 text-sm text-muted-foreground">
        Loading your conversation...
      </div>
    );
  }

  return (
    <div className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-background text-foreground antialiased">
      <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
        <div>
          <p className="font-medium">Private Chat</p>
          <p className="text-muted-foreground">
            {isGuest
              ? "Guest session with 3 free questions"
              : `Signed in as ${user?.email ?? "unknown"}`}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {isConnected
            ? "Realtime sync connected"
            : "Realtime sync reconnecting"}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : null}

        <div className="space-y-1">
          {allMessages.map((message, index) => {
            const prevMessage = index > 0 ? allMessages[index - 1] : null;
            const showHeader =
              !prevMessage || prevMessage.role !== message.role;

            return (
              <div
                key={message.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <ChatMessageItem
                  message={message}
                  isOwnMessage={message.role === "user"}
                  showHeader={showHeader}
                  isStreaming={message.id === STREAMING_MESSAGE_ID}
                />
              </div>
            );
          })}
        </div>
      </div>

      {streamError ? (
        <div className="border-t px-4 py-3 text-sm">
          <p className="text-red-500">{streamError}</p>
          {isQuotaExceeded ? (
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/sign-up">Create account</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={handleSendMessage}
        className="flex w-full gap-2 border-t border-border p-4"
      >
        <Input
          className={cn(
            "rounded-full bg-background text-sm transition-all duration-300",
            newMessage.trim() ? "w-[calc(100%-36px)]" : "w-full",
          )}
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            if (streamError) {
              clearStreamError();
            }
          }}
          placeholder={
            isQuotaExceeded ? "Sign in to keep chatting" : "Type a message..."
          }
          disabled={isPending || isQuotaExceeded}
        />
        {newMessage.trim() && (
          <Button
            className="aspect-square rounded-full animate-in fade-in slide-in-from-right-4 duration-300"
            type="submit"
            disabled={isPending || isQuotaExceeded}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        )}
      </form>
    </div>
  );
};
