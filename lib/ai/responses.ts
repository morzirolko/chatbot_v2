import "server-only";

import type {
  StreamAssistantResponseArgs,
  StreamAssistantResponseResult,
} from "@/lib/ai/config";
import { DEFAULT_CHAT_PROVIDER, type ChatProvider } from "@/lib/ai/providers";
import { streamGoogleAssistantResponse } from "@/lib/google/responses";
import { streamOpenAIAssistantResponse } from "@/lib/openai/responses";

export {
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_SYSTEM_PROMPT,
  ThreadTooLongError,
} from "@/lib/ai/config";

export async function streamAssistantResponse(
  {
    provider = DEFAULT_CHAT_PROVIDER,
    ...args
  }: StreamAssistantResponseArgs & {
    provider?: ChatProvider;
  },
): Promise<StreamAssistantResponseResult> {
  switch (provider) {
    case "google":
      return streamGoogleAssistantResponse(args);
    case "openai":
    default:
      return streamOpenAIAssistantResponse(args);
  }
}
