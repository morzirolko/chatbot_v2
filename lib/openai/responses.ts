import "server-only";

import {
  CHAT_SYSTEM_PROMPT,
  isContextLimitError,
  ThreadTooLongError,
  type StreamAssistantResponseArgs,
  type StreamAssistantResponseResult,
} from "@/lib/ai/config";
import type { ChatMessage } from "@/lib/types/chat";
import { readServerSentEvents } from "@/lib/utils/sse";

const CHAT_MODEL = "gpt-5.4";

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return apiKey;
}

function buildConversationInput(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export async function streamOpenAIAssistantResponse({
  messages,
  onDelta,
}: StreamAssistantResponseArgs): Promise<StreamAssistantResponseResult> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      instructions: CHAT_SYSTEM_PROMPT,
      input: buildConversationInput(messages),
      store: false,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response
      .json()
      .catch(() => ({ error: { message: "OpenAI request failed." } }));
    const errorMessage =
      errorPayload?.error?.message ?? "OpenAI request failed.";
    const errorCode = errorPayload?.error?.code;

    if (isContextLimitError(errorMessage, errorCode)) {
      throw new ThreadTooLongError(errorMessage);
    }

    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("OpenAI did not return a response stream.");
  }

  let responseId: string | null = null;
  let outputText = "";

  for await (const event of readServerSentEvents(response.body)) {
    if (event.data === "[DONE]") {
      break;
    }

    const payload = JSON.parse(event.data) as {
      type?: string;
      delta?: string;
      text?: string;
      response?: { id?: string };
      response_id?: string;
      error?: { code?: string; message?: string };
      message?: string;
    };

    responseId ??= payload.response?.id ?? payload.response_id ?? null;

    switch (payload.type) {
      case "response.created":
      case "response.completed":
        responseId ??= payload.response?.id ?? payload.response_id ?? null;
        break;
      case "response.output_text.delta":
        if (payload.delta) {
          outputText += payload.delta;
          onDelta(payload.delta);
        }
        break;
      case "response.output_text.done":
        if (!outputText && payload.text) {
          outputText = payload.text;
        }
        break;
      case "response.failed":
      case "error": {
        const errorMessage =
          payload.error?.message ?? payload.message ?? "OpenAI stream failed.";
        const errorCode = payload.error?.code;

        if (isContextLimitError(errorMessage, errorCode)) {
          throw new ThreadTooLongError(errorMessage);
        }

        throw new Error(errorMessage);
      }
      default:
        break;
    }
  }

  const content = outputText.trim();
  if (!content) {
    throw new Error("Assistant returned an empty response.");
  }

  return {
    responseId,
    content,
  };
}
