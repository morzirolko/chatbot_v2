import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[api/auth/logout] Failed to sign out user.", error);

    return NextResponse.json(
      { error: AUTH_ERROR_MESSAGES.logout },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  return NextResponse.json(
    { user: null },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
