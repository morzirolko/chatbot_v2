export type ChatProvider = "openai" | "google";
export type ChatModel = "gpt-5.4" | "gemini-2.5-flash" | "gemma-3-27b-it";

export interface ChatModelOption {
  model: ChatModel;
  provider: ChatProvider;
  label: string;
  description: string;
  modelLabel: string;
  shortLabel: string;
}

export const DEFAULT_CHAT_MODEL: ChatModel = "gemma-3-27b-it";
export const DEFAULT_CHAT_PROVIDER: ChatProvider = "google";

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  {
    model: "gpt-5.4",
    provider: "openai",
    label: "OpenAI",
    description: "GPT-5.4",
    modelLabel: "GPT-5.4",
    shortLabel: "GPT-5.4",
  },
  {
    model: "gemini-2.5-flash",
    provider: "google",
    label: "Google AI",
    description: "Gemini 2.5 Flash",
    modelLabel: "Gemini 2.5 Flash",
    shortLabel: "Gemini",
  },
  {
    model: "gemma-3-27b-it",
    provider: "google",
    label: "Google AI",
    description: "Gemma 3 27B",
    modelLabel: "Gemma 3 27B",
    shortLabel: "Gemma 3",
  },
];

export function isChatProvider(
  value: string | null | undefined,
): value is ChatProvider {
  return value === "openai" || value === "google";
}

export function isChatModel(
  value: string | null | undefined,
): value is ChatModel {
  return CHAT_MODEL_OPTIONS.some((option) => option.model === value);
}

export function getChatModelOption(model: ChatModel) {
  return CHAT_MODEL_OPTIONS.find((option) => option.model === model);
}

export function getProviderForChatModel(model: ChatModel): ChatProvider {
  return getChatModelOption(model)?.provider ?? DEFAULT_CHAT_PROVIDER;
}

export function getDefaultChatModelForProvider(
  provider: ChatProvider,
): ChatModel {
  return provider === "google" ? "gemini-2.5-flash" : DEFAULT_CHAT_MODEL;
}

export function resolveChatModel(value: {
  model?: string | null;
  provider?: string | null;
}): ChatModel {
  if (isChatModel(value.model)) {
    return value.model;
  }

  if (isChatProvider(value.provider)) {
    return getDefaultChatModelForProvider(value.provider);
  }

  return DEFAULT_CHAT_MODEL;
}
