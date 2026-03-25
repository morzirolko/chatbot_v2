import "server-only";

import {
  createChatMessage,
  getQuestionCountForUser,
  getThreadByUserId,
  getOrCreateThreadByUserId,
  incrementQuestionCountForUser,
  listMessagesForThread,
  migrateAnonymousData,
} from "@/lib/chat/repository";

export const ANONYMOUS_FREE_QUESTION_LIMIT = 3;

export class AnonymousQuotaExceededError extends Error {
  constructor(
    message = "You have used all 3 free questions. Sign in to keep chatting.",
  ) {
    super(message);
    this.name = "AnonymousQuotaExceededError";
  }
}

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
  options?: {
    enforceAnonymousQuota?: boolean;
  },
) {
  if (options?.enforceAnonymousQuota) {
    const currentCount = await getQuestionCountForUser(userId);

    if (currentCount >= ANONYMOUS_FREE_QUESTION_LIMIT) {
      throw new AnonymousQuotaExceededError();
    }
  }

  const thread = await getOrCreateThreadByUserId(userId);
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
  if (sourceUserId === destinationUserId) {
    return {
      migrated: false,
    };
  }

  const sourceThread = await getThreadByUserId(sourceUserId);

  if (!sourceThread) {
    return {
      migrated: false,
    };
  }

  const migrated = await migrateAnonymousData(sourceUserId, destinationUserId);

  return {
    migrated,
  };
}
