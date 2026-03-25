import { NextResponse } from "next/server";

import { AuthSessionError, requireAuthenticatedUser } from "@/lib/auth/session";
import { createAnonymousUpgradeToken } from "@/lib/auth/upgrade-token";
import { isAnonymousUser } from "@/lib/auth/user";

export async function POST() {
  try {
    const user = await requireAuthenticatedUser();

    if (!isAnonymousUser(user)) {
      return NextResponse.json(
        { error: "Only anonymous users can prepare an upgrade." },
        {
          status: 403,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        upgradeToken: createAnonymousUpgradeToken(user.id),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthSessionError) {
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

    console.error(
      "[api/auth/prepare-upgrade] Failed to prepare upgrade.",
      error,
    );
    return NextResponse.json(
      { error: "Unable to prepare account upgrade." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
