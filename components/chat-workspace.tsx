"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareText } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { RealtimeChat } from "@/components/realtime-chat";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useChatThreadsQuery } from "@/hooks/use-chat-threads-query";

export function ChatWorkspace() {
  const {
    data: threads,
    isLoading: isThreadsLoading,
  } = useChatThreadsQuery();
  const [activeThreadId, setActiveThreadId] = useState<string | null | undefined>(
    undefined,
  );
  const [focusComposerSignal, setFocusComposerSignal] = useState(0);

  useEffect(() => {
    if (activeThreadId === undefined && !isThreadsLoading) {
      setActiveThreadId(threads?.[0]?.id ?? null);
      return;
    }

    if (
      activeThreadId &&
      threads &&
      !threads.some((thread) => thread.id === activeThreadId)
    ) {
      setActiveThreadId(threads[0]?.id ?? null);
    }
  }, [activeThreadId, isThreadsLoading, threads]);

  const selectedThread = useMemo(
    () => threads?.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  );

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "22rem",
          "--sidebar": "oklch(0.21 0.02 35)",
          "--sidebar-foreground": "oklch(0.96 0.01 80)",
          "--sidebar-accent": "oklch(0.26 0.02 35)",
          "--sidebar-accent-foreground": "oklch(0.98 0.01 80)",
          "--sidebar-border": "oklch(1 0 0 / 0.08)",
          "--sidebar-ring": "oklch(0.75 0.16 55)",
        } as React.CSSProperties
      }
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,145,59,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,rgba(9,9,11,1),rgba(15,15,18,1))]"
    >
      <AppSidebar
        threads={threads ?? []}
        isLoading={isThreadsLoading}
        activeThreadId={activeThreadId ?? null}
        onNewChat={() => {
          setActiveThreadId(null);
          setFocusComposerSignal((currentValue) => currentValue + 1);
        }}
        onSelectThread={setActiveThreadId}
      />
      <SidebarInset className="min-h-screen bg-transparent text-white">
        <div className="flex min-h-screen flex-col px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-white hover:bg-white/10 md:hidden" />
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.28em] text-white/50">
                <MessageSquareText className="size-3.5" />
                Dialog Archive
              </div>
            </div>
            <ThemeSwitcher />
          </div>

          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col pt-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Private assistant
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <h1 className="font-heading text-3xl font-medium text-white sm:text-4xl">
                    {selectedThread?.title ?? "Start a new conversation"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-white/60">
                    Pick an archived chat from the sidebar or start clean with a
                    fresh draft. The first message creates a persistent thread.
                  </p>
                </div>
              </div>
            </div>

            <RealtimeChat
              activeThreadId={activeThreadId ?? null}
              isArchiveLoading={isThreadsLoading && activeThreadId === undefined}
              focusComposerSignal={focusComposerSignal}
              onThreadCreated={setActiveThreadId}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

