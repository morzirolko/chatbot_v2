import "server-only";

import type { ChatRole } from "@/lib/types/chat";

export type AttachmentContextKind = "image" | "pdf" | "text";

interface HydratedAttachmentBase {
  id: string;
  kind: AttachmentContextKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface HydratedImageAttachment extends HydratedAttachmentBase {
  kind: "image";
  imageBase64: string;
}

export interface HydratedTextAttachment extends HydratedAttachmentBase {
  kind: "pdf" | "text";
  extractedText: string;
}

export type HydratedChatAttachment =
  | HydratedImageAttachment
  | HydratedTextAttachment;

export interface AttachmentAwareChatMessage {
  role: ChatRole;
  content: string;
  attachments?: HydratedChatAttachment[];
}

export type HydratedChatMessage = AttachmentAwareChatMessage;

export interface AttachmentAwareStreamAssistantResponseArgs {
  messages: AttachmentAwareChatMessage[];
  onDelta: (delta: string) => void;
}

interface OpenAIInputTextPart {
  type: "input_text";
  text: string;
}

interface OpenAIInputImagePart {
  type: "input_image";
  image_url: string;
}

interface GoogleTextPart {
  text: string;
}

interface GoogleInlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export type OpenAIInputPart = OpenAIInputTextPart | OpenAIInputImagePart;
export type GoogleInputPart = GoogleTextPart | GoogleInlineDataPart;

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kibibytes = sizeBytes / 1024;
  if (kibibytes < 1024) {
    return `${kibibytes.toFixed(kibibytes >= 10 ? 0 : 1)} KB`;
  }

  const mebibytes = kibibytes / 1024;
  return `${mebibytes.toFixed(mebibytes >= 10 ? 0 : 1)} MB`;
}

function stripDataUrlPrefix(value: string) {
  const dataUrlMatch = value.match(/^data:([^;]+);base64,(.+)$/);

  if (!dataUrlMatch) {
    return value;
  }

  return dataUrlMatch[2];
}

function toImageDataUrl(mimeType: string, imageBase64: string) {
  if (imageBase64.startsWith("data:")) {
    return imageBase64;
  }

  return `data:${mimeType};base64,${imageBase64}`;
}

function buildAttachmentTextContext(attachment: HydratedTextAttachment) {
  const header = [
    `Attachment: ${attachment.originalName}`,
    attachment.mimeType,
    formatBytes(attachment.sizeBytes),
  ].join(" | ");
  const body = attachment.extractedText.trim();

  return body ? `${header}\n${body}` : header;
}

export function hasAttachmentContext(message: AttachmentAwareChatMessage) {
  return Boolean(message.attachments?.length);
}

export function buildOpenAIMessageContent(
  message: AttachmentAwareChatMessage,
): OpenAIInputPart[] {
  const parts: OpenAIInputPart[] = [];
  const text = message.content.trim();

  if (text) {
    parts.push({
      type: "input_text",
      text,
    });
  }

  for (const attachment of message.attachments ?? []) {
    if (attachment.kind === "image") {
      parts.push({
        type: "input_image",
        image_url: toImageDataUrl(
          attachment.mimeType,
          attachment.imageBase64,
        ),
      });
      continue;
    }

    parts.push({
      type: "input_text",
      text: buildAttachmentTextContext(attachment),
    });
  }

  return parts;
}

export function buildGoogleMessageParts(
  message: AttachmentAwareChatMessage,
): GoogleInputPart[] {
  const parts: GoogleInputPart[] = [];
  const text = message.content.trim();

  if (text) {
    parts.push({
      text,
    });
  }

  for (const attachment of message.attachments ?? []) {
    if (attachment.kind === "image") {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: stripDataUrlPrefix(attachment.imageBase64),
        },
      });
      continue;
    }

    parts.push({
      text: buildAttachmentTextContext(attachment),
    });
  }

  return parts;
}
