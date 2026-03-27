import "server-only";

import type {
  StreamAssistantResponseArgs,
  StreamAssistantResponseResult,
} from "@/lib/ai/config";
import {
  DEFAULT_CHAT_MODEL,
  getProviderForChatModel,
  type ChatModel,
  type ChatProvider,
} from "@/lib/ai/providers";
import { streamGoogleAssistantResponse } from "@/lib/google/responses";
import { streamOpenAIAssistantResponse } from "@/lib/openai/responses";

export {
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_SYSTEM_PROMPT,
  ThreadTooLongError,
} from "@/lib/ai/config";

export async function streamAssistantResponse({
  model = DEFAULT_CHAT_MODEL,
  provider,
  ...args
}: StreamAssistantResponseArgs & {
  model?: ChatModel;
  provider?: ChatProvider;
}): Promise<StreamAssistantResponseResult> {
  switch (provider ?? getProviderForChatModel(model)) {
    case "google":
      return streamGoogleAssistantResponse({
        ...args,
        model,
      });
    case "openai":
    default:
      return streamOpenAIAssistantResponse(args);
  }
}
