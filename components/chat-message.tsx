import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types/chat";
import { ChatMarkdown } from "@/components/chat-markdown";

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
  isStreaming?: boolean;
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
              {new Date(message.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
        )}
        <div
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
      </div>
    </div>
  );
};
