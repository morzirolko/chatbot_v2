"use client";

import { ChevronDown, Loader2, Paperclip, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { ChatMessageItem } from "@/components/chat-message";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useChatThreadQuery } from "@/hooks/use-chat-thread-query";
import { useRealtimeChat } from "@/hooks/use-realtime-chat";
import { useSendMessageMutation } from "@/hooks/use-send-message-mutation";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
    isAnonymous,
    isLoading: isAuthLoading,
  } = useBrowserAuth();
  const {
    data: threadData,
    error: threadError,
    isLoading: isThreadLoading,
  } = useChatThreadQuery(activeThreadId);
  const { broadcastMessage } = useRealtimeChat(
    activeThreadId,
    threadData?.thread.realtimeChannelName,
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
  const isQuotaExceeded = isAnonymous && streamErrorCode === "quota_exceeded";
  const isAnonymousProviderDisabled =
    threadError instanceof Error &&
    threadError.message.includes("Supabase anonymous sign-ins are disabled");
  const chatTitle = threadData?.thread.title?.trim() || "New conversation";

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
      <div className="w-full rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,140,56,0.08),rgba(255,255,255,0.04))] p-4 text-sm text-white/60 shadow-xl backdrop-blur-xl">
        Loading chat...
      </div>
    );
  }

  if (isArchiveLoading || (activeThreadId && isThreadLoading && !threadData)) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,140,56,0.08),rgba(255,255,255,0.04))] p-4 text-sm text-white/60 shadow-xl backdrop-blur-xl">
        Loading your conversation...
      </div>
    );
  }

  if (activeThreadId && !threadData) {
    if (threadError instanceof Error) {
      if (isAnonymousProviderDisabled) {
        return (
          <div className="w-full rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,140,56,0.08),rgba(255,255,255,0.04))] p-4 text-sm backdrop-blur-xl">
            <p className="text-white">Guest chat is currently unavailable.</p>
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
        <div className="w-full rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 backdrop-blur-xl">
          {threadError.message}
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,153,84,0.08),rgba(255,255,255,0.035)_18%,rgba(255,255,255,0.02)_100%)] text-white antialiased shadow-[0_28px_100px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-[linear-gradient(90deg,rgba(255,140,56,0.08),rgba(255,255,255,0.025))] px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="text-white hover:bg-white/10 md:hidden" />
          <div className="min-w-0">
            <p className="truncate font-heading text-lg font-medium text-white">
              Conversation {chatTitle}
            </p>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1">
        <ScrollArea className="size-full overflow-hidden">
          {!activeThreadId ? (
            <div className="flex h-full items-center justify-center px-4 py-4">
              <div className="w-full max-w-216 px-2">
                <div className="mx-auto max-w-md rounded-[1.75rem] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(255,140,56,0.07),rgba(255,255,255,0.025))] p-7 text-center">
                  <h2 className="font-heading text-xl font-medium text-white">
                    Start a clean thread
                  </h2>
                </div>
              </div>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="mx-auto flex h-full w-full max-w-216 items-center justify-center px-6 py-4 text-center text-sm text-white/45">
              No messages yet. Start the conversation.
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-216 flex-col gap-5 px-6 py-4">
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
        </ScrollArea>
      </div>

      {streamError ? (
        <div className="border-t border-white/8 px-4 py-4 text-sm">
          <div className="mx-auto w-full max-w-216 px-2">
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
        </div>
      ) : null}

      <form
        onSubmit={handleSendMessage}
        className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,140,56,0.06))] px-4 py-4"
      >
        <div className="mx-auto flex w-full max-w-216 gap-3 px-2">
          <InputGroup
            data-disabled={isPending || isQuotaExceeded}
            className="h-12 flex-1 rounded-full border-white/10 bg-black/25 text-white"
          >
            <InputGroupAddon
              align="inline-start"
              className="pl-2 text-white/55"
            >
              <InputGroupButton
                aria-label="Add files"
                size="icon-sm"
                variant="ghost"
                className="text-white/55 hover:bg-white/8 hover:text-white"
              >
                <Paperclip />
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              className={cn("h-full px-0 text-white placeholder:text-white/35")}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                if (streamError) {
                  clearStreamError();
                }
              }}
              placeholder={
                isQuotaExceeded
                  ? "Sign in to keep chatting"
                  : "Type a message..."
              }
              disabled={isPending || isQuotaExceeded}
            />
            <InputGroupAddon align="inline-end" className="pr-1.5">
              <InputGroupButton
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 bg-white/4 text-white/65 hover:bg-white/8 hover:text-white"
              >
                Model
                <ChevronDown data-icon="inline-end" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Button
            size="icon-lg"
            className="size-12 rounded-full bg-[#ff7a1a] text-black hover:bg-[#ff8b36] disabled:bg-white/10 disabled:text-white/35"
            type="submit"
            disabled={isPending || isQuotaExceeded || !newMessage.trim()}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </form>
    </div>
  );
};
