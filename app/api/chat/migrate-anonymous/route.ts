import { NextResponse } from "next/server";

import { AuthSessionError, requireAuthenticatedUser } from "@/lib/auth/session";
import {
  InvalidUpgradeTokenError,
  verifyAnonymousUpgradeToken,
} from "@/lib/auth/upgrade-token";
import { isAnonymousUser } from "@/lib/auth/user";
import { migrateAnonymousChatHistory } from "@/lib/chat/service";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser({
      allowAnonymous: false,
    });

    if (isAnonymousUser(user)) {
      return NextResponse.json(
        { error: "Anonymous users cannot receive migrated history." },
        {
          status: 403,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      upgradeToken?: string;
    } | null;
    const upgradeToken = body?.upgradeToken?.trim();

    if (!upgradeToken) {
      return NextResponse.json(
        { error: "Upgrade token is required." },
        {
          status: 400,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    const payload = verifyAnonymousUpgradeToken(upgradeToken);
    const result = await migrateAnonymousChatHistory(
      payload.sourceUserId,
      user.id,
    );

    return NextResponse.json(
      {
        migrated: result.migrated,
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

    if (error instanceof InvalidUpgradeTokenError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 400,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    console.error(
      "[api/chat/migrate-anonymous] Failed to migrate history.",
      error,
    );
    return NextResponse.json(
      { error: "Unable to migrate anonymous chat history." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
