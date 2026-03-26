"use client";

import Link from "next/link";

import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { LogoutButton } from "./logout-button";
import { Button } from "./ui/button";

export function AuthButton() {
  const { user, isAnonymous, isLoading } = useBrowserAuth();

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Loading...
      </Button>
    );
  }

  return user && !isAnonymous ? (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-56 truncate text-sm text-muted-foreground sm:inline">
        {user.displayName ?? user.email}
      </span>
      <LogoutButton variant="outline" size="sm" />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
