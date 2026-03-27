import type { ChatMessage } from "@/lib/types/chat";

export const CHAT_MAX_MESSAGE_LENGTH = 4000;
export const CHAT_SYSTEM_PROMPT =
  "You are a helpful assistant. Answer clearly, briefly, and accurately.";

export interface StreamAssistantResponseArgs {
  messages: ChatMessage[];
  onDelta: (delta: string) => void;
}

export interface StreamAssistantResponseResult {
  content: string;
}

export class ThreadTooLongError extends Error {
  constructor(message = "This thread is too long to send in one request.") {
    super(message);
    this.name = "ThreadTooLongError";
  }
}

export function isContextLimitError(errorMessage: string, errorCode?: string) {
  const normalizedMessage = errorMessage.toLowerCase();

  return (
    errorCode === "context_length_exceeded" ||
    normalizedMessage.includes("context") ||
    normalizedMessage.includes("token limit") ||
    normalizedMessage.includes("too many tokens")
  );
}
