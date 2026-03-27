"use client";

import { PenSquare } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
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

const sidebarDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function getInitial(value: string | undefined) {
  return value?.trim().charAt(0).toUpperCase() || "G";
}

function formatUpdatedAt(value: string) {
  return sidebarDateFormatter.format(new Date(value));
}

function SidebarNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/3 p-4 text-sm leading-6 text-white/50">
      {children}
    </div>
  );
}

export function AppSidebar({
  threads,
  isLoading,
  activeThreadId,
  onNewChat,
  onSelectThread,
}: AppSidebarProps) {
  const { user, isAnonymous, isLoading: isAuthLoading } = useBrowserAuth();
  const isGuestSession = isAnonymous || !user;
  const showGuestActions = !isAuthLoading && isGuestSession;
  const showLogoutAction = !isAuthLoading && !isGuestSession;
  const sessionTitle = isGuestSession
    ? "Guest session"
    : (user.displayName ?? user.email ?? "Account");
  const sessionDescription = isGuestSession
    ? "Sign in to keep your chats and continue later"
    : "Authenticated and persistent";

  return (
    <Sidebar
      variant="floating"
      collapsible="offcanvas"
      className={cn(
        "border-r-0 p-2 sm:p-3",
        "*:data-[slot=sidebar-inner]:overflow-hidden",
        "*:data-[slot=sidebar-inner]:rounded-xl",
        "*:data-[slot=sidebar-inner]:shadow-[0_24px_80px_rgba(0,0,0,0.38)]",
        "*:data-[slot=sidebar-inner]:ring-white/10",
      )}
    >
      <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(43,31,24,0.97),rgba(25,24,24,0.985)_30%,rgba(20,20,20,0.995))] text-white">
        <SidebarHeader className="gap-4 border-b border-white/8 px-4 pb-5 pt-5">
          <div className="mx-auto flex w-full max-w-68 items-start justify-between">
            <h2 className="font-heading text-2xl font-medium text-white">
              Chats
            </h2>
          </div>
          <div className="mx-auto w-full max-w-68">
            <Button
              size="lg"
              onClick={onNewChat}
              className="h-12 w-full justify-start rounded-xl border border-white/8 bg-white/5 px-4 text-white shadow-none hover:bg-white/9"
            >
              <PenSquare />
              New conversation
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-4 px-0 pb-4 pt-4">
          {isLoading ? (
            <div className="mx-auto w-full max-w-68">
              <SidebarNotice>Loading archived conversations...</SidebarNotice>
            </div>
          ) : null}

          {!isLoading && threads.length === 0 ? (
            <div className="mx-auto w-full max-w-68">
              <SidebarNotice>
                No conversations yet. Start one to see synced history and recent
                context here.
              </SidebarNotice>
            </div>
          ) : null}

          {!isLoading && threads.length > 0 ? (
            <SidebarGroup className="mx-auto w-full max-w-68 gap-3 p-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5">
                  {threads.map((thread) => (
                    <SidebarMenuItem key={thread.id}>
                      <SidebarMenuButton
                        type="button"
                        isActive={thread.id === activeThreadId}
                        onClick={() => onSelectThread(thread.id)}
                        className={cn(
                          "h-auto items-start rounded-2xl border border-transparent bg-transparent px-3 py-3.5 text-white/72 shadow-none hover:bg-white/6 hover:text-white data-[active=true]:border-white/8 data-[active=true]:bg-white/11 data-[active=true]:text-white",
                        )}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="line-clamp-1 text-[0.95rem] font-medium leading-5">
                              {thread.title ?? "Untitled chat"}
                            </span>
                            <span className="shrink-0 pt-0.5 text-[0.7rem] text-white/35">
                              {formatUpdatedAt(thread.updatedAt)}
                            </span>
                          </div>
                          <span className="line-clamp-2 text-xs leading-5 text-white/42">
                            {thread.preview || "Continue this conversation."}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>

        <SidebarSeparator className="mx-auto w-full max-w-68 bg-white/8" />

        <SidebarFooter className="mt-auto px-4 pb-5 pt-4">
          <div className="mx-auto w-full max-w-68 rounded-[1.4rem] bg-white/4.5 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <Avatar className="bg-white/4">
                <AvatarFallback className="bg-transparent text-white/70">
                  {isAuthLoading
                    ? "..."
                    : getInitial(user?.displayName ?? user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {isAuthLoading ? "Loading session..." : sessionTitle}
                </p>
                <p className="text-sm text-white/45">{sessionDescription}</p>
              </div>
            </div>

            <div className="mt-4">
              {showGuestActions ? (
                <div className="flex w-full gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-center border-white/10 bg-white/3 text-white hover:bg-white/8 hover:text-white"
                  >
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 justify-center bg-[#ff7a1a] text-black hover:bg-[#ff8b36]"
                  >
                    <Link href="/auth/sign-up">Sign up</Link>
                  </Button>
                </div>
              ) : null}

              {showLogoutAction ? (
                <LogoutButton
                  variant="outline"
                  size="sm"
                  className="w-full justify-center border-white/10 bg-white/3 text-white hover:bg-white/8 hover:text-white"
                />
              ) : null}

              {isAuthLoading ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full justify-center border-white/10 bg-white/3 text-white/50"
                >
                  Loading...
                </Button>
              ) : null}
            </div>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
