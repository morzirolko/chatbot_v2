import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types/chat";

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
  return (
    <div className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}>
      <div
        className={cn("flex w-fit max-w-[75%] flex-col gap-1.5", {
          "items-end": isOwnMessage,
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
            "w-fit rounded-2xl px-3 py-2.5 text-sm leading-6",
            isStreaming && "opacity-90",
            isOwnMessage
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
};
