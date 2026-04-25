"use client";

import { useState } from "react";
import Link from "next/link";
import {
   Plus,
   Search,
   Briefcase,
   MapPin,
   Clock,
   Sparkles,
   Trash2,
   ChevronRight,
   Users,
   X,
   Ban,
   AlertCircle,
   MoreVertical,
} from "lucide-react";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJobs, useDeleteJob, useCloseJob } from "@/services/job.service";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

const STATUS_CONFIG = {
   draft: {
      label: "Draft",
      dot: "bg-slate-400",
      pill: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
   },
   open: {
      label: "Open",
      dot: "bg-emerald-500",
      pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
   },
   closed: {
      label: "Closed",
      dot: "bg-slate-300",
      pill: "bg-muted text-muted-foreground",
   },
} satisfies Record<Job["status"], { label: string; dot: string; pill: string }>;

const TYPE_COLORS: Record<string, string> = {
   "Full-time":
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
   "Part-time": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
   Contract:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
   Internship: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
};

type FilterTab = Job["status"] | "all" | "screened";
const FILTER_TABS: FilterTab[] = ["all", "open", "screened", "draft", "closed"];

function JobRow({
   job,
   onDelete,
   onClose,
}: {
   job: Job;
   onDelete?: (id: string) => void;
   onClose?: (id: string) => void;
}) {
   const cfg = STATUS_CONFIG[job.status];
   const hasNewApplicants =
      job.screeningStatus === "done" &&
      (job.applicantCount ?? 0) > job.lastScreenedApplicantCount;
   const newApplicantsDelta = hasNewApplicants
      ? (job.applicantCount ?? 0) - job.lastScreenedApplicantCount
      : 0;

   return (
      <Link
         href={`/jobs/${job._id}`}
         className="group block"
      >
         <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors border-b last:border-0">
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
               <Briefcase className="h-4 w-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                     {job.title}
                  </p>
                  <span
                     className={cn(
                        "hidden sm:inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium",
                        TYPE_COLORS[job.type] ??
                           "bg-muted text-muted-foreground",
                     )}
                  >
                     {job.type}
                  </span>
                  {job.screeningStatus === "running" && (
                     <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 text-xs font-medium animate-pulse">
                        <Sparkles className="h-2.5 w-2.5" />
                        Screening…
                     </span>
                  )}
                  {job.screeningStatus === "done" && (
                     <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 px-2 py-0.5 text-xs font-medium">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI Screened
                     </span>
                  )}
                  {hasNewApplicants && (
                     <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 px-2 py-0.5 text-xs font-semibold border border-orange-200 dark:border-orange-800">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {newApplicantsDelta} new — re-screen?
                     </span>
                  )}
               </div>
               <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                     <MapPin className="h-3 w-3 shrink-0" />
                     {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                     <Clock className="h-3 w-3 shrink-0" />
                     {job.requiredExperience}y+ exp
                  </span>
                  <span className="flex items-center gap-1">
                     <Users className="h-3 w-3 shrink-0" />
                     Top {job.shortlistSize}
                  </span>
                  {job.applicantCount !== undefined && (
                     <span>
                        {job.applicantCount} applicant
                        {job.applicantCount !== 1 ? "s" : ""}
                     </span>
                  )}
               </div>
               {job.requiredSkills.length > 0 && (
                  <div className="hidden sm:flex flex-wrap gap-1 mt-2">
                     {job.requiredSkills.slice(0, 5).map((s) => (
                        <span
                           key={s}
                           className="inline-flex items-center rounded-md bg-primary/8 border border-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                           {s}
                        </span>
                     ))}
                     {job.requiredSkills.length > 5 && (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs text-muted-foreground border">
                           +{job.requiredSkills.length - 5}
                        </span>
                     )}
                  </div>
               )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
               <div className="hidden md:flex flex-col items-end gap-1">
                  <span
                     className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                        cfg.pill,
                     )}
                  >
                     <span
                        className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)}
                     />
                     {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                     {formatDistanceToNow(new Date(job.createdAt), {
                        addSuffix: true,
                     })}
                  </span>
               </div>

               <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.preventDefault()}
               >
                  <Link
                     href={`/jobs/${job._id}/screening`}
                     onClick={(e) => e.stopPropagation()}
                  >
                     <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors">
                        <Sparkles className="h-3 w-3" />
                        Screen
                     </span>
                  </Link>

                  {(onClose || onDelete) && (
                     <DropdownMenu>
                        <DropdownMenuTrigger
                           asChild
                           onClick={(e) => e.stopPropagation()}
                        >
                           <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                              <MoreVertical className="h-4 w-4" />
                           </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                           align="end"
                           className="w-44 bg-white "
                        >
                           <DropdownMenuItem asChild>
                              <Link
                                 href={`/jobs/${job._id}/screening`}
                                 onClick={(e) => e.stopPropagation()}
                              >
                                 <Sparkles className="h-3.5 w-3.5" />
                                 AI Screening
                              </Link>
                           </DropdownMenuItem>
                           {onClose && job.status !== "closed" && (
                              <DropdownMenuItem
                                 onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onClose(job._id);
                                 }}
                                 className="text-amber-700 focus:text-amber-700 focus:bg-amber-50"
                              >
                                 <Ban className="h-3.5 w-3.5" />
                                 Close Job
                              </DropdownMenuItem>
                           )}
                           {onDelete && (
                              <>
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem
                                    onClick={(e) => {
                                       e.preventDefault();
                                       e.stopPropagation();
                                       onDelete(job._id);
                                    }}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                 >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                 </DropdownMenuItem>
                              </>
                           )}
                        </DropdownMenuContent>
                     </DropdownMenu>
                  )}
               </div>

               <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
         </div>
      </Link>
   );
}

