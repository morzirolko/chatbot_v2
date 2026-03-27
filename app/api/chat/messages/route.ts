import {
  AnonymousQuotaExceededError,
  hydrateChatMessagesForModel,
  ChatThreadNotFoundError,
  createUserMessageForUser,
  createAssistantMessageForThread,
} from "@/lib/chat/service";
import { AuthSessionError, requireAuthenticatedUser } from "@/lib/auth/session";
import { AttachmentError } from "@/lib/attachments/service";
import { isAnonymousUser } from "@/lib/auth/user";
import {
  CHAT_MAX_MESSAGE_LENGTH,
  ThreadTooLongError,
  streamAssistantResponse,
} from "@/lib/ai/responses";
import {
  getProviderForChatModel,
  resolveChatModel,
} from "@/lib/ai/providers";
import { CHAT_RESPONSE_ERROR_MESSAGE } from "@/lib/chat/errors";
import type { ChatMessage } from "@/lib/types/chat";
import { encodeServerSentEvent } from "@/lib/utils/sse";

export const maxDuration = 30;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof requireAuthenticatedUser>>;

  try {
    user = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return Response.json(
        { error: "Authentication required." },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    throw error;
  }

  const body = (await request.json().catch(() => null)) as {
    content?: string;
    model?: string;
    provider?: string;
    threadId?: string;
    attachmentIds?: string[];
  } | null;

  const content = body?.content?.trim();
  const model = resolveChatModel({
    model: body?.model,
    provider: body?.provider,
  });
  const provider = getProviderForChatModel(model);
  const requestedThreadId = body?.threadId?.trim() || undefined;
  const attachmentIds =
    body?.attachmentIds?.filter((attachmentId) => UUID_PATTERN.test(attachmentId)) ??
    [];

  if (
    body?.attachmentIds &&
    (!Array.isArray(body.attachmentIds) ||
      body.attachmentIds.length !== attachmentIds.length)
  ) {
    return Response.json(
      { error: "Attachment selection is invalid.", code: "invalid_attachment_selection" },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  if (!content) {
    return Response.json(
      { error: "Message content is required." },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  if (content.length > CHAT_MAX_MESSAGE_LENGTH) {
    return Response.json(
      {
        error: `Message content must be ${CHAT_MAX_MESSAGE_LENGTH} characters or fewer.`,
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  let threadId: string;
  let threadMessages: ChatMessage[];
  let userMessage: ChatMessage;

  try {
    const result = await createUserMessageForUser(user.id, content, {
      enforceAnonymousQuota: isAnonymousUser(user),
      threadId: requestedThreadId,
      attachmentIds,
    });

    threadId = result.thread.id;
    threadMessages = result.messages;
    userMessage = result.message;
  } catch (error) {
    if (error instanceof AnonymousQuotaExceededError) {
      return Response.json(
        {
          error: error.message,
          code: "quota_exceeded",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    if (error instanceof ChatThreadNotFoundError) {
      return Response.json(
        {
          error: error.message,
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    if (error instanceof AttachmentError) {
      return Response.json(
        {
          error: error.message,
          code: error.code,
        },
        {
          status: error.status,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    console.error("[api/chat/messages] Failed to create user message.", error);
    return Response.json(
      {
        error: CHAT_RESPONSE_ERROR_MESSAGE,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(encodeServerSentEvent(event, payload)),
        );
      };

      try {
        sendEvent("ack", {
          type: "ack",
          message: userMessage,
        });

        const assistantResponse = await streamAssistantResponse({
          model,
          provider,
          messages: await hydrateChatMessagesForModel(threadMessages),
          onDelta(delta) {
            sendEvent("delta", {
              type: "delta",
              delta,
            });
          },
        });

        const assistantMessage = await createAssistantMessageForThread(
          threadId,
          assistantResponse.content,
        );

        sendEvent("done", {
          type: "done",
          message: assistantMessage,
        });
      } catch (error) {
        if (error instanceof ThreadTooLongError) {
          sendEvent("error", {
            type: "error",
            code: "thread_too_long",
            error: error.message,
          });
        } else if (
          error instanceof Error &&
          error.message.startsWith("Missing ")
        ) {
          sendEvent("error", {
            type: "error",
            code: "provider_not_configured",
            error: error.message,
          });
        } else {
          console.error(
            "[api/chat/messages] Failed to stream assistant response.",
            error,
          );

          sendEvent("error", {
            type: "error",
            error: CHAT_RESPONSE_ERROR_MESSAGE,
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
