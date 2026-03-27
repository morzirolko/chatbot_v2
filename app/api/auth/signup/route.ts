import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import { NextResponse } from "next/server";

import {
  attachAppSessionToResponse,
  createManagedAppSession,
} from "@/lib/auth/app-session";
import { mapSessionUser } from "@/lib/auth/user";
import { signUpWithPassword } from "@/lib/supabase/auth-gateway";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

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

  const redirectTo = new URL("/auth/confirm?next=/", request.url);
  try {
    const result = await signUpWithPassword({
      email,
      password,
      emailRedirectTo: redirectTo.toString(),
    });

    const response = NextResponse.json(
      {
        user: result.user ? mapSessionUser(result.user) : null,
        requiresEmailConfirmation: !result.session,
        message: "Check your email to confirm your account.",
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );

    if (result.session) {
      const managedSession = await createManagedAppSession(result.session);
      attachAppSessionToResponse(response, managedSession);
    }

    return response;
  } catch (error) {
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
}
