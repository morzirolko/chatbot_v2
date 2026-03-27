import { FileText, Link2 } from "lucide-react";

import type { ChatAttachment } from "@/lib/api/chat-attachments";
import type { ChatMessage } from "@/lib/types/chat";
import { cn } from "@/lib/utils";
import { ChatMarkdown } from "@/components/chat-markdown";

const messageTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

type ChatMessageWithAttachments = Omit<ChatMessage, "attachments"> & {
  attachments?: ChatAttachment[];
};

interface ChatMessageItemProps {
  message: ChatMessageWithAttachments;
  isOwnMessage: boolean;
  showHeader: boolean;
  isStreaming?: boolean;
}

function formatAttachmentSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  const isImage = attachment.kind === "image";

  return (
    <a
      href={attachment.contentUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-black/20 px-3 py-2.5 text-left transition-colors hover:border-white/18 hover:bg-black/30"
    >
      {isImage ? (
        <div className="size-11 overflow-hidden rounded-xl border border-white/10 bg-white/6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.contentUrl}
            alt={attachment.originalName}
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-white/80">
          <FileText className="size-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {attachment.originalName}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/55">
          {attachment.kind.toUpperCase()} - {formatAttachmentSize(attachment.sizeBytes)}
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-white/55 transition-colors group-hover:text-white/80">
        <Link2 className="size-3.5" />
        Open
      </div>
    </a>
  );
}

export const ChatMessageItem = ({
  message,
  isOwnMessage,
  showHeader,
  isStreaming = false,
}: ChatMessageItemProps) => {
  const bubbleClassName = isOwnMessage
    ? "w-fit rounded-[1.6rem] bg-primary text-primary-foreground"
    : "w-full rounded-[1.45rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";

  return (
    <div className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}>
      <div
        className={cn("flex flex-col gap-1.5", {
          "max-w-[82%] items-end sm:max-w-[75%]": isOwnMessage,
          "max-w-[94%] sm:max-w-[88%] lg:max-w-[82%]": !isOwnMessage,
        })}
      >
        {showHeader && (
          <div
            className={cn(
              "flex items-center gap-2 px-1 text-xs text-foreground/60",
              {
                "justify-end flex-row-reverse": isOwnMessage,
              },
            )}
          >
            <span className="font-medium text-foreground/80">
              {isOwnMessage ? "You" : "Assistant"}
            </span>
            <span>
              {messageTimeFormatter.format(new Date(message.createdAt))}
            </span>
          </div>
        )}
        <div
          aria-busy={isStreaming}
          className={cn(
            "px-3 py-2.5 text-sm leading-6",
            isStreaming && "opacity-90",
            bubbleClassName,
          )}
        >
          {isOwnMessage ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <ChatMarkdown content={message.content} />
          )}
        </div>
        {isOwnMessage && message.attachments?.length ? (
          <div className="flex w-full flex-col gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentCard key={attachment.id} attachment={attachment} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
