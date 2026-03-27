import "server-only";

import type { HydratedChatMessage } from "@/lib/ai/attachment-context";
import {
  deleteAttachmentObject,
  deleteAttachmentRecord,
  downloadAttachmentObject,
  getAttachmentAccessById,
  getAttachmentById,
  insertAttachmentRecord,
  listAttachmentsForMessageIds,
  uploadAttachmentObject,
} from "@/lib/attachments/repository";
import type {
  AttachmentRecord,
  UploadAttachmentResult,
} from "@/lib/attachments/types";
import type { ChatAttachment, ChatAttachmentKind, ChatMessage } from "@/lib/types/chat";

const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_BYTES = 512 * 1024;
const MAX_EXTRACTED_TEXT_LENGTH = 20_000;

const ATTACHMENT_TYPE_CONFIG = {
  "image/jpeg": { kind: "image", extensions: [".jpg", ".jpeg"], maxBytes: MAX_IMAGE_BYTES },
  "image/png": { kind: "image", extensions: [".png"], maxBytes: MAX_IMAGE_BYTES },
  "image/webp": { kind: "image", extensions: [".webp"], maxBytes: MAX_IMAGE_BYTES },
  "application/pdf": { kind: "pdf", extensions: [".pdf"], maxBytes: MAX_PDF_BYTES },
  "text/plain": { kind: "text", extensions: [".txt"], maxBytes: MAX_TEXT_BYTES },
  "text/markdown": {
    kind: "text",
    extensions: [".md", ".markdown"],
    maxBytes: MAX_TEXT_BYTES,
  },
  "application/json": { kind: "text", extensions: [".json"], maxBytes: MAX_TEXT_BYTES },
  "text/csv": { kind: "text", extensions: [".csv"], maxBytes: MAX_TEXT_BYTES },
} satisfies Record<
  string,
  {
    kind: ChatAttachmentKind;
    extensions: string[];
    maxBytes: number;
  }
>;
const ATTACHMENT_TYPE_CONFIG_BY_MIME = ATTACHMENT_TYPE_CONFIG as Record<
  string,
  {
    kind: ChatAttachmentKind;
    extensions: string[];
    maxBytes: number;
  }
>;

export class AttachmentError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AttachmentError";
    this.code = code;
    this.status = status;
  }
}

function getExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const extensionIndex = normalizedName.lastIndexOf(".");

  return extensionIndex >= 0 ? normalizedName.slice(extensionIndex) : "";
}

function sanitizeFileName(fileName: string) {
  const normalizedName = fileName
    .trim()
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-");

  return normalizedName || "attachment";
}

function resolveAttachmentConfig(file: File) {
  const fileType = file.type.trim().toLowerCase();
  const config = ATTACHMENT_TYPE_CONFIG_BY_MIME[fileType];
  const extension = getExtension(file.name);

  if (!config || !config.extensions.includes(extension)) {
    throw new AttachmentError(
      "This file type is not supported.",
      "attachment_invalid_type",
      415,
    );
  }

  if (file.size <= 0) {
    throw new AttachmentError(
      "The selected file is empty.",
      "attachment_empty",
      400,
    );
  }

  if (file.size > config.maxBytes) {
    throw new AttachmentError(
      "The selected file is too large.",
      "attachment_too_large",
      400,
    );
  }

  return {
    ...config,
    mimeType: fileType,
  };
}

function buildObjectPath(attachmentId: string, fileName: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `chat/${year}/${month}/${attachmentId}/${sanitizeFileName(fileName)}`;
}

function normalizeExtractedText(value: string) {
  const normalizedValue = value.replace(/\u0000/g, "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.length <= MAX_EXTRACTED_TEXT_LENGTH) {
    return normalizedValue;
  }

  return normalizedValue.slice(0, MAX_EXTRACTED_TEXT_LENGTH).trimEnd();
}

async function extractPdfText(fileBytes: Uint8Array) {
  const runtimeRequire = eval("require") as (specifier: string) => unknown;
  const canvas = runtimeRequire("@napi-rs/canvas") as {
    DOMMatrix: unknown;
    ImageData: unknown;
    Path2D: unknown;
  };
  const { PDFParse } = runtimeRequire("pdf-parse") as {
    PDFParse: new (input: { data: Uint8Array }) => {
      destroy(): Promise<void>;
      getText(): Promise<{ text?: string }>;
    };
  };

  if (typeof globalThis.DOMMatrix === "undefined") {
    Reflect.set(globalThis, "DOMMatrix", canvas.DOMMatrix);
  }

  if (typeof globalThis.Path2D === "undefined") {
    Reflect.set(globalThis, "Path2D", canvas.Path2D);
  }

  if (typeof globalThis.ImageData === "undefined") {
    Reflect.set(globalThis, "ImageData", canvas.ImageData);
  }

  const parser = new PDFParse({ data: fileBytes });
  const result = await parser.getText();
  await parser.destroy();

  return result.text ?? "";
}

async function extractAttachmentText(input: {
  kind: ChatAttachmentKind;
  fileBytes: Uint8Array;
}) {
  if (input.kind === "image") {
    return null;
  }

  const rawText =
    input.kind === "pdf"
      ? await extractPdfText(input.fileBytes)
      : new TextDecoder("utf-8").decode(input.fileBytes);
  const extractedText = normalizeExtractedText(rawText);

  if (input.kind === "pdf" && !extractedText) {
    throw new AttachmentError(
      "This PDF does not contain extractable text.",
      "attachment_pdf_unreadable",
      422,
    );
  }

  return extractedText;
}

