import "server-only";

import { getChatRealtimeChannelName } from "@/lib/chat/realtime";
import type { ChatMessage, ChatRole, ChatThread } from "@/lib/types/chat";
import { createAdminClient } from "@/lib/supabase/admin";

interface ChatThreadRow {
  id: string;
}

interface ChatMessageRow {
  id: string;
  thread_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
  openai_response_id: string | null;
}

interface UsageCountRow {
  question_count: number;
}

function mapChatThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    realtimeChannelName: getChatRealtimeChannelName(row.id),
  };
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    openaiResponseId: row.openai_response_id,
  };
}

async function fetchThreadByUserId(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapChatThread(data as ChatThreadRow) : null;
}

export async function getThreadByUserId(userId: string) {
  return fetchThreadByUserId(userId);
}

export async function getOrCreateThreadByUserId(userId: string) {
  const existingThread = await fetchThreadByUserId(userId);
  if (existingThread) {
    return existingThread;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      user_id: userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const thread = await fetchThreadByUserId(userId);
      if (thread) {
        return thread;
      }
    }

    throw error;
  }

  return mapChatThread(data as ChatThreadRow);
}

export async function listMessagesForThread(threadId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, thread_id, role, content, created_at, openai_response_id")
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
  openaiResponseId,
  createdAt,
}: {
  threadId: string;
  role: ChatRole;
  content: string;
  openaiResponseId?: string | null;
  createdAt?: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      role,
      content,
      openai_response_id: openaiResponseId ?? null,
      created_at: createdAt,
    })
    .select("id, thread_id, role, content, created_at, openai_response_id")
    .single();

  if (error) {
    throw error;
  }

  return mapChatMessage(data as ChatMessageRow);
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
