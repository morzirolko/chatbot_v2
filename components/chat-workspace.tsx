"use client";

import { useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { RealtimeChat } from "@/components/realtime-chat";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useChatThreadsQuery } from "@/hooks/use-chat-threads-query";

export function ChatWorkspace() {
  const { data: threads, isLoading: isThreadsLoading } = useChatThreadsQuery();
  const [activeThreadId, setActiveThreadId] = useState<
    string | null | undefined
  >(undefined);
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
          "--sidebar-width": "20rem",
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
        <div className="flex min-h-screen flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto flex min-h-0 w-full max-w-295 flex-1 flex-col gap-5">
            <div className="flex items-center gap-3 px-1 sm:px-2">
              <SidebarTrigger className="text-white hover:bg-white/10 md:hidden" />
              <h1 className="min-w-0 font-heading text-2xl font-medium text-white sm:text-3xl">
                {selectedThread?.title ?? "New conversation"}
              </h1>
            </div>

            <div className="flex min-h-0 flex-1">
              <RealtimeChat
                activeThreadId={activeThreadId ?? null}
                isArchiveLoading={
                  isThreadsLoading && activeThreadId === undefined
                }
                focusComposerSignal={focusComposerSignal}
                onThreadCreated={setActiveThreadId}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
