import { AUTH_ERROR_PAGE_CODES } from "@/lib/auth/errors";
import {
  attachAppSessionToResponse,
  createManagedAppSession,
} from "@/lib/auth/app-session";
import { verifyOtp } from "@/lib/supabase/auth-gateway";
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = next.startsWith("/") ? next : "/";
  redirectUrl.search = "";

  if (token_hash && type) {
    try {
      const result = await verifyOtp({
        type,
        tokenHash: token_hash,
      });
      const response = NextResponse.redirect(redirectUrl);

      if (result.session) {
        const managedSession = await createManagedAppSession(result.session);
        attachAppSessionToResponse(response, managedSession);
      }

      return response;
    } catch (error) {
      console.error("[auth/confirm] Failed to verify auth code.", error);

      const errorUrl = request.nextUrl.clone();
      errorUrl.pathname = "/auth/error";
      errorUrl.search = "";
      errorUrl.searchParams.set(
        "code",
        AUTH_ERROR_PAGE_CODES.invalidOrExpiredLink,
      );
      return NextResponse.redirect(errorUrl);
    }
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/auth/error";
  errorUrl.search = "";
  errorUrl.searchParams.set("code", AUTH_ERROR_PAGE_CODES.missingOrInvalidLink);
  return NextResponse.redirect(errorUrl);
}
