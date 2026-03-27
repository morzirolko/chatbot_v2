export type ChatProvider = "openai" | "google";

export interface ChatProviderOption {
  provider: ChatProvider;
  label: string;
  description: string;
  modelLabel: string;
}

export const DEFAULT_CHAT_PROVIDER: ChatProvider = "openai";

export const CHAT_PROVIDER_OPTIONS: ChatProviderOption[] = [
  {
    provider: "openai",
    label: "OpenAI",
    description: "GPT-5.4",
    modelLabel: "GPT-5.4",
  },
  {
    provider: "google",
    label: "Google AI",
    description: "Gemini 2.5 Flash",
    modelLabel: "Gemini 2.5 Flash",
  },
];

export function isChatProvider(value: string | null | undefined): value is ChatProvider {
  return value === "openai" || value === "google";
}
