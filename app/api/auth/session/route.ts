import { NextResponse } from "next/server";

import { getBrowserSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getBrowserSession();

  return NextResponse.json(session, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
