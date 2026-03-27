"use client";

import { useCallback, useMemo, useState } from "react";

import type { ChatModel } from "@/lib/ai/providers";
import {
  CHAT_ATTACHMENT_ACCEPT,
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  deleteChatAttachment,
  getChatAttachmentErrorMessage,
  getChatAttachmentKind,
  getChatAttachmentSizeError,
  getChatAttachmentTypeError,
  isChatImageAttachment,
  type ChatAttachment,
} from "@/lib/api/chat-attachments";
import { uploadChatAttachment } from "@/lib/api/chat-attachments";

export interface ChatAttachmentQueueItem {
  clientId: string;
  file: File;
  status: "uploading" | "ready" | "error" | "removing";
  attachment?: ChatAttachment;
  error?: string;
}

interface UseChatAttachmentsOptions {
  selectedModel: ChatModel;
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toFileArray(files: FileList | File[]) {
  return Array.isArray(files) ? files : Array.from(files);
}

function supportsImageAttachments(model: ChatModel) {
  switch (model) {
    default:
      return true;
  }
}

export function useChatAttachments({
  selectedModel,
}: UseChatAttachmentsOptions) {
  const [queuedAttachments, setQueuedAttachments] = useState<
    ChatAttachmentQueueItem[]
  >([]);
  const [queueError, setQueueError] = useState<string | null>(null);

  const readyAttachmentIds = useMemo(
    () =>
      queuedAttachments
        .filter(
          (attachment): attachment is ChatAttachmentQueueItem & {
            attachment: ChatAttachment;
          } => attachment.status === "ready" && Boolean(attachment.attachment),
        )
        .map((attachment) => attachment.attachment.id),
    [queuedAttachments],
  );

  const hasErrors = useMemo(
    () =>
      Boolean(queueError) ||
      queuedAttachments.some((attachment) => attachment.status === "error"),
    [queueError, queuedAttachments],
  );

  const isUploading = useMemo(
    () =>
      queuedAttachments.some(
        (attachment) =>
          attachment.status === "uploading" || attachment.status === "removing",
      ),
    [queuedAttachments],
  );

  const hasQueuedImages = queuedAttachments.some((attachment) =>
    isChatImageAttachment(attachment.file),
  );
  const canSendWithAttachments =
    !hasQueuedImages || supportsImageAttachments(selectedModel);
  const modelAttachmentError =
    hasQueuedImages && !canSendWithAttachments
      ? "This model does not support image attachments."
      : null;

  const clearQueueError = useCallback(() => {
    setQueueError(null);
  }, []);

  const addAttachments = useCallback(
    async (files: FileList | File[]) => {
      const nextFiles = toFileArray(files);

      if (nextFiles.length === 0) {
        return;
      }

      clearQueueError();

      const remainingSlots =
        MAX_CHAT_ATTACHMENTS_PER_MESSAGE - queuedAttachments.length;

      if (remainingSlots <= 0) {
        setQueueError(
          `You can attach up to ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} files per message.`,
        );
        return;
      }

      const filesToProcess = nextFiles.slice(0, remainingSlots);
      if (nextFiles.length > remainingSlots) {
        setQueueError(
          `You can attach up to ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} files per message.`,
        );
      }

      for (const file of filesToProcess) {
        const clientId = createClientId();
        const typeError = getChatAttachmentTypeError(file);
        const sizeError = getChatAttachmentSizeError(file);
        const kind = getChatAttachmentKind(file);

        if (typeError || sizeError || !kind) {
          setQueuedAttachments((current) => [
            ...current,
            {
              clientId,
              file,
              status: "error",
              error: typeError ?? sizeError ?? "Unsupported attachment.",
            },
          ]);
          continue;
        }

        setQueuedAttachments((current) => [
          ...current,
          {
            clientId,
            file,
            status: "uploading",
          },
        ]);

        try {
          const attachment = await uploadChatAttachment(file);

          setQueuedAttachments((current) =>
            current.map((item) =>
              item.clientId === clientId
                ? {
                    ...item,
                    status: "ready",
                    attachment,
                    error: undefined,
                  }
                : item,
            ),
          );
        } catch (error) {
          setQueuedAttachments((current) =>
            current.map((item) =>
              item.clientId === clientId
                ? {
                    ...item,
                    status: "error",
                    error: getChatAttachmentErrorMessage(error),
                  }
                : item,
            ),
          );
        }
      }
    },
    [clearQueueError, queuedAttachments.length],
  );

  const removeAttachment = useCallback(async (clientId: string) => {
    const currentItem = queuedAttachments.find(
      (attachment) => attachment.clientId === clientId,
    );

    if (!currentItem || currentItem.status === "uploading") {
      return;
    }

    if (currentItem.status === "ready" && currentItem.attachment) {
      setQueuedAttachments((current) =>
        current.map((attachment) =>
          attachment.clientId === clientId
            ? { ...attachment, status: "removing" }
            : attachment,
        ),
      );

      try {
        await deleteChatAttachment(currentItem.attachment.id);
        setQueuedAttachments((current) =>
          current.filter((attachment) => attachment.clientId !== clientId),
        );
      } catch (error) {
        setQueuedAttachments((current) =>
          current.map((attachment) =>
            attachment.clientId === clientId
              ? {
                  ...attachment,
                  status: "error",
                  error: getChatAttachmentErrorMessage(error),
                }
              : attachment,
          ),
        );
      }

      return;
    }

    setQueuedAttachments((current) =>
      current.filter((attachment) => attachment.clientId !== clientId),
    );
  }, [queuedAttachments]);

  const clearAttachments = useCallback(() => {
    setQueuedAttachments([]);
    clearQueueError();
  }, [clearQueueError]);

  return {
    accept: CHAT_ATTACHMENT_ACCEPT,
    queuedAttachments,
    readyAttachmentIds,
    queueError,
    hasErrors,
    isUploading,
    hasQueuedImages,
    canSendWithAttachments,
    modelAttachmentError,
    addAttachments,
    removeAttachment,
    clearAttachments,
    clearQueueError,
  };
}
