export const sessionQueryKey = ["session"] as const;
export const chatThreadsQueryKey = ["chat-threads"] as const;
export const chatThreadQueryKeyPrefix = ["chat-thread"] as const;

export function chatThreadQueryKey(threadId: string) {
  return [...chatThreadQueryKeyPrefix, threadId] as const;
}
