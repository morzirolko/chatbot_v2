import "server-only";

import {
  createChatMessage,
  getOrCreateThreadByUserId,
  listMessagesForThread,
} from "@/lib/chat/repository";

export async function getChatThreadForUser(userId: string) {
  const thread = await getOrCreateThreadByUserId(userId);
  const messages = await listMessagesForThread(thread.id);

  return {
    thread,
    messages,
  };
}

export async function createUserMessageForUser(
  userId: string,
  content: string,
) {
  const thread = await getOrCreateThreadByUserId(userId);
  const message = await createChatMessage({
    threadId: thread.id,
    role: "user",
    content,
  });
  const messages = await listMessagesForThread(thread.id);

  return {
    thread,
    message,
    messages,
  };
}

export async function createAssistantMessageForThread(
  threadId: string,
  content: string,
  openaiResponseId?: string | null,
) {
  return createChatMessage({
    threadId,
    role: "assistant",
    content,
    openaiResponseId,
  });
}
