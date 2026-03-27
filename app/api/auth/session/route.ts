import { NextResponse } from "next/server";

import {
  buildBrowserSessionResponse,
  clearAppSessionCookie,
  getCurrentAppSessionState,
} from "@/lib/auth/app-session";

export async function GET() {
  const sessionState = await getCurrentAppSessionState();
  const session = await buildBrowserSessionResponse(sessionState.record);
  const response = NextResponse.json(session, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });

  if (sessionState.shouldClearCookie) {
    clearAppSessionCookie(response);
  }

  return response;
}
