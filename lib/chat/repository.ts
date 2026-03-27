import "server-only";

import { buildThreadPreview } from "@/lib/chat/thread";
import type {
  ChatMessage,
  ChatRole,
  ChatThread,
  ChatThreadSummary,
} from "@/lib/types/chat";
import { createAdminClient } from "@/lib/supabase/admin";

interface ChatThreadRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatMessageRow {
  id: string;
  thread_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

interface UsageCountRow {
  question_count: number;
}

interface ChatThreadSummaryRow {
  id: string;
  title: string | null;
  latest_message_content: string | null;
  created_at: string;
  updated_at: string;
}

function mapChatThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function fetchThreadByIdForUser(userId: string, threadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapChatThread(data as ChatThreadRow) : null;
}

export async function getThreadByIdForUser(userId: string, threadId: string) {
  return fetchThreadByIdForUser(userId, threadId);
}

export async function listThreadsForUser(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("list_chat_thread_summaries", {
    target_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ChatThreadSummaryRow[]).map(
    (thread): ChatThreadSummary => ({
      id: thread.id,
      title: thread.title,
      preview: buildThreadPreview(thread.latest_message_content ?? ""),
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
    }),
  );
}

export async function createThreadForUser({
  userId,
  title,
}: {
  userId: string;
  title: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      user_id: userId,
      title,
    })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapChatThread(data as ChatThreadRow);
}

export async function listMessagesForThread(threadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, thread_id, role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .returns<ChatMessageRow[]>();

  if (error) {
    throw error;
  }

  return ((data ?? []) as ChatMessageRow[]).map(mapChatMessage);
}

export async function createChatMessage({
  threadId,
  role,
  content,
  createdAt,
}: {
  threadId: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      role,
      content,
      created_at: createdAt,
    })
    .select("id, thread_id, role, content, created_at")
    .single();

  if (error) {
    throw error;
  }

  return mapChatMessage(data as ChatMessageRow);
}

export async function listMessagesForThreadOwnedByUser(
  userId: string,
  threadId: string,
) {
  const thread = await fetchThreadByIdForUser(userId, threadId);
  if (!thread) {
    return null;
  }

  const messages = await listMessagesForThread(threadId);

  return {
    thread,
    messages,
  };
}

export async function getQuestionCountForUser(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_usage")
    .select("question_count")
    .eq("user_id", userId)
    .maybeSingle<UsageCountRow>();

  if (error) {
    throw error;
  }

  return data?.question_count ?? 0;
}

export async function incrementQuestionCountForUser(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("increment_user_question_count", {
    target_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

export async function migrateAnonymousData(
  sourceUserId: string,
  destinationUserId: string,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("migrate_anonymous_chat_data", {
    source_user_id: sourceUserId,
    destination_user_id: destinationUserId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}
