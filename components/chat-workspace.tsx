"use client";

import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { RealtimeChat } from "@/components/realtime-chat";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
      className="h-svh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,145,59,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,rgba(9,9,11,1),rgba(15,15,18,1))]"
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
      <SidebarInset className="min-h-0 overflow-hidden bg-transparent text-white">
        <div className="flex min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
          <div className="flex min-h-0 w-full flex-1">
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