export default function JobsPage() {
   const user = useAppSelector((s) => s.auth.user);
   const isCandidate = user?.role === "candidate";

   const [search, setSearch] = useState("");
   const [activeTab, setActiveTab] = useState<FilterTab>(
      isCandidate ? "open" : "all",
   );
   const [typeFilter, setTypeFilter] = useState<string>("all");

   const { data, isLoading } = useJobs({ limit: 100 });
   const deleteJob = useDeleteJob();
   const closeJob = useCloseJob();
   const { toast } = useToast();

   const allJobs = (data?.items ?? []).filter(
      (j) => !isCandidate || j.status === "open",
   );

   const tabMatch = (j: Job, tab: FilterTab) => {
      if (tab === "all") return true;
      if (tab === "screened") return j.screeningStatus === "done";
      return j.status === tab;
   };

   const jobs = allJobs.filter((j) => {
      const matchSearch =
         j.title.toLowerCase().includes(search.toLowerCase()) ||
         j.location.toLowerCase().includes(search.toLowerCase());
      const matchTab = tabMatch(j, activeTab);
      const matchType = typeFilter === "all" || j.type === typeFilter;
      return matchSearch && matchTab && matchType;
   });

   const counts: Record<FilterTab, number> = {
      all: allJobs.length,
      open: allJobs.filter((j) => j.status === "open").length,
      screened: allJobs.filter((j) => j.screeningStatus === "done").length,
      draft: allJobs.filter((j) => j.status === "draft").length,
      closed: allJobs.filter((j) => j.status === "closed").length,
   };

   const types = [...new Set(allJobs.map((j) => j.type))].sort();

   const handleDelete = async (id: string) => {
      if (!confirm("Delete this job posting permanently?")) return;
      try {
         await deleteJob.mutateAsync(id);
         toast({ title: "Job deleted" });
      } catch {
         toast({ title: "Failed to delete", variant: "destructive" });
      }
   };

   const handleClose = async (id: string) => {
      if (
         !confirm("Close this job? It will no longer accept new applications.")
      )
         return;
      try {
         await closeJob.mutateAsync(id);
         toast({ title: "Job closed" });
      } catch {
         toast({ title: "Failed to close job", variant: "destructive" });
      }
   };

   const hasActiveFilter =
      search || activeTab !== "all" || typeFilter !== "all";

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title={isCandidate ? "Browse Jobs" : "Jobs"} />

         <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {!isCandidate && (
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                     {
                        tab: "open" as FilterTab,
                        label: "Open",
                        value: counts.open,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
                     },
                     {
                        tab: "screened" as FilterTab,
                        label: "AI Screened",
                        value: counts.screened,
                        color: "text-violet-600",
                        bg: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900",
                     },
                     {
                        tab: "draft" as FilterTab,
                        label: "Draft",
                        value: counts.draft,
                        color: "text-slate-500",
                        bg: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
                     },
                     {
                        tab: "closed" as FilterTab,
                        label: "Closed",
                        value: counts.closed,
                        color: "text-slate-400",
                        bg: "bg-muted border",
                     },
                  ].map(({ tab, label, value, color, bg }) => (
                     <button
                        key={tab}
                        onClick={() =>
                           setActiveTab(activeTab === tab ? "all" : tab)
                        }
                        className={cn(
                           "rounded-xl p-4 text-left transition-all hover:shadow-sm border",
                           bg,
                           activeTab === tab && "ring-2 ring-primary/40",
                        )}
                     >
                        {isLoading ? (
                           <div className="h-7 w-10 bg-muted animate-pulse rounded mb-1" />
                        ) : (
                           <p className={cn("text-2xl font-bold", color)}>
                              {value}
                           </p>
                        )}
                        <p className="text-xs text-muted-foreground font-medium">
                           {label}
                        </p>
                     </button>
                  ))}
               </div>
            )}

            <div className="space-y-2">
               <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2.5">
                  {/* Left: search + type pills */}
                  <div className="flex items-center gap-2 shrink-0">
                     <div className="relative w-56 shrink-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                           placeholder="Search jobs…"
                           className="h-8 pl-8 pr-8 text-xs"
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                           <button
                              onClick={() => setSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                           >
                              <X className="h-3 w-3" />
                           </button>
                        )}
                     </div>
                     {/* Type pills */}
                     {types.length > 1 && (
                        <div className="hidden md:flex gap-1 shrink-0">
                           {["all", ...types].map((t) => (
                              <button
                                 key={t}
                                 onClick={() => setTypeFilter(t)}
                                 className={cn(
                                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                                    typeFilter === t
                                       ? "bg-primary text-primary-foreground border-primary"
                                       : "hover:bg-muted",
                                 )}
                              >
                                 {t === "all" ? "All types" : t}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>
                  {/* Right: New Job */}
                  {!isCandidate && (
                     <Button
                        asChild
                        className="h-9 shrink-0 px-4 text-sm"
                     >
                        <Link href="/jobs/new">
                           <Plus className="h-4 w-4 mr-1.5" /> New Job
                        </Link>
                     </Button>
                  )}
               </div>

               {!isCandidate && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                     {FILTER_TABS.map((tab) => {
                        const isActive = activeTab === tab;
                        const count = counts[tab];
                        const tabLabel =
                           tab === "all"
                              ? "All jobs"
                              : tab === "screened"
                                ? "AI Screened"
                                : tab.charAt(0).toUpperCase() + tab.slice(1);
                        return (
                           <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              className={cn(
                                 "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all shrink-0",
                                 isActive
                                    ? "bg-foreground text-background"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                              )}
                           >
                              {tab === "screened" && (
                                 <Sparkles className="h-3 w-3" />
                              )}
                              <span>{tabLabel}</span>
                              <span
                                 className={cn(
                                    "rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                                    isActive
                                       ? "bg-background/20"
                                       : "bg-muted text-muted-foreground",
                                 )}
                              >
                                 {count}
                              </span>
                           </button>
                        );
                     })}
                  </div>
               )}
            </div>

            {isLoading ? (
               <div className="rounded-xl border overflow-hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                     <div
                        key={i}
                        className="flex items-center gap-4 px-5 py-4 border-b last:border-0"
                     >
                        <div className="hidden sm:block h-10 w-10 rounded-xl bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                           <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                           <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="hidden md:block h-6 w-20 bg-muted animate-pulse rounded-full" />
                     </div>
                  ))}
               </div>
            ) : jobs.length === 0 ? (
               <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                     <Briefcase className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                     <p className="text-sm font-medium">
                        {hasActiveFilter
                           ? "No jobs match your filters"
                           : isCandidate
                             ? "No open positions right now"
                             : "No jobs yet"}
                     </p>
                     <p className="text-xs text-muted-foreground mt-1">
                        {hasActiveFilter
                           ? "Try adjusting your search or filters."
                           : isCandidate
                             ? "Check back soon for new opportunities."
                             : "Post your first job to get started."}
                     </p>
                  </div>
                  {!isCandidate && !hasActiveFilter && (
                     <Button
                        asChild
                        size="sm"
                     >
                        <Link href="/jobs/new">
                           <Plus className="h-4 w-4 mr-1.5" /> Post a Job
                        </Link>
                     </Button>
                  )}
                  {hasActiveFilter && (
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                           setSearch("");
                           setActiveTab(isCandidate ? "open" : "all");
                           setTypeFilter("all");
                        }}
                     >
                        Clear filters
                     </Button>
                  )}
               </div>
            ) : (
               <div className="rounded-xl border overflow-hidden bg-card">
                  <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 bg-muted/50 border-b">
                     <div className="hidden sm:block w-10 shrink-0" />
                     <p className="flex-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Job
                     </p>
                     <p className="hidden md:block text-xs font-semibold uppercase tracking-widest text-muted-foreground w-32 text-right">
                        Status
                     </p>
                  </div>
                  <div>
                     {jobs.map((job) => (
                        <JobRow
                           key={job._id}
                           job={job}
                           onDelete={isCandidate ? undefined : handleDelete}
                           onClose={isCandidate ? undefined : handleClose}
                        />
                     ))}
                  </div>
                  <div className="px-5 py-3 bg-muted/30 border-t text-xs text-muted-foreground">
                     Showing {jobs.length} of {allJobs.length} job
                     {allJobs.length !== 1 ? "s" : ""}
                  </div>
               </div>
            )}
         </main>
      </div>
   );
}
