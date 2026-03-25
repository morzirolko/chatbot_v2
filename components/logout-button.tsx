"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logout } from "@/lib/api/auth";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import { chatThreadQueryKey } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearPendingUpgrade, refreshSession } = useBrowserAuth();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      clearPendingUpgrade();
      await refreshSession();
      queryClient.removeQueries({ queryKey: chatThreadQueryKey });
      router.push("/");
      router.refresh();
    },
  });

  return (
    <Button
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
