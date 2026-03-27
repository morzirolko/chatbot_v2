import "server-only";

import {
  CHAT_SYSTEM_PROMPT,
  isContextLimitError,
  ThreadTooLongError,
  type StreamAssistantResponseResult,
} from "@/lib/ai/config";
import {
  buildOpenAIMessageContent,
  type AttachmentAwareStreamAssistantResponseArgs,
} from "@/lib/ai/attachment-context";
import { readServerSentEvents } from "@/lib/utils/sse";

const CHAT_MODEL = "gpt-5.4";

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return apiKey;
}

function buildConversationInput(
  messages: AttachmentAwareStreamAssistantResponseArgs["messages"],
) {
  return messages.map((message) => ({
    role: message.role,
    content: buildOpenAIMessageContent(message),
  }));
}

export async function streamOpenAIAssistantResponse({
  messages,
  onDelta,
}: AttachmentAwareStreamAssistantResponseArgs): Promise<StreamAssistantResponseResult> {
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

  let outputText = "";

  for await (const event of readServerSentEvents(response.body)) {
    if (event.data === "[DONE]") {
      break;
    }

    const payload = JSON.parse(event.data) as {
      type?: string;
      delta?: string;
      text?: string;
      error?: { code?: string; message?: string };
      message?: string;
    };

    switch (payload.type) {
      case "response.created":
      case "response.completed":
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
    content,
  };
}
