import { NextResponse } from "next/server";

import {
  clearAppSessionCookie,
  destroyCurrentAppSession,
  getCurrentAppSessionState,
} from "@/lib/auth/app-session";
import { signOutGatewaySession } from "@/lib/supabase/auth-gateway";

export async function POST() {
  const sessionState = await getCurrentAppSessionState();

  if (sessionState.record) {
    try {
      await signOutGatewaySession({
        accessToken: sessionState.record.getSupabaseAccessToken(),
        refreshToken: sessionState.record.getSupabaseRefreshToken(),
      });
    } catch (error) {
      console.error("[api/auth/logout] Failed to sign out upstream session.", error);
    }
  }

  await destroyCurrentAppSession();

  const response = NextResponse.json(
    { user: null },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );

  clearAppSessionCookie(response);

  return response;
}
