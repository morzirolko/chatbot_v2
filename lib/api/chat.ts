import type {
  ChatStreamEvent,
  ChatThreadResponse,
  ChatThreadSummary,
} from "@/lib/types/chat";
import { ApiError, readJsonResponse } from "@/lib/api/error";
import { readServerSentEvents } from "@/lib/utils/sse";

export async function getChatThreads() {
  const response = await fetch("/api/chat/threads", {
    cache: "no-store",
  });

  return readJsonResponse<ChatThreadSummary[]>(response);
}

export async function getChatThread(threadId: string) {
  const response = await fetch(`/api/chat/threads/${threadId}`, {
    cache: "no-store",
  });

  return readJsonResponse<ChatThreadResponse>(response);
}

export async function sendChatMessage({
  content,
  threadId,
  provider,
  model,
  attachmentIds,
  onEvent,
}: {
  content: string;
  threadId?: string;
  provider?: string;
  model?: string;
  attachmentIds?: string[];
  onEvent: (event: ChatStreamEvent) => void | Promise<void>;
}) {
  const response = await fetch("/api/chat/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      threadId,
      provider,
      model,
      attachmentIds,
    }),
  });

  if (!response.ok) {
    await readJsonResponse(response);
    return;
  }

  if (!response.body) {
    throw new Error("Missing response stream.");
  }

  for await (const event of readServerSentEvents(response.body)) {
    const payload = JSON.parse(event.data) as ChatStreamEvent;
    await onEvent(payload);

    if (payload.type === "error") {
      throw new ApiError(payload.error, 400, payload.code);
    }
  }
}
