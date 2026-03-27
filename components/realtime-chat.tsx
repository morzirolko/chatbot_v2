"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL,
  getDefaultChatModelForProvider,
  isChatModel,
  type ChatModel,
} from "@/lib/ai/providers";
import { getChatRealtimeChannelName } from "@/lib/chat/realtime";
import type { ChatAttachment } from "@/lib/api/chat-attachments";
import type { ChatMessage } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { ChatMessageItem } from "@/components/chat-message";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import {
  useChatAttachments,
  type ChatAttachmentQueueItem,
} from "@/hooks/use-chat-attachments";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useChatThreadQuery } from "@/hooks/use-chat-thread-query";
import { useRealtimeChat } from "@/hooks/use-realtime-chat";
import { useSendMessageMutation } from "@/hooks/use-send-message-mutation";

const STREAMING_MESSAGE_ID = "streaming-assistant-message";
const CHAT_MODEL_STORAGE_KEY = "chat-model";
const LEGACY_CHAT_PROVIDER_STORAGE_KEY = "chat-provider";

interface RealtimeChatProps {
  activeThreadId: string | null;
  focusComposerSignal: number;
  isArchiveLoading: boolean;
  onThreadCreated: (threadId: string) => void;
}

type ChatMessageWithAttachments = Omit<ChatMessage, "attachments"> & {
  attachments?: ChatAttachment[];
};

function formatAttachmentSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ChatAttachmentQueueItem;
  onRemove: (clientId: string) => void;
}) {
  const objectUrl = useMemo(() => {
    if (!attachment.file.type.startsWith("image/")) {
      return null;
    }

    return URL.createObjectURL(attachment.file);
  }, [attachment.file]);

  useEffect(() => {
    if (!objectUrl) {
      return;
    }

    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const isPending =
    attachment.status === "uploading" || attachment.status === "removing";
  const fileTypeLabel = attachment.file.type || "file";

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full items-center gap-3 rounded-[1.25rem] border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        attachment.status === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-50"
          : "border-white/10 bg-black/25 text-white",
      )}
    >
      {objectUrl ? (
        <div className="size-11 overflow-hidden rounded-xl border border-white/10 bg-white/6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={objectUrl} alt={attachment.file.name} className="size-full object-cover" />
        </div>
      ) : (
        <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-white/80">
          <FileText className="size-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{attachment.file.name}</p>
        <p className="truncate text-xs text-white/55">
          {attachment.status === "uploading"
            ? "Uploading..."
            : attachment.status === "removing"
              ? "Removing..."
              : attachment.status === "error"
                ? attachment.error ?? "Upload failed"
                : `${fileTypeLabel} - ${formatAttachmentSize(attachment.file.size)}`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(attachment.clientId)}
        disabled={isPending}
        className={cn(
          "ml-auto inline-flex size-8 items-center justify-center rounded-full transition-colors",
          attachment.status === "error"
            ? "text-red-100 hover:bg-red-500/20"
            : "text-white/60 hover:bg-white/10 hover:text-white",
          isPending && "opacity-60",
        )}
        aria-label={`Remove ${attachment.file.name}`}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <X />}
      </button>
    </div>
  );
}