function toChatAttachment(record: AttachmentRecord): ChatAttachment {
  return {
    id: record.id,
    kind: record.kind,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    contentUrl: `/api/chat/attachments/${record.id}/content`,
  };
}

export function validateAttachmentIds(attachmentIds: string[]) {
  if (attachmentIds.length > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new AttachmentError(
      `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
      "attachment_limit_exceeded",
      400,
    );
  }
}

export async function uploadAttachmentForUser(userId: string, file: File) {
  const config = resolveAttachmentConfig(file);
  const attachmentId = crypto.randomUUID();
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const extraction = await extractAttachmentText({
    kind: config.kind,
    fileBytes,
  });
  const objectPath = buildObjectPath(attachmentId, file.name);

  try {
    await uploadAttachmentObject({
      objectPath,
      data: fileBytes,
      contentType: config.mimeType,
    });
  } catch {
    throw new AttachmentError(
      "Unable to upload the selected file.",
      "attachment_upload_failed",
      500,
    );
  }

  try {
    const record = await insertAttachmentRecord({
      id: attachmentId,
      uploadedByUserId: userId,
      kind: config.kind,
      originalName: file.name,
      mimeType: config.mimeType,
      sizeBytes: file.size,
      objectPath,
      extractedText: extraction,
    });

    return {
      attachment: toChatAttachment(record),
    } satisfies UploadAttachmentResult;
  } catch (error) {
    await deleteAttachmentObject(objectPath).catch(() => undefined);

    throw error;
  }
}

export async function deleteStagedAttachmentForUser(userId: string, attachmentId: string) {
  const access = await getAttachmentAccessById(attachmentId);

  if (!access) {
    throw new AttachmentError(
      "Attachment not found.",
      "attachment_not_found",
      404,
    );
  }

  if (access.attachment.uploadedByUserId !== userId) {
    throw new AttachmentError(
      "You do not have access to this attachment.",
      "attachment_forbidden",
      403,
    );
  }

  if (access.attachment.messageId) {
    throw new AttachmentError(
      "Attached files cannot be deleted from the staging queue.",
      "attachment_already_attached",
      409,
    );
  }

  await deleteAttachmentObject(access.attachment.objectPath);
  await deleteAttachmentRecord(access.attachment.id);
}

export async function getAttachmentContentForUser(userId: string, attachmentId: string) {
  const access = await getAttachmentAccessById(attachmentId);

  if (!access) {
    throw new AttachmentError(
      "Attachment not found.",
      "attachment_not_found",
      404,
    );
  }

  const canAccess =
    (access.attachment.messageId === null &&
      access.attachment.uploadedByUserId === userId) ||
    (access.attachment.messageId !== null && access.threadUserId === userId);

  if (!canAccess) {
    throw new AttachmentError(
      "You do not have access to this attachment.",
      "attachment_forbidden",
      403,
    );
  }

  const blob = await downloadAttachmentObject({
    objectPath: access.attachment.objectPath,
  });

  return {
    blob,
    mimeType: access.attachment.mimeType,
    originalName: access.attachment.originalName,
  };
}

export async function getAttachmentsForMessages(messages: Pick<ChatMessage, "id">[]) {
  const records = await listAttachmentsForMessageIds(messages.map((message) => message.id));

  return records.reduce<Map<string, ChatAttachment[]>>((attachmentsByMessageId, record) => {
    if (!record.messageId) {
      return attachmentsByMessageId;
    }

    const nextAttachments = attachmentsByMessageId.get(record.messageId) ?? [];
    nextAttachments.push(toChatAttachment(record));
    attachmentsByMessageId.set(record.messageId, nextAttachments);
    return attachmentsByMessageId;
  }, new Map());
}

export async function hydrateMessagesForModel(messages: ChatMessage[]) {
  const records = await listAttachmentsForMessageIds(messages.map((message) => message.id));
  const recordsByMessageId = records.reduce<Map<string, AttachmentRecord[]>>(
    (attachmentsByMessageId, record) => {
      if (!record.messageId) {
        return attachmentsByMessageId;
      }

      const nextRecords = attachmentsByMessageId.get(record.messageId) ?? [];
      nextRecords.push(record);
      attachmentsByMessageId.set(record.messageId, nextRecords);
      return attachmentsByMessageId;
    },
    new Map(),
  );

  return Promise.all(
    messages.map(async (message) => {
      const attachmentRecords = recordsByMessageId.get(message.id) ?? [];

      return {
        ...message,
        attachments: await Promise.all(
          attachmentRecords.map(async (record) => {
            if (record.kind === "image") {
              const blob = await downloadAttachmentObject({
                objectPath: record.objectPath,
              });

              return {
                id: record.id,
                kind: record.kind,
                originalName: record.originalName,
                mimeType: record.mimeType,
                sizeBytes: record.sizeBytes,
                imageBase64: Buffer.from(await blob.arrayBuffer()).toString("base64"),
              };
            }

            if (record.extractedText === null) {
              throw new AttachmentError(
                "This attachment is missing extracted text.",
                "attachment_pdf_unreadable",
                422,
              );
            }

            return {
              id: record.id,
              kind: record.kind,
              originalName: record.originalName,
              mimeType: record.mimeType,
              sizeBytes: record.sizeBytes,
              extractedText: record.extractedText,
            };
          }),
        ),
      } satisfies HydratedChatMessage;
    }),
  );
}

export async function getAttachmentByIdForUser(userId: string, attachmentId: string) {
  const attachment = await getAttachmentById(attachmentId);

  if (!attachment || attachment.uploadedByUserId !== userId) {
    throw new AttachmentError(
      "Attachment not found.",
      "attachment_not_found",
      404,
    );
  }

  return attachment;
}
