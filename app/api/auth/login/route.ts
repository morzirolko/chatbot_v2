import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import { NextResponse } from "next/server";

import {
  attachAppSessionToResponse,
  createManagedAppSession,
} from "@/lib/auth/app-session";
import { mapSessionUser } from "@/lib/auth/user";
import { signInWithPassword } from "@/lib/supabase/auth-gateway";

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

  try {
    const result = await signInWithPassword({
      email,
      password,
    });

    if (!result.session || !result.user) {
      throw new Error("Login did not return a valid session.");
    }

    const managedSession = await createManagedAppSession(result.session);
    const response = NextResponse.json(
      {
        user: mapSessionUser(result.user),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );

    attachAppSessionToResponse(response, managedSession);

    return response;
  } catch (error) {
    console.error("[api/auth/login] Failed to sign in user.", error);

    return NextResponse.json(
      { error: AUTH_ERROR_MESSAGES.login },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
