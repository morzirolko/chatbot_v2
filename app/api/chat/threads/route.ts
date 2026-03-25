import { NextResponse } from "next/server";

import { AuthSessionError, requireAuthenticatedUser } from "@/lib/auth/session";
import { listChatThreadsForUser } from "@/lib/chat/service";

function isPrerenderInterruption(error: unknown) {
  return (
    error instanceof Error &&
    "digest" in error &&
    (error.digest === "NEXT_PRERENDER_INTERRUPTED" ||
      error.digest === "HANGING_PROMISE_REJECTION")
  );
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const threads = await listChatThreadsForUser(user.id);

    return NextResponse.json(threads, {
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

    if (isPrerenderInterruption(error)) {
      throw error;
    }

    console.error("[api/chat/threads] Failed to load threads.", error);
    return NextResponse.json(
      { error: "Unable to load chat threads." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}

