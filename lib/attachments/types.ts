import type { ChatAttachment, ChatAttachmentKind } from "@/lib/types/chat";

export type AttachmentStatus = "uploaded" | "attached";
export type TextExtractionStatus = "not_applicable" | "ready" | "failed";

export interface AttachmentRecord {
  id: string;
  uploadedByUserId: string;
  messageId: string | null;
  status: AttachmentStatus;
  kind: ChatAttachmentKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  bucketName: string;
  objectPath: string;
  extractedText: string | null;
  textExtractionStatus: TextExtractionStatus;
  textTruncated: boolean;
  createdAt: string;
}

export interface UploadAttachmentResult {
  attachment: ChatAttachment;
}
