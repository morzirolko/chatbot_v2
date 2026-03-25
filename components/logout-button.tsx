"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logout } from "@/lib/api/auth";
import { chatThreadQueryKey, sessionQueryKey } from "@/lib/query-keys";
import type { SessionResponse } from "@/lib/types/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData<SessionResponse>(sessionQueryKey, {
        user: null,
      });
      queryClient.removeQueries({ queryKey: chatThreadQueryKey });
      router.push("/auth/login");
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
