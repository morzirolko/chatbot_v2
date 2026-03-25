import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
  } | null;

  const email = body?.email?.trim();

  if (!email) {
    return NextResponse.json(
      { error: "Email is required." },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  const redirectTo = new URL(
    "/auth/confirm?next=/auth/update-password",
    request.url,
  );
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo.toString(),
  });

  if (error) {
    console.error(
      "[api/auth/forgot-password] Failed to start password reset flow.",
      error,
    );
  }

  return NextResponse.json(
    {
      user: null,
      message: AUTH_ERROR_MESSAGES.forgotPassword,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
