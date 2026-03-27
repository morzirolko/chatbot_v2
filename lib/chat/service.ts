import "server-only";

import {
  getAttachmentsForMessages,
  hydrateMessagesForModel,
  validateAttachmentIds,
} from "@/lib/attachments/service";
import {
  createChatMessage,
  createChatMessageWithAttachmentsForUser,
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
import type { ChatMessage } from "@/lib/types/chat";

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

  const attachmentsByMessageId = await getAttachmentsForMessages(thread.messages);

  return {
    ...thread,
    messages: thread.messages.map((message) => ({
      ...message,
      attachments: attachmentsByMessageId.get(message.id) ?? [],
    })),
  };
}

export async function createUserMessageForUser(
  userId: string,
  content: string,
  options?: {
    enforceAnonymousQuota?: boolean;
    threadId?: string;
    attachmentIds?: string[];
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

  const attachmentIds = options?.attachmentIds ?? [];
  validateAttachmentIds(attachmentIds);

  const createdMessageId =
    attachmentIds.length > 0
      ? (
          await createChatMessageWithAttachmentsForUser({
            userId,
            threadId: thread.id,
            content,
            attachmentIds,
          })
        ).messageId
      : (
          await createChatMessage({
            threadId: thread.id,
            role: "user",
            content,
          })
        ).id;

  if (options?.enforceAnonymousQuota) {
    await incrementQuestionCountForUser(userId);
  }

  const messages = await listMessagesForThread(thread.id);
  const attachmentsByMessageId = await getAttachmentsForMessages(messages);
  const messagesWithAttachments = messages.map((message) => ({
    ...message,
    attachments: attachmentsByMessageId.get(message.id) ?? [],
  }));
  const messageWithAttachments = messagesWithAttachments.find((item) =>
    item.id === createdMessageId,
  );

  return {
    thread,
    message:
      messageWithAttachments ?? messagesWithAttachments[messagesWithAttachments.length - 1],
    messages: messagesWithAttachments,
  };
}

export async function createAssistantMessageForThread(
  threadId: string,
  content: string,
) {
  return createChatMessage({
    threadId,
    role: "assistant",
    content,
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

export async function hydrateChatMessagesForModel(messages: ChatMessage[]) {
  return hydrateMessagesForModel(messages);
}
