import { NextResponse } from "next/server";

import {
  buildBrowserSessionResponse,
  clearAppSessionCookie,
  getCurrentAppSessionState,
} from "@/lib/auth/app-session";

export async function GET() {
  const sessionState = await getCurrentAppSessionState();
  const response = NextResponse.json(buildBrowserSessionResponse(sessionState.record), {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });

  if (sessionState.shouldClearCookie) {
    clearAppSessionCookie(response);
  }

  return response;
}
