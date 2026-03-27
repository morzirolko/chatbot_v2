"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthBackButton } from "@/components/auth-back-button";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { signup } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { prepareAnonymousUpgrade, refreshSession } = useBrowserAuth();
  const signUpMutation = useMutation({
    mutationFn: signup,
    onSuccess: async (result) => {
      if (result.requiresEmailConfirmation) {
        router.push("/auth/sign-up-success");
        return;
      }

      await refreshSession();
      router.push("/");
      router.refresh();
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "An error occurred.",
      );
    },
  });

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await prepareAnonymousUpgrade();
    } catch (prepareError) {
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : "Unable to preserve your guest chat history.",
      );
      return;
    }

    await signUpMutation
      .mutateAsync({
        email,
        password,
      })
      .catch(() => undefined);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <AuthBackButton />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create an account to keep your chats across sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <GoogleAuthButton
              disabled={signUpMutation.isPending}
              onError={setError}
            />
            <div className="relative text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <div className="absolute inset-x-0 top-1/2 border-t border-border" />
              <span className="relative bg-card px-2">Or create an account</span>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            ) : null}
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    autoComplete="email"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repeat-password">Repeat password</Label>
                  <Input
                    id="repeat-password"
                    name="repeatPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={repeatPassword}
                    onChange={(event) => setRepeatPassword(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signUpMutation.isPending}
                >
                  {signUpMutation.isPending
                    ? "Creating an account..."
                    : "Sign up"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/auth/login" className="underline underline-offset-4">
                  Log in
                </Link>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
