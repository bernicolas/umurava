"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
   Bell,
   Menu,
   LogOut,
   User,
   Settings,
   ChevronDown,
   Briefcase,
   CheckCircle2,
   Loader2,
   XCircle,
   Trash2,
   Boxes,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/uiSlice";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/services/auth.service";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import {
   useNotifications,
   type AppNotification,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface HeaderProps {
   title: string;
   actions?: React.ReactNode;
}

// ── Notifications ─────────────────────────────────────────────────────────────

function relativeTime(date: string | Date): string {
   const diff = Date.now() - new Date(date).getTime();
   const mins = Math.floor(diff / 60_000);
   if (mins < 1) return "just now";
   if (mins < 60) return `${mins}m ago`;
   const hours = Math.floor(mins / 60);
   if (hours < 24) return `${hours}h ago`;
   return `${Math.floor(hours / 24)}d ago`;
}

const NOTIF_ICON: Record<
   AppNotification["type"],
   { Icon: React.ElementType; cls: string }
> = {
   screening_started: { Icon: Loader2, cls: "bg-amber-100 text-amber-600" },
   screening_done: {
      Icon: CheckCircle2,
      cls: "bg-emerald-100 text-emerald-600",
   },
   screening_failed: { Icon: XCircle, cls: "bg-rose-100 text-rose-600" },
   screening_batch_progress: { Icon: Boxes, cls: "bg-blue-100 text-blue-600" },
   job_created: { Icon: Briefcase, cls: "bg-violet-100 text-violet-600" },
   job_closed: { Icon: XCircle, cls: "bg-muted text-muted-foreground" },
};

function NOTIF_HREF(n: AppNotification): string {
   if (n.jobId) {
      if (
         n.type === "screening_done" ||
         n.type === "screening_started" ||
         n.type === "screening_batch_progress"
      )
         return `/jobs/${n.jobId}`;
      if (n.type === "job_created" || n.type === "job_closed")
         return `/jobs/${n.jobId}`;
   }
   return "/jobs";
}

function NotificationDropdown() {
   const [open, setOpen] = useState(false);
   const containerRef = useRef<HTMLDivElement>(null);
   const router = useRouter();
   const { notifications, read, unreadCount, markRead, markAllRead, clearAll } =
      useNotifications();

   // Close on outside click
   React.useEffect(() => {
      const handler = (e: MouseEvent) => {
         if (
            containerRef.current &&
            !containerRef.current.contains(e.target as Node)
         ) {
            setOpen(false);
         }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
   }, []);

   function handleClick(n: AppNotification) {
      markRead(n.id);
      setOpen(false);
      router.push(NOTIF_HREF(n));
   }

   return (
      <div
         ref={containerRef}
         className="relative"
      >
         <button
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-foreground hover:bg-muted hover:border-border transition-colors"
         >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
               <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
               </span>
            )}
         </button>

         {open && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-80 rounded-xl border bg-card shadow-lg overflow-hidden">
               {/* Header */}
               <div className="flex items-center justify-between px-4 py-2.5 border-b">
                  <span className="text-sm font-semibold">Notifications</span>
                  <div className="flex items-center gap-3">
                     {unreadCount > 0 && (
                        <button
                           onClick={markAllRead}
                           className="text-xs text-primary hover:underline"
                        >
                           Mark all read
                        </button>
                     )}
                     {notifications.length > 0 && (
                        <button
                           onClick={clearAll}
                           title="Clear all"
                           className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                           <Trash2 className="h-3.5 w-3.5" />
                        </button>
                     )}
                  </div>
               </div>

               {/* List */}
               <div className="max-h-80 overflow-y-auto divide-y">
                  {notifications.length === 0 ? (
                     <div className="py-10 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                           No notifications yet
                        </p>
                     </div>
                  ) : (
                     notifications.map((n) => {
                        const isRead = read.has(n.id);
                        const { Icon, cls } = NOTIF_ICON[n.type];
                        return (
                           <button
                              key={n.id}
                              onClick={() => handleClick(n)}
                              className={cn(
                                 "flex gap-3 px-4 py-3 w-full text-left transition-colors hover:bg-muted/50",
                                 !isRead && "bg-primary/5",
                              )}
                           >
                              <div
                                 className={cn(
                                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                    cls,
                                 )}
                              >
                                 <Icon
                                    className={cn(
                                       "h-3.5 w-3.5",
                                       n.type === "screening_started" &&
                                          "animate-spin",
                                    )}
                                 />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p
                                    className={cn(
                                       "text-sm truncate",
                                       !isRead
                                          ? "font-semibold text-foreground"
                                          : "font-medium text-foreground/80",
                                    )}
                                 >
                                    {n.title}
                                 </p>
                                 <p className="text-xs text-muted-foreground truncate">
                                    {n.body}
                                 </p>
                                 <p className="text-xs text-muted-foreground/60 mt-0.5">
                                    {relativeTime(n.at)}
                                 </p>
                              </div>
                              {!isRead && (
                                 <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                              )}
                           </button>
                        );
                     })
                  )}
               </div>

               {/* Footer */}
               <div className="border-t px-4 py-2">
                  <Link
                     href="/jobs"
                     onClick={() => setOpen(false)}
                     className="text-xs text-primary hover:underline"
                  >
                     View all jobs →
                  </Link>
               </div>
            </div>
         )}
      </div>
   );
}

