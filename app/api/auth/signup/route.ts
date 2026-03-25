import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import { NextResponse } from "next/server";

import { mapSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        password?: string;
      }
    | null;

  const email = body?.email?.trim();
  const password = body?.password?.trim();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  const redirectTo = new URL("/auth/confirm?next=/protected", request.url);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo.toString(),
    },
  });

  if (error) {
    console.error("[api/auth/signup] Failed to create account.", error);

    return NextResponse.json(
      { error: AUTH_ERROR_MESSAGES.signup },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      user: data.user ? mapSessionUser(data.user) : null,
      requiresEmailConfirmation: !data.session,
      message: "Check your email to confirm your account.",
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
