"use client";

import React, {
   useState,
   useRef,
   useEffect,
   useMemo,
   useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
   Search,
   X,
   Briefcase,
   Users,
   Trophy,
   LayoutDashboard,
   ShieldCheck,
   PlusCircle,
   User,
   FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useJobs } from "@/services/job.service";
import { useAllShortlists } from "@/services/screening.service";
import { useAppSelector } from "@/store/hooks";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
   _id: string;
   name: string;
   email: string;
   role: "recruiter" | "admin";
}

type ResultType = "nav" | "job" | "shortlist" | "user";

interface SearchResult {
   id: string;
   type: ResultType;
   label: string;
   sublabel?: string;
   meta?: string;
   href: string;
   Icon: React.ElementType;
}

interface ResultGroup {
   label: string;
   items: SearchResult[];
}

// ── Static nav items ──────────────────────────────────────────────────────────

const NAV_ITEMS: Omit<SearchResult, "id">[] = [
   {
      type: "nav",
      label: "Dashboard",
      sublabel: "Overview & stats",
      href: "/dashboard",
      Icon: LayoutDashboard,
   },
   {
      type: "nav",
      label: "Jobs",
      sublabel: "All job postings",
      href: "/jobs",
      Icon: Briefcase,
   },
   {
      type: "nav",
      label: "New Job",
      sublabel: "Create a job posting",
      href: "/jobs/new",
      Icon: PlusCircle,
   },
   {
      type: "nav",
      label: "Applicants",
      sublabel: "Applicant pools",
      href: "/applicants",
      Icon: Users,
   },
   {
      type: "nav",
      label: "Shortlists",
      sublabel: "AI screening results",
      href: "/shortlists",
      Icon: Trophy,
   },
];

const ADMIN_NAV_ITEM: Omit<SearchResult, "id"> = {
   type: "nav",
   label: "Admin Panel",
   sublabel: "Manage users & roles",
   href: "/admin",
   Icon: ShieldCheck,
};

// ── Icon colour per type ──────────────────────────────────────────────────────

const TYPE_ICON_CLS: Record<ResultType, string> = {
   nav: "bg-slate-100 text-slate-600",
   job: "bg-violet-100 text-violet-600",
   shortlist: "bg-emerald-100 text-emerald-600",
   user: "bg-blue-100 text-blue-600",
};

// ── Admin users hook ──────────────────────────────────────────────────────────

function useAdminUsers(enabled: boolean) {
   return useQuery({
      queryKey: ["admin-users-search"],
      queryFn: async () => {
         const res = await api.get<ApiResponse<{ users: AdminUser[] }>>(
            "/admin/users",
            { params: { limit: 500 } },
         );
         return res.data.data?.users ?? [];
      },
      enabled,
      staleTime: 60_000,
   });
}

// ── Result row ────────────────────────────────────────────────────────────────

function ResultItem({
   result,
   isActive,
   onHover,
   onClick,
}: {
   result: SearchResult;
   isActive: boolean;
   onHover: () => void;
   onClick: () => void;
}) {
   const { Icon } = result;
   const ref = useRef<HTMLButtonElement>(null);

   useEffect(() => {
      if (isActive) ref.current?.scrollIntoView({ block: "nearest" });
   }, [isActive]);

   return (
      <button
         ref={ref}
         onMouseEnter={onHover}
         onClick={onClick}
         className={cn(
            "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors rounded-lg",
            isActive ? "bg-accent" : "hover:bg-accent/60",
         )}
      >
         <div
            className={cn(
               "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
               TYPE_ICON_CLS[result.type],
            )}
         >
            <Icon className="h-3.5 w-3.5" />
         </div>
         <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{result.label}</p>
            {result.sublabel && (
               <p className="text-xs text-muted-foreground truncate">
                  {result.sublabel}
               </p>
            )}
         </div>
         {result.meta && (
            <span className="shrink-0 text-xs capitalize px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
               {result.meta}
            </span>
         )}
      </button>
   );
}

// ── Group section ─────────────────────────────────────────────────────────────

