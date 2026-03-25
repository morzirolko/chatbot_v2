import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/types/auth";

export function getUserDisplayName(
  user: Pick<User, "email" | "user_metadata">,
) {
  const username = user.user_metadata?.username;
  const userName = user.user_metadata?.user_name;

  return username ?? userName ?? user.email?.split("@")[0] ?? "Anonymous";
}

export function mapSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: getUserDisplayName(user),
  };
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function getSessionUser() {
  const user = await getAuthenticatedUser();

  return user ? mapSessionUser(user) : null;
}
