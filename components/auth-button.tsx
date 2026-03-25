"use client";

import Link from "next/link";

import { useSessionQuery } from "@/hooks/use-session-query";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";

export function AuthButton() {
  const { data, isLoading } = useSessionQuery();
  const user = data?.user;

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return user ? (
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