function ResultGroupSection({
   group,
   activeIndex,
   globalStart,
   onHover,
   onSelect,
}: {
   group: ResultGroup;
   activeIndex: number;
   globalStart: number;
   onHover: (i: number) => void;
   onSelect: (href: string) => void;
}) {
   return (
      <div>
         <p className="px-2 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
            {group.label}
         </p>
         {group.items.map((r, i) => (
            <ResultItem
               key={r.id}
               result={r}
               isActive={activeIndex === globalStart + i}
               onHover={() => onHover(globalStart + i)}
               onClick={() => onSelect(r.href)}
            />
         ))}
      </div>
   );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GlobalSearch() {
   const [open, setOpen] = useState(false);
   const [query, setQuery] = useState("");
   const [activeIndex, setActiveIndex] = useState(0);

   const containerRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLInputElement>(null);
   const router = useRouter();

   const user = useAppSelector((s) => s.auth.user);
   const isAdmin = user?.role === "admin";

   const { data: jobData } = useJobs({ limit: 500 });
   const jobs = jobData?.items ?? [];

   const { data: shortlists = [] } = useAllShortlists();
   const { data: adminUsers = [] } = useAdminUsers(isAdmin);

   // Close on outside click
   useEffect(() => {
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

   // Ctrl/Cmd+K and Escape
   useEffect(() => {
      const handler = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 30);
         }
         if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
         }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
   }, []);

   // Build groups
   const groups = useMemo<ResultGroup[]>(() => {
      const q = query.toLowerCase().trim();

      if (!q) {
         const navItems = [
            ...NAV_ITEMS,
            ...(isAdmin ? [ADMIN_NAV_ITEM] : []),
         ].map((n, i) => ({ ...n, id: `nav-${i}` }));
         const recentJobs = [...jobs]
            .sort(
               (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
            )
            .slice(0, 5)
            .map((j) => ({
               id: `job-${j._id}`,
               type: "job" as const,
               label: j.title,
               sublabel: `${j.location} · ${j.type}`,
               meta: j.status,
               href: `/jobs/${j._id}`,
               Icon: Briefcase,
            }));
         const result: ResultGroup[] = [
            { label: "Quick navigation", items: navItems },
         ];
         if (recentJobs.length)
            result.push({ label: "Recent jobs", items: recentJobs });
         return result;
      }

      const result: ResultGroup[] = [];

      // Jobs
      const matchedJobs = jobs
         .filter(
            (j) =>
               j.title.toLowerCase().includes(q) ||
               j.location.toLowerCase().includes(q) ||
               j.type.toLowerCase().includes(q) ||
               j.status.toLowerCase().includes(q) ||
               j.requiredSkills?.some((s) => s.toLowerCase().includes(q)),
         )
         .slice(0, 5)
         .map((j) => ({
            id: `job-${j._id}`,
            type: "job" as const,
            label: j.title,
            sublabel: `${j.location} · ${j.type}`,
            meta: j.status,
            href: `/jobs/${j._id}`,
            Icon: Briefcase,
         }));
      if (matchedJobs.length)
         result.push({ label: "Jobs", items: matchedJobs });

      // Shortlisted candidates
      const candidates = shortlists
         .flatMap((sh) =>
            (sh.shortlist ?? []).map((c) => ({
               ...c,
               _jobTitle: sh.job?.title ?? "Unknown Job",
               _jobId: sh.jobId,
            })),
         )
         .filter((c) => {
            const first = c.applicant?.profile?.firstName ?? "";
            const last = c.applicant?.profile?.lastName ?? "";
            const email = c.applicant?.profile?.email ?? "";
            const headline = c.applicant?.profile?.headline ?? "";
            return (
               `${first} ${last}`.toLowerCase().includes(q) ||
               email.toLowerCase().includes(q) ||
               headline.toLowerCase().includes(q) ||
               c._jobTitle.toLowerCase().includes(q)
            );
         })
         .slice(0, 5)
         .map((c) => {
            const name =
               `${c.applicant?.profile?.firstName ?? ""} ${c.applicant?.profile?.lastName ?? ""}`.trim() ||
               "Unknown";
            return {
               id: `shortlist-${c.candidateId}-${c._jobId}`,
               type: "shortlist" as const,
               label: name,
               sublabel: c._jobTitle,
               meta: `#${c.rank} · ${c.matchScore}%`,
               href: "/shortlists",
               Icon: Trophy,
            };
         });
      if (candidates.length)
         result.push({ label: "Candidates", items: candidates });

      // Users (admin only)
      if (isAdmin) {
         const matchedUsers = adminUsers
            .filter(
               (u) =>
                  u.name.toLowerCase().includes(q) ||
                  u.email.toLowerCase().includes(q) ||
                  u.role.toLowerCase().includes(q),
            )
            .slice(0, 4)
            .map((u) => ({
               id: `user-${u._id}`,
               type: "user" as const,
               label: u.name,
               sublabel: u.email,
               meta: u.role,
               href: "/admin",
               Icon: User,
            }));
         if (matchedUsers.length)
            result.push({ label: "Users", items: matchedUsers });
      }

      // Pages
      const matchedNav = [...NAV_ITEMS, ...(isAdmin ? [ADMIN_NAV_ITEM] : [])]
         .filter(
            (n) =>
               n.label.toLowerCase().includes(q) ||
               (n.sublabel ?? "").toLowerCase().includes(q),
         )
         .map((n, i) => ({ ...n, id: `nav-q-${i}` }));
      if (matchedNav.length) result.push({ label: "Pages", items: matchedNav });

      return result;
   }, [query, jobs, shortlists, adminUsers, isAdmin]);

   const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
   const groupStarts = useMemo(() => {
      let offset = 0;
      return groups.map((g) => {
         const s = offset;
         offset += g.items.length;
         return s;
      });
   }, [groups]);

   useEffect(() => setActiveIndex(0), [query]);

   const navigate = useCallback(
      (href: string) => {
         router.push(href);
         setOpen(false);
         setQuery("");
      },
      [router],
   );

   const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
         e.preventDefault();
         setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
         e.preventDefault();
         setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
         e.preventDefault();
         const t = flat[activeIndex];
         if (t) navigate(t.href);
      }
   };

   return (
      <div
         ref={containerRef}
         className="relative hidden sm:block"
      >
         {/* Trigger button */}
         <button
            onClick={() => {
               setOpen(true);
               setTimeout(() => inputRef.current?.focus(), 30);
            }}
            className="flex items-center gap-2 rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors w-44"
         >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">
               Search everything…
            </span>
            <kbd className="hidden lg:inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-xs font-mono text-muted-foreground leading-none">
               ⌘K
            </kbd>
         </button>

         {/* Dropdown panel */}
         {open && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-[22rem] rounded-xl border bg-card shadow-lg overflow-hidden">
               {/* Input */}
               <div className="flex items-center gap-2 px-3 py-2.5 border-b">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                     ref={inputRef}
                     value={query}
                     onChange={(e) => setQuery(e.target.value)}
                     onKeyDown={onKeyDown}
                     placeholder="Search jobs, candidates, pages…"
                     className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {query && (
                     <button
                        onClick={() => setQuery("")}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                     >
                        <X className="h-3.5 w-3.5" />
                     </button>
                  )}
               </div>

               {/* Results */}
               <div className="max-h-80 overflow-y-auto px-1.5 py-1.5">
                  {groups.length === 0 ? (
                     <div className="py-10 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                           No results for &ldquo;{query}&rdquo;
                        </p>
                     </div>
                  ) : (
                     groups.map((group, gi) => (
                        <ResultGroupSection
                           key={group.label}
                           group={group}
                           activeIndex={activeIndex}
                           globalStart={groupStarts[gi]}
                           onHover={setActiveIndex}
                           onSelect={navigate}
                        />
                     ))
                  )}
               </div>

               {/* Footer */}
               <div className="border-t px-3 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                     <span className="flex items-center gap-1">
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono leading-none">
                           ↑↓
                        </kbd>
                        navigate
                     </span>
                     <span className="flex items-center gap-1">
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono leading-none">
                           ↵
                        </kbd>
                        open
                     </span>
                  </div>
                  {query.trim() && flat.length > 0 && (
                     <span className="text-xs text-muted-foreground">
                        {flat.length} result{flat.length !== 1 ? "s" : ""}
                     </span>
                  )}
               </div>
            </div>
         )}
      </div>
   );
}
