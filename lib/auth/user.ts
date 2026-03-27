import type { User } from "@supabase/supabase-js";

import type { BrowserSessionUser, SessionUser } from "@/lib/types/auth";

export function getUserDisplayName(
  user: Pick<User, "email" | "user_metadata">,
) {
  const username = user.user_metadata?.username;
  const userName = user.user_metadata?.user_name;

  return username ?? userName ?? user.email?.split("@")[0] ?? "Anonymous";
}

export function isAnonymousUser(
  user:
    | Pick<User, "is_anonymous">
    | {
        isAnonymous?: boolean | null;
      }
    | null
    | undefined,
) {
  const anonymousFromSupabase =
    typeof user === "object" &&
    user !== null &&
    "is_anonymous" in user &&
    user.is_anonymous === true;
  const anonymousFromAppSession =
    typeof user === "object" &&
    user !== null &&
    "isAnonymous" in user &&
    user.isAnonymous === true;

  return anonymousFromSupabase || anonymousFromAppSession;
}

export function mapSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: getUserDisplayName(user),
  };
}

export function mapBrowserSessionUser(user: User): BrowserSessionUser {
  return {
    ...mapSessionUser(user),
    isAnonymous: isAnonymousUser(user),
  };
}
