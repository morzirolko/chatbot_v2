"use client";

import Link from "next/link";

import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";

export function AuthButton() {
  const { user, isAnonymous, isLoading } = useBrowserAuth();

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return user && !isAnonymous ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
