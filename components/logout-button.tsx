"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VariantProps } from "class-variance-authority";
import { useRouter } from "next/navigation";

import { logout } from "@/lib/api/auth";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import {
  chatThreadQueryKeyPrefix,
  chatThreadsQueryKey,
} from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

export function LogoutButton({
  className,
  variant = "default",
  size = "default",
}: {
  className?: string;
} & VariantProps<typeof buttonVariants>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearPendingUpgrade, refreshSession } = useBrowserAuth();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      clearPendingUpgrade();
      await refreshSession();
      queryClient.removeQueries({ queryKey: chatThreadQueryKeyPrefix });
      queryClient.removeQueries({ queryKey: chatThreadsQueryKey });
      router.push("/");
      router.refresh();
    },
  });

  return (
    <Button
      className={cn(className)}
      variant={variant}
      size={size}
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
