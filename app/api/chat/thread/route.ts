import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/session";
import { getChatThreadForUser } from "@/lib/chat/service";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  const thread = await getChatThreadForUser(user.id);

  return NextResponse.json(thread, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
