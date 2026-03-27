import "server-only";

import {
  CHAT_SYSTEM_PROMPT,
  isContextLimitError,
  ThreadTooLongError,
  type StreamAssistantResponseResult,
} from "@/lib/ai/config";
import {
  buildGoogleMessageParts,
  type AttachmentAwareStreamAssistantResponseArgs,
} from "@/lib/ai/attachment-context";
import type { ChatModel } from "@/lib/ai/providers";
import { readServerSentEvents } from "@/lib/utils/sse";

const DEFAULT_GOOGLE_CHAT_MODEL = "gemini-2.5-flash";
const GOOGLE_CHAT_MODELS = new Set<ChatModel>([
  "gemini-2.5-flash",
  "gemma-3-27b-it",
]);

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
  error?: {
    code?: number | string;
    message?: string;
    status?: string;
  };
}

function getGoogleAIKey() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY.");
  }

  return apiKey;
}

function buildConversationInput(
  messages: AttachmentAwareStreamAssistantResponseArgs["messages"],
) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: buildGoogleMessageParts(message),
  }));
}

function extractCandidateText(payload: GeminiStreamChunk) {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? ""
  );
}

function getGoogleErrorMessage(payload: GeminiStreamChunk) {
  if (payload.error?.message) {
    return payload.error.message;
  }

  if (payload.promptFeedback?.blockReasonMessage) {
    return payload.promptFeedback.blockReasonMessage;
  }

  if (payload.promptFeedback?.blockReason) {
    return `Google AI blocked the prompt: ${payload.promptFeedback.blockReason}.`;
  }

  return "Google AI request failed.";
}

function buildGoogleRequestBody(
  googleModel: ChatModel,
  messages: AttachmentAwareStreamAssistantResponseArgs["messages"],
) {
  const isGemma = googleModel.startsWith("gemma");
  const contents = buildConversationInput(messages);

  if (isGemma) {
    contents.unshift({
      role: "user",
      parts: [
        {
          text: `System Instructions: ${CHAT_SYSTEM_PROMPT}`,
        },
      ],
    });

    return { contents };
  }

  return {
    system_instruction: {
      parts: [
        {
          text: CHAT_SYSTEM_PROMPT,
        },
      ],
    },
    contents,
  };
}

export async function streamGoogleAssistantResponse({
  messages,
  model,
  onDelta,
}: AttachmentAwareStreamAssistantResponseArgs & {
  model?: ChatModel;
}): Promise<StreamAssistantResponseResult> {
  const googleModel = GOOGLE_CHAT_MODELS.has(model ?? DEFAULT_GOOGLE_CHAT_MODEL)
    ? (model ?? DEFAULT_GOOGLE_CHAT_MODEL)
    : DEFAULT_GOOGLE_CHAT_MODEL;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": getGoogleAIKey(),
      },
      body: JSON.stringify(buildGoogleRequestBody(googleModel, messages)),
    },
  );

  if (!response.ok) {
    const errorPayload = await response
      .json()
      .catch(() => ({ error: { message: "Google AI request failed." } }));
    const errorMessage =
      errorPayload?.error?.message ?? "Google AI request failed.";
    const errorCode = errorPayload?.error?.status;

    if (isContextLimitError(errorMessage, errorCode)) {
      throw new ThreadTooLongError(errorMessage);
    }

    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("Google AI did not return a response stream.");
  }

  let outputText = "";

  for await (const event of readServerSentEvents(response.body)) {
    const parsedPayload = JSON.parse(event.data) as
      | GeminiStreamChunk
      | GeminiStreamChunk[];
    const payloads = Array.isArray(parsedPayload)
      ? parsedPayload
      : [parsedPayload];

    for (const payload of payloads) {
      const errorMessage = getGoogleErrorMessage(payload);
      const errorCode = payload.error?.status;

      if (payload.error || payload.promptFeedback?.blockReason) {
        if (isContextLimitError(errorMessage, errorCode)) {
          throw new ThreadTooLongError(errorMessage);
        }

        throw new Error(errorMessage);
      }

      const chunkText = extractCandidateText(payload);

      if (!chunkText) {
        continue;
      }

      const delta = chunkText.startsWith(outputText)
        ? chunkText.slice(outputText.length)
        : chunkText;

      if (!delta) {
        continue;
      }

      outputText = chunkText.startsWith(outputText)
        ? chunkText
        : `${outputText}${delta}`;
      onDelta(delta);
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
