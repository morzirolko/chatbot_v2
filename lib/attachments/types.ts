import type { ChatAttachment, ChatAttachmentKind } from "@/lib/types/chat";

export interface AttachmentRecord {
  id: string;
  uploadedByUserId: string;
  messageId: string | null;
  kind: ChatAttachmentKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  objectPath: string;
  extractedText: string | null;
  createdAt: string;
}

export interface UploadAttachmentResult {
  attachment: ChatAttachment;
}
