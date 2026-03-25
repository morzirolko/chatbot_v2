import { NextResponse } from "next/server";

import { getBrowserSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const ANONYMOUS_DISABLED_MESSAGE =
  "Guest chat is unavailable because Supabase anonymous sign-ins are disabled. Enable the Anonymous provider in Supabase Auth settings, or sign in with an account.";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously();

  if (error) {
    if (error.code === "anonymous_provider_disabled") {
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

  const session = await getBrowserSession();

  return NextResponse.json(session, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
