import type { ChatModel, ChatProvider } from "@/lib/ai/providers";

export type ChatRole = "user" | "assistant";
export type ChatAttachmentKind = "image" | "pdf" | "text";

export interface ChatAttachment {
  id: string;
  kind: ChatAttachmentKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  contentUrl: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  attachments: ChatAttachment[];
}

export interface ChatThread {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatThreadSummary {
  id: string;
  title: string | null;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatThreadResponse {
  thread: ChatThread;
  messages: ChatMessage[];
}

export interface SendChatMessageInput {
  content: string;
  threadId?: string;
  provider?: ChatProvider;
  model?: ChatModel;
  attachmentIds?: string[];
}

export interface ChatMessageAckEvent {
  type: "ack";
  message: ChatMessage;
}

export interface ChatMessageDeltaEvent {
  type: "delta";
  delta: string;
}

export interface ChatMessageDoneEvent {
  type: "done";
  message: ChatMessage;
}

export interface ChatMessageErrorEvent {
  type: "error";
  error: string;
  code?: string;
}

export type ChatStreamEvent =
  | ChatMessageAckEvent
  | ChatMessageDeltaEvent
  | ChatMessageDoneEvent
  | ChatMessageErrorEvent;
