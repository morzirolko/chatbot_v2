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
}: {
  threadId: string;
  role: ChatRole;
  content: string;
  openaiResponseId?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      role,
      content,
      openai_response_id: openaiResponseId ?? null,
    })
    .select("id, thread_id, role, content, created_at, openai_response_id")
    .single();

  if (error) {
    throw error;
  }

  return mapChatMessage(data as ChatMessageRow);
}
