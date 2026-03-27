import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AttachmentRecord } from "@/lib/attachments/types";
import type { ChatAttachmentKind } from "@/lib/types/chat";

const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";

interface AttachmentRow {
  id: string;
  uploaded_by_user_id: string;
  message_id: string | null;
  kind: ChatAttachmentKind;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  object_path: string;
  extracted_text: string | null;
  created_at: string;
}

interface MessageWithAttachmentsResult {
  thread_id: string;
  message_id: string;
}

interface AttachmentAccessRow extends AttachmentRow {
  thread_user_id: string | null;
}

function mapAttachmentRow(row: AttachmentRow): AttachmentRecord {
  return {
    id: row.id,
    uploadedByUserId: row.uploaded_by_user_id,
    messageId: row.message_id,
    kind: row.kind,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    objectPath: row.object_path,
    extractedText: row.extracted_text,
    createdAt: row.created_at,
  };
}

export async function insertAttachmentRecord(input: {
  id: string;
  uploadedByUserId: string;
  kind: ChatAttachmentKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  objectPath: string;
  extractedText: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_attachments")
    .insert({
      id: input.id,
      uploaded_by_user_id: input.uploadedByUserId,
      kind: input.kind,
      original_name: input.originalName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      object_path: input.objectPath,
      extracted_text: input.extractedText,
    })
    .select("*")
    .single<AttachmentRow>();

  if (error) {
    throw error;
  }

  return mapAttachmentRow(data);
}

export async function getAttachmentById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_attachments")
    .select("*")
    .eq("id", id)
    .maybeSingle<AttachmentRow>();

  if (error) {
    throw error;
  }

  return data ? mapAttachmentRow(data) : null;
}

export async function getAttachmentAccessById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_attachments")
    .select(
      `
        *,
        chat_messages (
          chat_threads (
            user_id
          )
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as AttachmentAccessRow & {
    chat_messages?: { chat_threads?: { user_id?: string | null } | null } | null;
  };

  return {
    attachment: mapAttachmentRow(row),
    threadUserId: row.chat_messages?.chat_threads?.user_id ?? null,
  };
}

export async function listAttachmentsForMessageIds(messageIds: string[]) {
  if (messageIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_attachments")
    .select("*")
    .in("message_id", messageIds)
    .order("created_at", { ascending: true })
    .returns<AttachmentRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAttachmentRow);
}

export async function uploadAttachmentObject(input: {
  objectPath: string;
  data: Uint8Array;
  contentType: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(input.objectPath, input.data, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }
}

export async function deleteAttachmentObject(objectPath: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .remove([objectPath]);

  if (error) {
    throw error;
  }
}

export async function deleteAttachmentRecord(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("chat_attachments").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function downloadAttachmentObject(input: {
  objectPath: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .download(input.objectPath);

  if (error) {
    throw error;
  }

  return data;
}

export async function createUserMessageWithAttachments(input: {
  userId: string;
  threadId: string;
  content: string;
  attachmentIds: string[];
  createdAt?: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "create_user_message_with_attachments",
    {
      target_user_id: input.userId,
      target_thread_id: input.threadId,
      target_content: input.content,
      target_attachment_ids: input.attachmentIds,
      target_created_at: input.createdAt,
    },
  );

  if (error) {
    throw error;
  }

  const [result] = (data ?? []) as MessageWithAttachmentsResult[];

  return {
    threadId: result?.thread_id ?? input.threadId,
    messageId: result?.message_id ?? "",
  };
}
