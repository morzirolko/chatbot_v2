import { NextResponse } from "next/server";

import {
  attachAppSessionToResponse,
  buildBrowserSessionResponse,
  createManagedAppSession,
} from "@/lib/auth/app-session";
import { signInAnonymously } from "@/lib/supabase/auth-gateway";

const ANONYMOUS_DISABLED_MESSAGE =
  "Guest chat is unavailable because Supabase anonymous sign-ins are disabled. Enable the Anonymous provider in Supabase Auth settings, or sign in with an account.";

export async function POST() {
  try {
    const session = await signInAnonymously();
    const managedSession = await createManagedAppSession(session);
    const response = NextResponse.json(
      buildBrowserSessionResponse(managedSession.record),
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );

    attachAppSessionToResponse(response, managedSession);

    return response;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "anonymous_provider_disabled"
    ) {
      return NextResponse.json(
        { error: ANONYMOUS_DISABLED_MESSAGE },
        {
          status: 503,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    console.error(
      "[api/auth/anonymous-session] Failed to start guest session.",
      error,
    );
    return NextResponse.json(
      { error: "Unable to start a guest session." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
