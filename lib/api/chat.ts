import type { ChatStreamEvent, ChatThreadResponse } from "@/lib/types/chat";
import { readServerSentEvents } from "@/lib/utils/sse";

async function readJsonResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }

  return payload as T;
}

export async function getChatThread() {
  const response = await fetch("/api/chat/thread", {
    cache: "no-store",
  });

  return readJsonResponse<ChatThreadResponse>(response);
}

export async function sendChatMessage({
  content,
  onEvent,
}: {
  content: string;
  onEvent: (event: ChatStreamEvent) => void | Promise<void>;
}) {
  const response = await fetch("/api/chat/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
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
      throw new Error(payload.error);
    }
  }
}
