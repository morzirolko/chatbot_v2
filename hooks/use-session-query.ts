"use client";

import { useQuery } from "@tanstack/react-query";

import { getSession } from "@/lib/api/auth";
import { sessionQueryKey } from "@/lib/query-keys";

export function useSessionQuery() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });
}
