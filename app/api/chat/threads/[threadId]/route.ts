import { NextResponse } from "next/server";

import { AuthSessionError, requireAuthenticatedUser } from "@/lib/auth/session";
import {
  ChatThreadNotFoundError,
  getChatThreadForUser,
} from "@/lib/chat/service";

function isPrerenderInterruption(error: unknown) {
  return (
    error instanceof Error &&
    "digest" in error &&
    (error.digest === "NEXT_PRERENDER_INTERRUPTED" ||
      error.digest === "HANGING_PROMISE_REJECTION")
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { threadId } = await context.params;
    const thread = await getChatThreadForUser(user.id, threadId);

    return NextResponse.json(thread, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json(
        { error: "Authentication required." },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    if (error instanceof ChatThreadNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 404,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    if (isPrerenderInterruption(error)) {
      throw error;
    }

    console.error("[api/chat/threads/[threadId]] Failed to load thread.", error);
    return NextResponse.json(
      { error: "Unable to load chat thread." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}

