const CHAT_REALTIME_CHANNEL_PREFIX = "chat:thread:";

export const CHAT_PERSISTED_MESSAGE_EVENT = "message.persisted";

export function getChatRealtimeChannelName(threadId: string) {
  return `${CHAT_REALTIME_CHANNEL_PREFIX}${threadId}`;
}
