import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  attachAppSessionToResponse,
  createManagedAppSession,
} from "@/lib/auth/app-session";
import { AUTH_ERROR_PAGE_CODES } from "@/lib/auth/errors";
import {
  createRouteHandlerAuthClient,
  SUPABASE_OAUTH_STORAGE_KEY,
} from "@/lib/supabase/server-auth-client";

function getSafeRedirectUrl(request: NextRequest, candidate: string | null) {
  if (!candidate || !candidate.startsWith("/")) {
    return new URL("/", request.url);
  }

  return new URL(candidate, request.url);
}

function buildAuthErrorUrl(request: NextRequest) {
  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/auth/error";
  errorUrl.search = "";
  errorUrl.searchParams.set("code", AUTH_ERROR_PAGE_CODES.authError);
  return errorUrl;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const providerError =
    request.nextUrl.searchParams.get("error") ??
    request.nextUrl.searchParams.get("error_code");
  const redirectUrl = getSafeRedirectUrl(
    request,
    request.nextUrl.searchParams.get("next"),
  );
  const { supabase, applyCookies, clearCookiesByPrefix } =
    await createRouteHandlerAuthClient();

  if (providerError || !code) {
    return applyCookies(NextResponse.redirect(buildAuthErrorUrl(request)));
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    const session = data.session;

    if (
      !session?.access_token ||
      !session.refresh_token ||
      !session.expires_at ||
      !session.user
    ) {
      throw new Error("OAuth callback did not return a valid session.");
    }

    const managedSession = await createManagedAppSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: session.user,
    });
    const response = NextResponse.redirect(redirectUrl);

    attachAppSessionToResponse(response, managedSession);

    applyCookies(response);
    clearCookiesByPrefix(response, SUPABASE_OAUTH_STORAGE_KEY);

    return response;
  } catch (error) {
    console.error("[auth/callback] Failed to complete Google OAuth.", error);
    const response = NextResponse.redirect(buildAuthErrorUrl(request));

    applyCookies(response);
    clearCookiesByPrefix(response, SUPABASE_OAUTH_STORAGE_KEY);

    return response;
  }
}
