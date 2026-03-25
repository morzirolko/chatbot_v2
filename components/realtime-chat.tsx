"use client";

import { Loader2, Send } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

interface RealtimeChatProps {
  activeThreadId: string | null;
  focusComposerSignal: number;
  isArchiveLoading: boolean;
  onThreadCreated: (threadId: string) => void;
}

export const RealtimeChat = ({
  activeThreadId,
  focusComposerSignal,
  isArchiveLoading,
  onThreadCreated,
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll();
  const inputRef = useRef<HTMLInputElement>(null);
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
  } = useChatThreadQuery(activeThreadId);
  const { broadcastMessage, isConnected } = useRealtimeChat(
    activeThreadId,
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
    activeThreadId,
    onAcknowledged: async (message) => {
      onThreadCreated(message.threadId);
      await broadcastMessage(message);
    },
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

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusComposerSignal]);

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
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-white/55 backdrop-blur-xl">
        Loading chat...
      </div>
    );
  }

  if (isArchiveLoading || (activeThreadId && isThreadLoading && !threadData)) {
    return (
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-white/55 backdrop-blur-xl">
        Loading your conversation...
      </div>
    );
  }

  if (activeThreadId && !threadData) {
    if (threadError instanceof Error) {
      if (isAnonymousProviderDisabled) {
        return (
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm backdrop-blur-xl">
            <p className="text-white">
              Guest chat is currently unavailable.
            </p>
            <p className="mt-2 text-white/55">
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
        <div className="w-full rounded-[2rem] border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100 backdrop-blur-xl">
          {threadError.message}
        </div>
      );
    }
  }

  return (
    <div className="flex h-[72vh] w-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] text-white antialiased shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-sm">
        <div>
          <p className="font-medium text-white">
            {threadData?.thread.title ?? "Fresh draft"}
          </p>
          <p className="text-white/50">
            {activeThreadId
              ? isGuest
                ? "Guest session with 3 free questions"
                : `Signed in as ${user?.email ?? "unknown"}`
              : "This draft becomes a saved thread after your first message."}
          </p>
        </div>
        <div className="text-xs text-white/45">
          {activeThreadId
            ? isConnected
              ? "Realtime sync connected"
              : "Realtime sync reconnecting"
            : "Draft mode"}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-5">
        {!activeThreadId ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.04] px-6 py-8 text-center">
              <p className="text-xs uppercase tracking-[0.28em] text-white/35">
                New conversation
              </p>
              <h2 className="mt-3 font-heading text-2xl font-medium text-white">
                Start a clean thread
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/50">
                Write your first message below. The archive entry is created only
                after that first send.
              </p>
            </div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-white/45">
            No messages yet. Start the conversation.
          </div>
        ) : (
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
        )}
      </div>

      {streamError ? (
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <p className="text-red-200">{streamError}</p>
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
        className="flex w-full gap-3 border-t border-white/10 p-5"
      >
        <Input
          ref={inputRef}
          className={cn(
            "h-12 rounded-full border-white/10 bg-white/[0.04] px-5 text-sm text-white placeholder:text-white/35 transition-all duration-300",
            newMessage.trim() ? "w-[calc(100%-48px)]" : "w-full",
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
            className="size-12 rounded-full bg-[#ff7a1a] text-black hover:bg-[#ff8b36]"
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
