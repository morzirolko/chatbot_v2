import { getChatRealtimeChannelName } from "@/lib/chat/realtime";
import { buildThreadPreview, buildThreadTitle } from "@/lib/chat/thread";
import type {
  ChatMessage,
  ChatThreadResponse,
  ChatThreadSummary,
} from "@/lib/types/chat";

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
    thread: {
      ...thread.thread,
      updatedAt: message.createdAt,
    },
    messages: sortMessages([...nextMessages, message]),
  };
}

export function createThreadDetailFromMessage(message: ChatMessage) {
  return {
    thread: {
      id: message.threadId,
      title: buildThreadTitle(message.content),
      createdAt: message.createdAt,
      updatedAt: message.createdAt,
      realtimeChannelName: getChatRealtimeChannelName(message.threadId),
    },
    messages: [message],
  } satisfies ChatThreadResponse;
}

export function upsertThreadSummary(
  threads: ChatThreadSummary[] | undefined,
  message: ChatMessage,
) {
  const nextSummary: ChatThreadSummary = {
    id: message.threadId,
    title: buildThreadTitle(message.content),
    preview: buildThreadPreview(message.content),
    createdAt: message.createdAt,
    updatedAt: message.createdAt,
  };

  const currentThreads = threads ?? [];
  const existingThread = currentThreads.find(
    (thread) => thread.id === message.threadId,
  );

  if (existingThread) {
    nextSummary.title = existingThread.title ?? nextSummary.title;
    nextSummary.createdAt = existingThread.createdAt;
  }

  return [nextSummary, ...currentThreads.filter((thread) => thread.id !== message.threadId)].sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt),
  );
}
