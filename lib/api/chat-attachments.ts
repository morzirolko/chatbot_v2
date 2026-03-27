import { ApiError, readJsonResponse } from "@/lib/api/error";
import type {
  ChatAttachment,
  ChatAttachmentKind,
} from "@/lib/types/chat";

export type { ChatAttachment, ChatAttachmentKind } from "@/lib/types/chat";

export interface ChatAttachmentUploadResponse {
  attachment: ChatAttachment;
}

export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_IMAGE_ATTACHMENT_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_PDF_ATTACHMENT_SIZE_BYTES = 12 * 1024 * 1024;
export const MAX_DOCUMENT_ATTACHMENT_SIZE_BYTES = 512 * 1024;

export const CHAT_ATTACHMENT_ACCEPT =
  ".jpeg,.jpg,.png,.webp,.pdf,.txt,.md,.json,.csv,image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,application/json,text/csv";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PDF_MIME_TYPES = new Set(["application/pdf"]);
const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
]);

export function isChatImageAttachment(file: File) {
  return IMAGE_MIME_TYPES.has(file.type);
}

export function isChatPdfAttachment(file: File) {
  return PDF_MIME_TYPES.has(file.type);
}

export function isChatTextAttachment(file: File) {
  return TEXT_MIME_TYPES.has(file.type);
}

export function isSupportedChatAttachment(file: File) {
  return (
    isChatImageAttachment(file) ||
    isChatPdfAttachment(file) ||
    isChatTextAttachment(file)
  );
}

export function getChatAttachmentKind(file: File): ChatAttachmentKind | null {
  if (isChatImageAttachment(file)) {
    return "image";
  }

  if (isChatPdfAttachment(file)) {
    return "pdf";
  }

  if (isChatTextAttachment(file)) {
    return "text";
  }

  return null;
}

export function getChatAttachmentSizeLimit(file: File) {
  if (isChatImageAttachment(file)) {
    return MAX_IMAGE_ATTACHMENT_SIZE_BYTES;
  }

  if (isChatPdfAttachment(file)) {
    return MAX_PDF_ATTACHMENT_SIZE_BYTES;
  }

  return MAX_DOCUMENT_ATTACHMENT_SIZE_BYTES;
}

export function getChatAttachmentTypeError(file: File) {
  if (isSupportedChatAttachment(file)) {
    return null;
  }

  return "Unsupported file type. Use an image, PDF, or text document.";
}

export function getChatAttachmentSizeError(file: File) {
  const sizeLimit = getChatAttachmentSizeLimit(file);

  if (file.size <= sizeLimit) {
    return null;
  }

  return `File is too large. Maximum size is ${Math.round(
    sizeLimit / 1024 / 1024,
  )} MB.`;
}

export async function uploadChatAttachment(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/chat/attachments", {
    method: "POST",
    body: formData,
  });

  return readJsonResponse<ChatAttachmentUploadResponse>(response).then(
    (payload) => payload.attachment,
  );
}

export async function deleteChatAttachment(attachmentId: string) {
  const response = await fetch(`/api/chat/attachments/${attachmentId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await readJsonResponse(response);
  }
}

export function getChatAttachmentErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "attachment_invalid_type":
        return "Unsupported file type. Use an image, PDF, or text document.";
      case "attachment_too_large":
        return error.message || "File is too large.";
      case "attachment_empty":
        return "File is empty.";
      case "attachment_pdf_unreadable":
        return "This PDF could not be read as text.";
      case "attachment_upload_failed":
        return "Unable to upload the file.";
      case "attachment_not_found":
        return "Attachment not found.";
      case "attachment_forbidden":
        return "You do not have access to this attachment.";
      case "attachment_already_attached":
        return "This attachment has already been sent.";
      default:
        return error.message || "Attachment request failed.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Attachment request failed.";
}