// ── Profile Dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown() {
   const [open, setOpen] = useState(false);
   const user = useAppSelector((s) => s.auth.user);
   const doLogout = useLogout();

   return (
      <div className="relative">
         <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
         >
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
               {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="hidden sm:block text-left">
               <p className="text-sm font-semibold leading-tight text-foreground">
                  {user?.name ?? "User"}
               </p>
               <p className="text-xs text-muted-foreground leading-tight">
                  {user?.role ?? "recruiter"}
               </p>
            </div>
            <ChevronDown
               className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform hidden sm:block",
                  open && "rotate-180",
               )}
            />
         </button>

         {open && (
            <>
               <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpen(false)}
               />
               <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border bg-card shadow-xl overflow-hidden">
                  {/* User info */}
                  <div className="px-4 py-3 border-b">
                     <p className="text-sm font-semibold truncate">
                        {user?.name}
                     </p>
                     <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                     </p>
                  </div>
                  {/* Menu items */}
                  <div className="py-1.5">
                     <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted transition-colors"
                     >
                        <User className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                        Profile
                     </Link>
                     <Link
                        href="/settings"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted transition-colors"
                     >
                        <Settings className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                        Settings
                     </Link>
                  </div>
                  <div className="border-t py-1.5">
                     <button
                        onClick={() => {
                           setOpen(false);
                           doLogout();
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                     >
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                     </button>
                  </div>
               </div>
            </>
         )}
      </div>
   );
}

// ── Main Header ───────────────────────────────────────────────────────────────
export function Header({ title, actions }: HeaderProps) {
   const dispatch = useAppDispatch();

   return (
      <div className="shrink-0 border-b bg-card">
         <header className="flex h-14 items-center justify-between px-4 sm:px-6 gap-3">
            {/* Left: hamburger + page title + contextual page actions (desktop) */}
            <div className="flex items-center gap-3 min-w-0">
               <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0 h-9 w-9"
                  onClick={() => dispatch(toggleSidebar())}
                  aria-label="Open menu"
               >
                  <Menu className="h-5 w-5" />
               </Button>
               <h1 className="text-base font-semibold text-foreground truncate">
                  {title}
               </h1>
               {actions && (
                  <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border">
                     {actions}
                  </div>
               )}
            </div>

            {/* Right: global search + notifications + profile */}
            <div className="flex items-center gap-2 shrink-0">
               <GlobalSearch />
               <NotificationDropdown />
               <ProfileDropdown />
            </div>
         </header>

         {/* Mobile actions strip — visible only when there are actions and on small screens */}
         {actions && (
            <div className="sm:hidden flex items-center gap-2 px-4 py-2 overflow-x-auto border-t scrollbar-hide">
               {actions}
            </div>
         )}
      </div>
   );
}
