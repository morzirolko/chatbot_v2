"use client";

import { PenSquare } from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useBrowserAuth } from "@/hooks/use-browser-auth";
import type { ChatThreadSummary } from "@/lib/types/chat";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  threads: ChatThreadSummary[];
  isLoading: boolean;
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
}

function getInitial(value: string | undefined) {
  return value?.trim().charAt(0).toUpperCase() || "G";
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function AppSidebar({
  threads,
  isLoading,
  activeThreadId,
  onNewChat,
  onSelectThread,
}: AppSidebarProps) {
  const { user, isAnonymous, isLoading: isAuthLoading } = useBrowserAuth();
  const showGuestActions = !isAuthLoading && (isAnonymous || !user);
  const showLogoutAction = !isAuthLoading && user && !isAnonymous;
  const sessionTitle = isAnonymous || !user ? "Guest session" : user.displayName;
  const sessionDescription =
    isAnonymous || !user
      ? "Sign in to keep your chats and continue later"
      : "Authenticated and persistent";

  return (
    <Sidebar
      variant="floating"
      collapsible="offcanvas"
      className="border-r-0 p-3 md:p-5"
    >
      <div className="flex h-full flex-col rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(55,34,21,0.9),rgba(18,18,18,0.98))] shadow-[0_22px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
        <SidebarHeader className="gap-4 px-4 pt-4 pb-2">
          <div className="text-[0.7rem] uppercase tracking-[0.32em] text-white/35">
            Dialog Archive
          </div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-medium text-white">
              Chats
            </h2>
            <Button
              size="sm"
              onClick={onNewChat}
              className="bg-[#ff7a1a] px-4 text-[0.8rem] font-medium text-black hover:bg-[#ff8b36]"
            >
              <PenSquare className="size-3.5" />
              New
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 pb-2">
          {isLoading ? (
            <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/45">
              Loading archived conversations...
            </div>
          ) : null}

          {!isLoading && threads.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm leading-7 text-white/45">
              No conversations yet. Start one to see synced history and attached
              references here.
            </div>
          ) : null}

          {!isLoading && threads.length > 0 ? (
            <SidebarMenu className="gap-2">
              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <SidebarMenuButton
                    type="button"
                    isActive={thread.id === activeThreadId}
                    onClick={() => onSelectThread(thread.id)}
                    className={cn(
                      "h-auto min-h-16 items-start rounded-[1.5rem] border border-transparent bg-white/[0.03] px-4 py-3 text-white/85 hover:bg-white/[0.06] data-[active=true]:border-white/12 data-[active=true]:bg-white/[0.08] data-[active=true]:text-white",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="truncate text-sm font-medium">
                          {thread.title ?? "Untitled chat"}
                        </span>
                        <span className="shrink-0 text-[0.68rem] uppercase tracking-[0.22em] text-white/35">
                          {formatUpdatedAt(thread.updatedAt)}
                        </span>
                      </div>
                      <span className="line-clamp-2 text-xs leading-5 text-white/45">
                        {thread.preview}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          ) : null}
        </SidebarContent>

        <SidebarFooter className="mt-auto p-3">
          <Card className="gap-4 rounded-[1.75rem] border border-white/8 bg-white/[0.04] py-4 text-white shadow-none ring-0">
            <CardContent className="flex items-center gap-3 px-4">
              <Avatar className="bg-white/[0.04]">
                <AvatarFallback className="bg-transparent text-white/70">
                  {isAuthLoading ? "..." : getInitial(user?.displayName ?? user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {isAuthLoading ? "Loading session..." : sessionTitle}
                </p>
                <p className="text-sm text-white/45">{sessionDescription}</p>
              </div>
            </CardContent>
            <CardFooter className="px-4">
              {showGuestActions ? (
                <div className="flex w-full gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-center rounded-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                  >
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 justify-center rounded-full bg-[#ff7a1a] text-black hover:bg-[#ff8b36]"
                  >
                    <Link href="/auth/sign-up">Sign up</Link>
                  </Button>
                </div>
              ) : null}
              {showLogoutAction ? (
                <LogoutButton
                  variant="outline"
                  size="sm"
                  className="w-full justify-center rounded-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                />
              ) : null}
              {isAuthLoading ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full justify-center rounded-full border-white/10 bg-white/[0.03] text-white/50"
                >
                  Loading...
                </Button>
              ) : null}
            </CardFooter>
          </Card>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
