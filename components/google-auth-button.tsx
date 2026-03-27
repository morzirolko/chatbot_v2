"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useBrowserAuth } from "@/hooks/use-browser-auth";

interface GoogleAuthButtonProps {
  label?: string;
  next?: string;
  disabled?: boolean;
  onError?: (message: string | null) => void;
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.8 12.23c0-.72-.06-1.25-.2-1.8H12v3.47h5.64c-.11.86-.68 2.17-1.94 3.05l-.02.12 2.78 2.11.19.02c1.79-1.62 2.82-4 2.82-6.97Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.89 6.77-2.41l-3.23-2.25c-.86.59-2.01 1-3.54 1-2.7 0-4.99-1.75-5.81-4.16l-.12.01-2.89 2.19-.04.11C4.82 19.71 8.13 22 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.19 14.18A5.86 5.86 0 0 1 5.85 12c0-.76.13-1.49.33-2.18l-.01-.15-2.93-2.22-.1.05A9.82 9.82 0 0 0 2 12c0 1.58.39 3.08 1.08 4.5l3.11-2.32Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.66c1.93 0 3.23.82 3.97 1.5l2.9-2.77C17.07 2.75 14.76 2 12 2 8.13 2 4.82 4.29 3.14 7.5l3.04 2.32c.83-2.41 3.12-4.16 5.82-4.16Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  label = "Continue with Google",
  next = "/",
  disabled = false,
  onError,
}: GoogleAuthButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const { prepareAnonymousUpgrade } = useBrowserAuth();

  const handleClick = async () => {
    onError?.(null);
    setIsPending(true);

    try {
      await prepareAnonymousUpgrade();

      const searchParams = new URLSearchParams({
        next,
      });

      window.location.assign(`/api/auth/oauth/google?${searchParams.toString()}`);
    } catch (error) {
      setIsPending(false);
      onError?.(
        error instanceof Error
          ? error.message
          : "Unable to continue with Google right now.",
      );
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled || isPending}
      onClick={handleClick}
    >
      <GoogleMark />
      {isPending ? "Redirecting..." : label}
    </Button>
  );
}
