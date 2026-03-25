import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import { NextResponse } from "next/server";

import { AuthSessionError, requireAuthenticatedUser } from "@/lib/auth/session";
import { mapSessionUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;

  const password = body?.password?.trim();

  if (!password) {
    return NextResponse.json(
      { error: "Password is required." },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  let user: Awaited<ReturnType<typeof requireAuthenticatedUser>>;

  try {
    user = await requireAuthenticatedUser({
      allowAnonymous: false,
    });
  } catch (error) {
    if (error instanceof AuthSessionError) {
      return NextResponse.json(
        { error: "You must be signed in to update your password." },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    throw error;
  }

  const supabase = await createClient();
  const {
    data: { user: updatedUser },
    error,
  } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error(
      "[api/auth/update-password] Failed to update password.",
      error,
    );

    return NextResponse.json(
      { error: AUTH_ERROR_MESSAGES.updatePassword },
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
      user: mapSessionUser(updatedUser ?? user),
      message: "Password updated.",
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
