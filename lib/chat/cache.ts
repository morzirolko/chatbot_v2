import type { ChatMessage, ChatThreadResponse } from "@/lib/types/chat";

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export function upsertThreadMessage(
  thread: ChatThreadResponse | undefined,
  message: ChatMessage,
) {
  if (!thread) {
    return thread;
  }

  const nextMessages = thread.messages.filter(
    (existingMessage) => existingMessage.id !== message.id,
  );

  return {
    ...thread,
    messages: sortMessages([...nextMessages, message]),
  };
}
