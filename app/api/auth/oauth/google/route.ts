import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_ERROR_PAGE_CODES } from "@/lib/auth/errors";
import { createRouteHandlerAuthClient } from "@/lib/supabase/server-auth-client";

function getSafeNextTarget(request: NextRequest, candidate: string | null) {
  if (!candidate || !candidate.startsWith("/")) {
    return "/";
  }

  const safeUrl = new URL(candidate, request.url);
  return `${safeUrl.pathname}${safeUrl.search}`;
}

function buildAuthErrorUrl(request: NextRequest) {
  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/auth/error";
  errorUrl.search = "";
  errorUrl.searchParams.set("code", AUTH_ERROR_PAGE_CODES.authError);
  return errorUrl;
}

export async function GET(request: NextRequest) {
  const next = getSafeNextTarget(request, request.nextUrl.searchParams.get("next"));
  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("next", next);

  try {
    const { supabase, applyCookies } = await createRouteHandlerAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: "email profile",
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      throw error ?? new Error("Google OAuth did not return a redirect URL.");
    }

    return applyCookies(NextResponse.redirect(data.url));
  } catch (error) {
    console.error("[api/auth/oauth/google] Failed to start Google OAuth.", error);
    return NextResponse.redirect(buildAuthErrorUrl(request));
  }
}
