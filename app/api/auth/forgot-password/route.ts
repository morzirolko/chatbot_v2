import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import { NextResponse } from "next/server";

import { resetPasswordForEmail } from "@/lib/supabase/auth-gateway";

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
  try {
    await resetPasswordForEmail({
      email,
      redirectTo: redirectTo.toString(),
    });
  } catch (error) {
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
