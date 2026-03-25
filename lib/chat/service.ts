import "server-only";

import {
  createChatMessage,
  createThreadForUser,
  getQuestionCountForUser,
  getThreadByIdForUser,
  incrementQuestionCountForUser,
  listMessagesForThread,
  listMessagesForThreadOwnedByUser,
  listThreadsForUser,
  migrateAnonymousData,
} from "@/lib/chat/repository";
import { buildThreadTitle } from "@/lib/chat/thread";

export const ANONYMOUS_FREE_QUESTION_LIMIT = 3;

export class AnonymousQuotaExceededError extends Error {
  constructor(
    message = "You have used all 3 free questions. Sign in to keep chatting.",
  ) {
    super(message);
    this.name = "AnonymousQuotaExceededError";
  }
}

export class ChatThreadNotFoundError extends Error {
  constructor(message = "Chat thread not found.") {
    super(message);
    this.name = "ChatThreadNotFoundError";
  }
}

export async function listChatThreadsForUser(userId: string) {
  return listThreadsForUser(userId);
}

export async function getChatThreadForUser(userId: string, threadId: string) {
  const thread = await listMessagesForThreadOwnedByUser(userId, threadId);

  if (!thread) {
    throw new ChatThreadNotFoundError();
  }

  return thread;
}

export async function createUserMessageForUser(
  userId: string,
  content: string,
  options?: {
    enforceAnonymousQuota?: boolean;
    threadId?: string;
  },
) {
  if (options?.enforceAnonymousQuota) {
    const currentCount = await getQuestionCountForUser(userId);

    if (currentCount >= ANONYMOUS_FREE_QUESTION_LIMIT) {
      throw new AnonymousQuotaExceededError();
    }
  }

  const thread = options?.threadId
    ? await getThreadByIdForUser(userId, options.threadId)
    : await createThreadForUser({
        userId,
        title: buildThreadTitle(content),
      });

  if (!thread) {
    throw new ChatThreadNotFoundError();
  }

  const message = await createChatMessage({
    threadId: thread.id,
    role: "user",
    content,
  });

  if (options?.enforceAnonymousQuota) {
    await incrementQuestionCountForUser(userId);
  }

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

export async function migrateAnonymousChatHistory(
  sourceUserId: string,
  destinationUserId: string,
) {
  const migrated = await migrateAnonymousData(sourceUserId, destinationUserId);

  return {
    migrated,
  };
}
