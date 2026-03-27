import { createBrowserClient } from "@supabase/ssr";

import { getAuthSession } from "@/lib/api/auth";

let realtimeAccessTokenPromise: Promise<string | null> | null = null;

async function getRealtimeAccessToken() {
  if (realtimeAccessTokenPromise) {
    return realtimeAccessTokenPromise;
  }

  // Realtime is the only browser-side Supabase usage here, so keep auth in sync
  // with the server-managed app session via the existing API boundary.
  realtimeAccessTokenPromise = getAuthSession()
    .then((session) => session.realtimeAccessToken)
    .finally(() => {
      realtimeAccessTokenPromise = null;
    });

  return realtimeAccessTokenPromise;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: getRealtimeAccessToken,
    },
  );
}
