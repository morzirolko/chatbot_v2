import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SUPABASE_OAUTH_STORAGE_KEY = "sb-google-oauth";

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function createRouteHandlerAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase publishable auth environment variables.");
  }

  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookieOptions: {
      name: SUPABASE_OAUTH_STORAGE_KEY,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          pendingCookies.push({
            name: cookie.name,
            value: cookie.value,
            options: cookie.options,
          });

          try {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          } catch {
            // Route handlers can still attach the cookies on the outgoing response.
          }
        }
      },
    },
  });

  return {
    supabase,
    applyCookies(response: NextResponse) {
      for (const cookie of pendingCookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }

      return response;
    },
    clearCookiesByPrefix(response: NextResponse, prefix: string) {
      const cookieNames = new Set(
        [
          ...cookieStore.getAll().map((cookie) => cookie.name),
          ...pendingCookies.map((cookie) => cookie.name),
        ].filter(
          (cookieName) =>
            cookieName === prefix ||
            cookieName.startsWith(`${prefix}.`) ||
            cookieName.startsWith(`${prefix}-`),
        ),
      );

      for (const cookieName of cookieNames) {
        response.cookies.set(cookieName, "", {
          maxAge: 0,
          path: "/",
        });
      }

      return response;
    },
  };
}
