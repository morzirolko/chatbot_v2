import { createBrowserClient } from "@supabase/ssr";

type RealtimeAccessTokenResolver = () => Promise<string | null> | string | null;

export function createRealtimeClient(
  getRealtimeAccessToken: RealtimeAccessTokenResolver,
) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => await getRealtimeAccessToken(),
    },
  );
}
