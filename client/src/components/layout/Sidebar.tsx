"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
   LayoutDashboard,
   Briefcase,
   Users,
   Sparkles,
   LogOut,
   ChevronLeft,
   ChevronRight,
   Settings,
   Plus,
   Zap,
   UploadCloud,
   ShieldCheck,
   Trophy,
   Star,
   BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { toggleSidebar, setSidebar } from "@/store/slices/uiSlice";
import { useLogout } from "@/services/auth.service";

function UmuravaLogo({ className }: { className?: string }) {
   return (
      <svg
         viewBox="0 0 52 36"
         fill="none"
         className={className}
      >
         <path
            d="M28 6 A 13 13 0 1 1 28 30"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
         />
         <path
            d="M24 30 A 13 13 0 1 1 24 6"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
         />
      </svg>
   );
}

type Role = "candidate" | "recruiter" | "admin";

const NAV_ITEMS: {
   href: string;
   label: string;
   icon: React.ElementType;
   roles: Role[];
   matchFn?: (p: string) => boolean;
}[] = [
   {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      roles: ["candidate", "recruiter", "admin"],
   },
   {
      href: "/applicants",
      label: "Applicants",
      icon: Users,
      roles: ["recruiter", "admin"],
      matchFn: (p) => p === "/applicants",
   },
   {
      href: "/applicants/external",
      label: "External Uploads",
      icon: UploadCloud,
      roles: ["recruiter", "admin"],
      matchFn: (p) => p.startsWith("/applicants/external"),
   },
   {
      href: "/screening",
      label: "AI Screening",
      icon: Sparkles,
      roles: ["recruiter", "admin"],
      matchFn: (p) => p === "/screening" || p.includes("/screening"),
   },
   {
      href: "/shortlists",
      label: "Shortlists",
      icon: Trophy,
      roles: ["recruiter", "admin"],
      matchFn: (p) => p.startsWith("/shortlists"),
   },
   {
      href: "/talent-pool",
      label: "Talent Pool",
      icon: Star,
      roles: ["recruiter", "admin"],
      matchFn: (p: string) => p.startsWith("/talent-pool"),
   },
   {
      href: "/reports",
      label: "Reports",
      icon: BarChart2,
      roles: ["recruiter", "admin"],
      matchFn: (p: string) => p.startsWith("/reports"),
   },
   {
      href: "/jobs",
      label: "Jobs",
      icon: Briefcase,
      roles: ["candidate", "recruiter", "admin"],
      matchFn: (p) =>
         p === "/jobs" || (p.startsWith("/jobs/") && !p.includes("/screening")),
   },
   {
      href: "/admin",
      label: "Admin Panel",
      icon: ShieldCheck,
      roles: ["admin"],
      matchFn: (p) => p.startsWith("/admin"),
   },
];

