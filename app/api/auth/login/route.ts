import { AUTH_ERROR_MESSAGES } from "@/lib/auth/errors";
import { NextResponse } from "next/server";

import { mapSessionUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json(
    {
      user: user ? mapSessionUser(user) : null,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