export function RealtimeChat({
  activeThreadId,
  focusComposerSignal,
  isArchiveLoading,
  onThreadCreated,
}: RealtimeChatProps) {
  const { containerRef, scrollToBottom } = useChatScroll();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    anonymousMessageQuota,
    isAnonymous,
    isLoading: isAuthLoading,
  } = useBrowserAuth();
  const {
    data: threadData,
    error: threadError,
    isLoading: isThreadLoading,
  } = useChatThreadQuery(activeThreadId);
  const activeChannelName =
    activeThreadId && threadData?.thread
      ? getChatRealtimeChannelName(activeThreadId)
      : undefined;
  const { broadcastMessage } = useRealtimeChat(
    activeThreadId,
    activeChannelName,
  );
  const [newMessage, setNewMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<ChatModel>(
    DEFAULT_CHAT_MODEL,
  );
  const {
    queuedAttachments,
    readyAttachmentIds,
    queueError,
    hasErrors,
    isUploading,
    canSendWithAttachments,
    modelAttachmentError,
    addAttachments,
    removeAttachment,
    clearAttachments,
    accept,
  } = useChatAttachments({
    selectedModel,
  });
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
  const isAnonymousQuotaDepleted =
    isAnonymous && anonymousMessageQuota?.remaining === 0;
  const isQuotaExceeded =
    isAnonymous &&
    (streamErrorCode === "quota_exceeded" || isAnonymousQuotaDepleted);
  const isAnonymousProviderDisabled =
    threadError instanceof Error &&
    threadError.message.includes("Supabase anonymous sign-ins are disabled");
  const chatTitle = threadData?.thread.title?.trim() || "New conversation";
  const selectedModelOption =
    CHAT_MODEL_OPTIONS.find(
      (modelOption) => modelOption.model === selectedModel,
    ) ?? CHAT_MODEL_OPTIONS[0];
  const selectedModelMobileLabel = selectedModelOption.shortLabel;
  const anonymousMessagesLabel =
    anonymousMessageQuota?.remaining === 1 ? "free message" : "free messages";

  const allMessages = useMemo(() => {
    const persistedMessages =
      (threadData?.messages as ChatMessageWithAttachments[] | undefined) ?? [];

    if (!threadData?.thread || !streamingText) {
      return persistedMessages;
    }

    const streamingMessage: ChatMessageWithAttachments = {
      id: STREAMING_MESSAGE_ID,
      threadId: threadData.thread.id,
      role: "assistant",
      content: streamingText,
      createdAt: streamingCreatedAt ?? new Date().toISOString(),
      attachments: [],
    };

    return [...persistedMessages, streamingMessage];
  }, [streamingCreatedAt, streamingText, threadData]);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusComposerSignal]);

  useEffect(() => {
    const storedModel = window.localStorage.getItem(CHAT_MODEL_STORAGE_KEY);

    if (isChatModel(storedModel)) {
      setSelectedModel(storedModel);
      return;
    }

    const legacyStoredProvider = window.localStorage.getItem(
      LEGACY_CHAT_PROVIDER_STORAGE_KEY,
    );

    if (
      legacyStoredProvider === "openai" ||
      legacyStoredProvider === "google"
    ) {
      setSelectedModel(getDefaultChatModelForProvider(legacyStoredProvider));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CHAT_MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  const handleSendMessage = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const content = newMessage.trim();

      if (
        !content ||
        isPending ||
        isQuotaExceeded ||
        isUploading ||
        hasErrors ||
        !canSendWithAttachments
      ) {
        return;
      }

      clearStreamError();
      await sendMessage({
        content,
        model: selectedModel,
        attachmentIds: readyAttachmentIds,
      })
        .then(() => {
          setNewMessage("");
          clearAttachments();
        })
        .catch(() => undefined);
    },
    [
      canSendWithAttachments,
      clearAttachments,
      clearStreamError,
      hasErrors,
      isPending,
      isQuotaExceeded,
      isUploading,
      newMessage,
      readyAttachmentIds,
      selectedModel,
      sendMessage,
    ],
  );

  const handleAttachmentSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      event.target.value = "";

      if (!files.length || isPending || isQuotaExceeded) {
        return;
      }

      await addAttachments(files);
    },
    [addAttachments, isPending, isQuotaExceeded],
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

  if (activeThreadId && !threadData && threadError instanceof Error) {
    if (isAnonymousProviderDisabled) {
      return (
        <div className="w-full rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,140,56,0.08),rgba(255,255,255,0.04))] p-4 text-sm backdrop-blur-xl">
          <p className="text-white">Guest chat is currently unavailable.</p>
          <p className="mt-2 text-white/55">
            Sign in or create an account to keep using the chat while anonymous
            sign-ins are disabled.
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

      {isAnonymous && anonymousMessageQuota ? (
        <div className="border-b border-white/8 px-4 py-3">
          <div className="mx-auto w-full max-w-216 px-2">
            <Alert>
              <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
              <AlertTitle>
                {anonymousMessageQuota.remaining} {anonymousMessagesLabel} left
              </AlertTitle>
              <AlertDescription>
                {anonymousMessageQuota.remaining > 0
                  ? `Guest chat includes ${anonymousMessageQuota.limit} free messages. Sign in to keep your history and continue after the limit.`
                  : "Your guest message limit is used up. Sign in or create an account to keep chatting."}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      ) : null}

      <div ref={containerRef} className="min-h-0 flex-1">
        <ScrollArea className="size-full overflow-hidden">
          {!activeThreadId ? (
            <div className="flex h-full items-center justify-center px-4 py-4">
              <div className="w-full max-w-216 px-2">
                <div className="mx-auto max-w-md rounded-[1.75rem] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(255,140,56,0.07),rgba(255,255,255,0.025))] p-7 text-center">
                  <h2 className="font-heading text-xl font-medium text-white">
                    Start a clean thread
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Send a message to create a new conversation in your sidebar.
                  </p>
                </div>
              </div>
            </div>
          ) : allMessages.length === 0 ? (
            <div className="mx-auto flex h-full w-full max-w-216 items-center justify-center px-6 py-4 text-center text-sm text-white/45">
              No messages yet. Start the conversation.
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-216 flex-col gap-5 px-4 py-4 sm:px-6">
              {allMessages.map((message, index) => {
                const previousMessage =
                  index > 0 ? allMessages[index - 1] : null;
                const showHeader =
                  !previousMessage || previousMessage.role !== message.role;

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
            <p role="alert" className="text-red-200">
              {streamError}
            </p>
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
        <TooltipProvider delayDuration={100}>
          <div className="mx-auto flex w-full max-w-216 flex-col gap-3 px-2">
            {queuedAttachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {queuedAttachments.map((attachment) => (
                  <AttachmentChip
                    key={attachment.clientId}
                    attachment={attachment}
                    onRemove={(clientId) => void removeAttachment(clientId)}
                  />
                ))}
              </div>
            ) : null}

            {queueError ? (
              <p role="alert" className="px-1 text-sm text-red-200">
                {queueError}
              </p>
            ) : null}

            {modelAttachmentError ? (
              <p role="alert" className="px-1 text-sm text-amber-200">
                {modelAttachmentError}
              </p>
            ) : null}

            <div className="flex gap-3">
              <InputGroup
                data-disabled={isPending || isQuotaExceeded}
                className="h-12 flex-1 rounded-full border-white/10 bg-black/25 text-white"
              >
                <InputGroupInput
                  ref={inputRef}
                  className={cn(
                    "h-full px-0 text-white placeholder:text-white/35",
                  )}
                  type="text"
                  value={newMessage}
                  onChange={(event) => {
                    setNewMessage(event.target.value);
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
                <InputGroupAddon align="inline-end" className="gap-1 pr-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InputGroupButton
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full text-white/65 hover:bg-white/8 hover:text-white"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Attach files"
                        disabled={isPending || isQuotaExceeded}
                      >
                        <Paperclip />
                      </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>Attach files</TooltipContent>
                  </Tooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <InputGroupButton
                        variant="outline"
                        size="sm"
                        className="max-w-32 rounded-full border-white/10 bg-white/4 text-white/65 hover:bg-white/8 hover:text-white sm:max-w-none"
                      >
                        <span className="truncate sm:hidden">
                          {selectedModelMobileLabel}
                        </span>
                        <span className="hidden sm:inline">
                          {selectedModelOption.modelLabel}
                        </span>
                        <ChevronDown data-icon="inline-end" />
                      </InputGroupButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-72 rounded-2xl border border-white/10 bg-[#121212] p-1 text-white shadow-2xl ring-white/10"
                    >
                      <DropdownMenuLabel className="text-white/45">
                        AI model
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={selectedModel}
                        onValueChange={(value) =>
                          setSelectedModel(value as ChatModel)
                        }
                      >
                        {CHAT_MODEL_OPTIONS.map((modelOption) => (
                          <DropdownMenuRadioItem
                            key={modelOption.model}
                            value={modelOption.model}
                            className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-white focus:bg-white/8 focus:text-white"
                          >
                            <span className="font-medium">
                              {modelOption.modelLabel}
                            </span>
                            <span className="text-xs text-white/45">
                              {modelOption.label}
                            </span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </InputGroupAddon>
              </InputGroup>
              <Button
                size="icon-lg"
                className="size-12 rounded-full bg-[#ff7a1a] text-black hover:bg-[#ff8b36] disabled:bg-white/10 disabled:text-white/35"
                type="submit"
                aria-label={isPending ? "Sending message" : "Send message"}
                disabled={
                  isPending ||
                  isQuotaExceeded ||
                  isUploading ||
                  hasErrors ||
                  !canSendWithAttachments ||
                  !newMessage.trim()
                }
              >
                {isPending ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
          </div>
        </TooltipProvider>
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          multiple
          accept={accept}
          onChange={(event) => {
            void handleAttachmentSelect(event);
          }}
        />
      </form>
    </div>
  );
}