export function Sidebar() {
   const pathname = usePathname();
   const dispatch = useAppDispatch();
   const open = useAppSelector((s) => s.ui.sidebarOpen);
   const user = useAppSelector((s) => s.auth.user);
   const doLogout = useLogout();
   const [isMobile, setIsMobile] = useState(false);

   useEffect(() => {
      const update = () => {
         const w = window.innerWidth;
         setIsMobile(w < 768);
         // Auto-manage sidebar: full on desktop (lg+), icon-only on tablet/mobile
         if (w >= 1024) {
            dispatch(setSidebar(true));
         } else {
            dispatch(setSidebar(false));
         }
      };
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
   }, [dispatch]);

   const isActive = (href: string, matchFn?: (p: string) => boolean) => {
      if (matchFn) return matchFn(pathname);
      return pathname === href || pathname.startsWith(href + "/");
   };

   const closeMobile = () => {
      if (isMobile) dispatch(setSidebar(false));
   };

   return (
      <>
         {/* Mobile overlay — only rendered client-side after mount */}
         {isMobile && open && (
            <div
               className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
               onClick={() => dispatch(setSidebar(false))}
            />
         )}

         <aside
            className={cn(
               "flex flex-col shrink-0 transition-all duration-300 ease-in-out z-50",
               "bg-sidebar border-r border-sidebar-border",
               "fixed inset-y-0 left-0 md:relative md:inset-auto",
               open ? "w-60" : "w-0 md:w-17",
               !open && "overflow-hidden",
            )}
            suppressHydrationWarning
         >
            {/* ── Logo ── */}
            <div
               className={cn(
                  "flex h-16 items-center shrink-0 border-b border-sidebar-border",
                  open ? "gap-2.5 px-4" : "justify-center px-0",
               )}
            >
               <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <UmuravaLogo className="h-4 w-6 text-white" />
               </div>
               {open && (
                  <>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-sidebar-foreground tracking-tight">
                           Umurava
                        </p>
                        <p className="text-xs font-medium text-sidebar-muted tracking-wide">
                           Talent AI
                        </p>
                     </div>
                     <button
                        onClick={() => dispatch(toggleSidebar())}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
                     >
                        <ChevronLeft className="h-3.5 w-3.5" />
                     </button>
                  </>
               )}
            </div>

            {/* Expand toggle when collapsed */}
            {!open && (
               <button
                  onClick={() => dispatch(toggleSidebar())}
                  className="hidden md:flex items-center justify-center h-8 w-full text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
               >
                  <ChevronRight className="h-3.5 w-3.5" />
               </button>
            )}

            {/* ── CTA button (recruiters/admins only) ── */}
            {user?.role !== "candidate" && (
               <div className={cn("mt-4", open ? "px-3" : "px-2")}>
                  <Link
                     href="/jobs/new"
                     onClick={closeMobile}
                  >
                     <div
                        className={cn(
                           "flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity",
                           open ? "px-4 py-2.5" : "p-2.5",
                        )}
                     >
                        <Plus className="h-4 w-4 shrink-0" />
                        {open && <span>Post New Job</span>}
                     </div>
                  </Link>
               </div>
            )}

            {/* ── Navigation ── */}
            <nav
               className={cn(
                  "flex-1 overflow-y-auto py-4 space-y-0.5",
                  open ? "px-3" : "px-2",
               )}
            >
               {NAV_ITEMS.filter((item) =>
                  user ? item.roles.includes(user.role as Role) : false,
               ).map(({ href, label, icon: Icon, matchFn }) => {
                  const active = isActive(href, matchFn);
                  return (
                     <Link
                        key={label}
                        href={href}
                        title={!open ? label : undefined}
                        onClick={closeMobile}
                        className={cn(
                           "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
                           open ? "px-3 py-2.5" : "justify-center p-2.5",
                           active
                              ? "bg-sidebar-active-bg text-sidebar-active"
                              : "text-sidebar-foreground hover:bg-sidebar-hover",
                        )}
                     >
                        <Icon
                           className={cn(
                              "h-4.5 w-4.5 shrink-0",
                              active
                                 ? "text-sidebar-active"
                                 : "text-sidebar-muted",
                           )}
                        />
                        {open && <span className="truncate">{label}</span>}
                        {open && active && (
                           <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-active shrink-0" />
                        )}
                     </Link>
                  );
               })}
            </nav>

            {/* ── Bottom: Settings + User + Logout ── */}
            <div className="border-t border-sidebar-border p-3 space-y-1">
               {user?.role !== "candidate" && (
                  <Link
                     href="/settings"
                     onClick={closeMobile}
                     title={!open ? "Settings" : undefined}
                     className={cn(
                        "flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-all",
                        open ? "px-3 py-2" : "justify-center p-2",
                        pathname === "/settings"
                           ? "bg-sidebar-active-bg text-sidebar-active"
                           : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                     )}
                  >
                     <Settings
                        className={cn(
                           "h-4.5 w-4.5 shrink-0",
                           pathname === "/settings"
                              ? "text-sidebar-active"
                              : "text-sidebar-muted",
                        )}
                     />
                     {open && <span>Settings</span>}
                  </Link>
               )}

               {user && (
                  <div
                     className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2",
                        open ? "" : "justify-center",
                     )}
                  >
                     <div className="relative h-8 w-8 shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                           {user.name.charAt(0).toUpperCase()}
                        </div>
                        {user.role === "admin" && (
                           <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center rounded-full bg-amber-500 ring-1 ring-sidebar">
                              <ShieldCheck className="h-2 w-2 text-white" />
                           </span>
                        )}
                     </div>
                     {open && (
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                                 {user.name}
                              </p>
                              {user.role === "admin" && (
                                 <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 rounded px-1 py-0.5">
                                    Admin
                                 </span>
                              )}
                           </div>
                           <p className="text-xs text-sidebar-muted truncate">
                              {user.email}
                           </p>
                        </div>
                     )}
                  </div>
               )}

               <button
                  onClick={doLogout}
                  title={!open ? "Sign out" : undefined}
                  className={cn(
                     "flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-all text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                     open ? "px-3 py-2" : "justify-center p-2",
                  )}
               >
                  <LogOut className="h-4.5 w-4.5 shrink-0" />
                  {open && <span>Sign out</span>}
               </button>
            </div>
         </aside>
      </>
   );
}
