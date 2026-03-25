"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  ensureAnonymousSession as createAnonymousSession,
  getAuthSession,
} from "@/lib/api/auth";
import {
  clearPendingAnonymousUpgradeToken,
  readPendingAnonymousUpgradeToken,
  writePendingAnonymousUpgradeToken,
} from "@/lib/auth/upgrade-storage";
import { chatThreadQueryKey } from "@/lib/query-keys";
import type { BrowserSessionResponse, BrowserSessionUser } from "@/lib/types/auth";

interface AuthContextValue {
  user: BrowserSessionUser | null;
  isAnonymous: boolean;
  isLoading: boolean;
  realtimeAccessToken: string | null;
  ensureAnonymousSession: () => Promise<BrowserSessionResponse>;
  prepareAnonymousUpgrade: () => Promise<string | null>;
  clearPendingUpgrade: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readJsonResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }

  return payload as T;
}

function emptyAuthState() {
  return {
    user: null,
    isAnonymous: false,
    realtimeAccessToken: null,
  } satisfies Pick<
    AuthContextValue,
    "user" | "isAnonymous" | "realtimeAccessToken"
  >;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] =
    useState<Pick<
      AuthContextValue,
      "user" | "isAnonymous" | "realtimeAccessToken"
    >>(emptyAuthState);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const ensureSessionRef = useRef<Promise<BrowserSessionResponse> | null>(null);
  const migrationRef = useRef<Promise<void> | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  const applySession = useCallback((session: BrowserSessionResponse) => {
    setAuthState({
      user: session.user,
      isAnonymous: session.isAnonymous,
      realtimeAccessToken: session.realtimeAccessToken,
    });
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await getAuthSession();
    applySession(session);
  }, [applySession]);

  useEffect(() => {
    let isMounted = true;

    void refreshSession()
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        console.error("[auth] Failed to load session state.", error);
        setAuthState(emptyAuthState());
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshSession]);

  const ensureAnonymousSession = useCallback(async () => {
    if (authState.user) {
      return {
        user: authState.user,
        isAnonymous: authState.isAnonymous,
        realtimeAccessToken: authState.realtimeAccessToken,
      } satisfies BrowserSessionResponse;
    }

    if (ensureSessionRef.current) {
      return ensureSessionRef.current;
    }

    ensureSessionRef.current = getAuthSession()
      .then(async (session) => {
        if (session.user) {
          applySession(session);
          return session;
        }

        const anonymousSession = await createAnonymousSession();
        applySession(anonymousSession);
        return anonymousSession;
      })
      .finally(() => {
        ensureSessionRef.current = null;
      });

    return ensureSessionRef.current;
  }, [
    applySession,
    authState.isAnonymous,
    authState.realtimeAccessToken,
    authState.user,
  ]);

  const prepareAnonymousUpgrade = useCallback(async () => {
    let session = {
      user: authState.user,
      isAnonymous: authState.isAnonymous,
      realtimeAccessToken: authState.realtimeAccessToken,
    } satisfies BrowserSessionResponse;

    if (!session.user) {
      session = await getAuthSession();
      applySession(session);
    }

    if (!session.isAnonymous) {
      return null;
    }

    const response = await fetch("/api/auth/prepare-upgrade", {
      method: "POST",
    });

    const payload = await readJsonResponse<{ upgradeToken: string }>(response);
    writePendingAnonymousUpgradeToken(payload.upgradeToken);
    return payload.upgradeToken;
  }, [
    applySession,
    authState.isAnonymous,
    authState.realtimeAccessToken,
    authState.user,
  ]);

  const clearPendingUpgrade = useCallback(() => {
    clearPendingAnonymousUpgradeToken();
  }, []);

  useEffect(() => {
    if (!authState.user || authState.isAnonymous) {
      return;
    }

    const pendingUpgradeToken = readPendingAnonymousUpgradeToken();
    if (!pendingUpgradeToken || migrationRef.current) {
      return;
    }

    migrationRef.current = (async () => {
      const response = await fetch("/api/chat/migrate-anonymous", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upgradeToken: pendingUpgradeToken,
        }),
      });

      await readJsonResponse<{ migrated: boolean }>(response);
      clearPendingAnonymousUpgradeToken();
      await queryClient.invalidateQueries({
        queryKey: chatThreadQueryKey,
      });
    })()
      .catch((error) => {
        console.error(
          "[auth] Failed to migrate anonymous chat history after sign-in.",
          error,
        );
      })
      .finally(() => {
        migrationRef.current = null;
      });
  }, [authState.isAnonymous, authState.user, queryClient]);

  useEffect(() => {
    const nextUserId = authState.user?.id ?? null;

    if (previousUserIdRef.current !== nextUserId) {
      void queryClient.removeQueries({
        queryKey: chatThreadQueryKey,
      });
      previousUserIdRef.current = nextUserId;
    }
  }, [authState.user, queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user: authState.user,
      isAnonymous: authState.isAnonymous,
      isLoading,
      realtimeAccessToken: authState.realtimeAccessToken,
      ensureAnonymousSession,
      prepareAnonymousUpgrade,
      clearPendingUpgrade,
      refreshSession,
    };
  }, [
    authState,
    clearPendingUpgrade,
    ensureAnonymousSession,
    isLoading,
    prepareAnonymousUpgrade,
    refreshSession,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useBrowserAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useBrowserAuth must be used within an AuthProvider.");
  }

  return value;
}
