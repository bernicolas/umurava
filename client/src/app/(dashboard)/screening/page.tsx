"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
   Briefcase,
   ChevronDown,
   ChevronUp,
   Check,
   MapPin,
   Bot,
   Sparkles,
   Users,
   Trophy,
   CheckCircle2,
   BarChart2,
   AlertTriangle,
   History,
   TrendingUp,
   Clock,
   Plus,
   FileText,
   Layers,
   GitMerge,
   Loader2,
   Star,
} from "lucide-react";
import {
   BarChart,
   Bar,
   XAxis,
   YAxis,
   ResponsiveContainer,
   Tooltip,
   Cell,
} from "recharts";
import { Header } from "@/components/layout/Header";
import { ScreeningTrigger } from "@/components/features/screening/ScreeningTrigger";
import { ShortlistCard } from "@/components/features/screening/ShortlistCard";
import {
   CandidateReviewRow,
   type CandidateDecision,
} from "@/components/features/screening/CandidateReviewRow";
import { BulkDecisionToolbar } from "@/components/features/screening/BulkDecisionToolbar";
import { FinalizationPanel } from "@/components/features/screening/FinalizationPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobs } from "@/services/job.service";
import { useApplicants } from "@/services/applicant.service";
import {
   useScreeningResult,
   useScreeningHistory,
   useTriggerScreening,
   useHistoryRunDetail,
   useCombineHistory,
} from "@/services/screening.service";
import { useGetSettings } from "@/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type {
   CombinedCandidate,
   CombinedShortlistResult,
   ScreeningHistoryEntry,
} from "@/types";

const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
   open: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
   screening: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
   draft: {
      badge: "bg-secondary text-secondary-foreground",
      dot: "bg-slate-400",
   },
   closed: { badge: "bg-muted text-muted-foreground", dot: "bg-slate-300" },
};

const SCORE_COLOR = (score: number) => {
   if (score >= 80) return "hsl(142 71% 45%)";
   if (score >= 60) return "hsl(38 92% 50%)";
   return "hsl(222 89% 54%)";
};

// ─── Job Selector ─────────────────────────────────────────────────────────────

function JobSelector({
   jobs,
   selectedId,
   onChange,
   isLoading,
}: {
   jobs: {
      _id: string;
      title: string;
      status: string;
      location: string;
      type: string;
   }[];
   selectedId: string | null;
   onChange: (id: string) => void;
   isLoading: boolean;
}) {
   const [open, setOpen] = useState(false);
   const selected = jobs.find((j) => j._id === selectedId);

   return (
      <div className="relative">
         <button
            onClick={() => setOpen((v) => !v)}
            className={cn(
               "flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-all",
               "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
               open && "border-primary ring-2 ring-primary/20",
            )}
         >
            <div
               className={cn(
                  "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center",
                  selected ? "bg-primary/10" : "bg-muted",
               )}
            >
               <Briefcase
                  className={cn(
                     "h-4 w-4",
                     selected ? "text-primary" : "text-muted-foreground",
                  )}
               />
            </div>
            <div className="flex-1 min-w-0">
               {selected ? (
                  <>
                     <p className="text-sm font-semibold truncate">
                        {selected.title}
                     </p>
                     <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {selected.location} · {selected.type}
                     </p>
                  </>
               ) : (
                  <p className="text-sm text-muted-foreground">
                     {isLoading ? "Loading jobs…" : "Choose a job to screen"}
                  </p>
               )}
            </div>
            {selected && (
               <span
                  className={cn(
                     "text-xs font-medium px-2 py-0.5 rounded-full capitalize mr-2 shrink-0",
                     STATUS_STYLE[selected.status]?.badge,
                  )}
               >
                  {selected.status}
               </span>
            )}
            <ChevronDown
               className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
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
               <div className="absolute left-0 top-full mt-1.5 z-50 w-full rounded-xl border bg-card shadow-xl overflow-hidden">
                  <div className="px-3 py-2 border-b">
                     <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {jobs.length} position{jobs.length !== 1 ? "s" : ""}
                     </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1.5">
                     {jobs.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                           No jobs yet
                        </p>
                     ) : (
                        jobs.map((job) => (
                           <button
                              key={job._id}
                              onClick={() => {
                                 onChange(job._id);
                                 setOpen(false);
                              }}
                              className={cn(
                                 "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted",
                                 job._id === selectedId && "bg-primary/5",
                              )}
                           >
                              <div
                                 className={cn(
                                    "h-2 w-2 rounded-full shrink-0",
                                    STATUS_STYLE[job.status]?.dot ??
                                       "bg-slate-300",
                                 )}
                              />
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-medium truncate">
                                    {job.title}
                                 </p>
                                 <p className="text-xs text-muted-foreground truncate">
                                    {job.location} · {job.type}
                                 </p>
                              </div>
                              {job._id === selectedId && (
                                 <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                              <span
                                 className={cn(
                                    "text-xs font-medium px-1.5 py-0.5 rounded-full capitalize",
                                    STATUS_STYLE[job.status]?.badge,
                                 )}
                              >
                                 {job.status}
                              </span>
                           </button>
                        ))
                     )}
                  </div>
                  <div className="border-t px-4 py-2">
                     <Link
                        href="/jobs/new"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                     >
                        <Plus className="h-3 w-3" /> Create new job
                     </Link>
                  </div>
               </div>
            </>
         )}
      </div>
   );
}

// ─── Expandable history run card ──────────────────────────────────────────────

function HistoryRunCard({
   run,
   jobId,
   isSelected,
   onToggleSelect,
   showCheckbox,
}: {
   run: ScreeningHistoryEntry;
   jobId: string;
   isSelected: boolean;
   onToggleSelect: (id: string) => void;
   showCheckbox: boolean;
}) {
   const [open, setOpen] = useState(false);
   const { data: detail, isLoading: detailLoading } = useHistoryRunDetail(
      jobId,
      open ? run._id : null,
   );

   const scoreColor = (s: number) =>
      s >= 80
         ? "text-emerald-600"
         : s >= 60
           ? "text-amber-600"
           : "text-rose-600";

   return (
      <div
         className={cn(
            "rounded-xl border transition-all",
            open && "ring-1 ring-primary/20 shadow-sm",
            isSelected && "border-primary/40 bg-primary/2",
         )}
      >
         <div className="flex items-center gap-2 p-4">
            {showCheckbox && (
               <button
                  onClick={() => onToggleSelect(run._id)}
                  className={cn(
                     "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                     isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40 hover:border-primary",
                  )}
               >
                  {isSelected && <Check className="h-3 w-3" />}
               </button>
            )}
            <button
               onClick={() => setOpen((v) => !v)}
               className="flex flex-1 items-center gap-3 text-left min-w-0"
            >
               <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                     <p className="text-sm font-semibold">
                        Run #{run.runNumber}
                     </p>
                     <Badge
                        variant="secondary"
                        className="text-xs font-mono"
                     >
                        {run.modelUsed}
                     </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                     <Clock className="h-3 w-3 shrink-0" />
                     {format(new Date(run.screenedAt), "d MMM yyyy 'at' HH:mm")}
                  </p>
               </div>
               <div className="flex items-center gap-3 shrink-0 text-right">
                  <div className="hidden sm:block">
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Screened
                     </p>
                     <p className="text-sm font-bold">{run.totalApplicants}</p>
                  </div>
                  <div className="hidden sm:block">
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Shortlisted
                     </p>
                     <p className="text-sm font-bold">{run.shortlistSize}</p>
                  </div>
                  <div>
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Top
                     </p>
                     <p
                        className={cn(
                           "text-sm font-bold",
                           scoreColor(run.topScore),
                        )}
                     >
                        {run.topScore}%
                     </p>
                  </div>
                  <div>
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Avg
                     </p>
                     <p
                        className={cn(
                           "text-sm font-bold",
                           scoreColor(run.avgScore),
                        )}
                     >
                        {run.avgScore}%
                     </p>
                  </div>
                  {open ? (
                     <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                     <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
               </div>
            </button>
         </div>
         {open && (
            <div className="border-t px-4 pb-4 pt-3 space-y-3">
               {detailLoading ? (
                  <div className="space-y-2">
                     {Array.from({ length: 3 }).map((_, i) => (
                        <div
                           key={i}
                           className="h-16 rounded-lg border bg-muted animate-pulse"
                        />
                     ))}
                  </div>
               ) : detail?.shortlist && detail.shortlist.length > 0 ? (
                  <>
                     <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                        {detail.shortlist.length} candidates in this run
                     </p>
                     {detail.shortlist.map((candidate) => (
                        <ShortlistCard
                           key={candidate.candidateId}
                           candidate={candidate}
                        />
                     ))}
                  </>
               ) : (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                     <History className="h-4 w-4 shrink-0" />
                     <span>Candidate details not stored for this run.</span>
                  </div>
               )}
            </div>
         )}
      </div>
   );
}

// ─── Combined shortlist card ──────────────────────────────────────────────────

function CombinedCandidateCard({
   candidate,
}: {
   candidate: CombinedCandidate;
}) {
   const [expanded, setExpanded] = useState(candidate.rank <= 3);
   const profile = candidate.applicant?.profile;
   const fullName = profile
      ? `${profile.firstName} ${profile.lastName}`
      : `Candidate #${candidate.rank}`;

   const rankClass =
      candidate.rank === 1
         ? "bg-amber-400 text-white ring-2 ring-amber-200"
         : candidate.rank === 2
           ? "bg-slate-400 text-white ring-2 ring-slate-200"
           : candidate.rank === 3
             ? "bg-orange-400 text-white ring-2 ring-orange-200"
             : "bg-primary/10 text-primary";

   const borderClass =
      candidate.rank === 1
         ? "border-l-4 border-l-amber-400"
         : candidate.rank === 2
           ? "border-l-4 border-l-slate-400"
           : candidate.rank === 3
             ? "border-l-4 border-l-orange-400"
             : "";

   return (
      <Card className={cn("hover:shadow-md transition-all", borderClass)}>
         <div className="p-4">
            <button
               onClick={() => setExpanded((v) => !v)}
               className="flex w-full items-center justify-between gap-3 text-left"
            >
               <div className="flex items-center gap-3 min-w-0">
                  <div
                     className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm",
                        rankClass,
                     )}
                  >
                     #{candidate.rank}
                  </div>
                  <div className="min-w-0">
                     <p className="font-semibold text-sm">{fullName}</p>
                     {profile?.headline && (
                        <p className="text-sm text-muted-foreground truncate">
                           {profile.headline}
                        </p>
                     )}
                     {profile?.location && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                           {profile.location}
                        </p>
                     )}
                  </div>
               </div>
               <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Avg Score
                     </p>
                     <p
                        className="text-lg font-bold"
                        style={{ color: SCORE_COLOR(candidate.avgScore) }}
                     >
                        {candidate.avgScore}%
                     </p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Runs
                     </p>
                     <p className="text-sm font-bold">
                        {candidate.appearances}
                     </p>
                  </div>
                  {expanded ? (
                     <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                     <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
               </div>
            </button>
            {expanded && (
               <div className="mt-4 space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                     <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                        Score per run
                     </p>
                     <div className="flex flex-wrap gap-2">
                        {Object.entries(candidate.runScores).map(
                           ([runNum, score]) => (
                              <span
                                 key={runNum}
                                 className="text-xs px-2 py-0.5 rounded-full border font-mono"
                                 style={{
                                    color: SCORE_COLOR(score),
                                    borderColor: SCORE_COLOR(score) + "40",
                                 }}
                              >
                                 Run #{runNum}: {score}%
                              </span>
                           ),
                        )}
                     </div>
                  </div>
                  {candidate.avgCriteriaScores && (
                     <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                           Avg score breakdown
                        </p>
                        <div className="space-y-1.5">
                           {(
                              [
                                 "skills",
                                 "experience",
                                 "education",
                                 "projects",
                                 "availability",
                              ] as const
                           ).map((key) => {
                              const v = candidate.avgCriteriaScores![key] ?? 0;
                              const colors: Record<string, string> = {
                                 skills: "bg-violet-400",
                                 experience: "bg-blue-400",
                                 education: "bg-emerald-400",
                                 projects: "bg-amber-400",
                                 availability: "bg-rose-400",
                              };
                              return (
                                 <div
                                    key={key}
                                    className="flex items-center gap-2"
                                 >
                                    <span className="w-20 text-xs text-muted-foreground shrink-0 capitalize">
                                       {key}
                                    </span>
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                       <div
                                          className={cn(
                                             "h-full rounded-full",
                                             colors[key],
                                          )}
                                          style={{ width: `${v}%` }}
                                       />
                                    </div>
                                    <span className="text-xs font-mono tabular-nums w-7 text-right text-foreground/70">
                                       {v}
                                    </span>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                           <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                        </p>
                        <ul className="space-y-1">
                           {candidate.strengths.map((s, i) => (
                              <li
                                 key={i}
                                 className="text-sm text-muted-foreground flex gap-1.5"
                              >
                                 <span className="text-emerald-500 mt-0.5">
                                    •
                                 </span>
                                 {s}
                              </li>
                           ))}
                        </ul>
                     </div>
                     <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                           <AlertTriangle className="h-3.5 w-3.5" /> Gaps
                        </p>
                        <ul className="space-y-1">
                           {candidate.gaps.map((g, i) => (
                              <li
                                 key={i}
                                 className="text-sm text-muted-foreground flex gap-1.5"
                              >
                                 <span className="text-amber-500 mt-0.5">
                                    •
                                 </span>
                                 {g}
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>
                  <div className="rounded-md bg-primary/5 p-3">
                     <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" /> AI Recommendation
                     </p>
                     <p className="text-sm text-foreground leading-relaxed">
                        {candidate.recommendation}
                     </p>
                  </div>
               </div>
            )}
         </div>
      </Card>
   );
}

// ─── Combined result panel ────────────────────────────────────────────────────

function CombinedResultPanel({
   result,
   onClose,
}: {
   result: CombinedShortlistResult;
   onClose: () => void;
}) {
   const topAvg = result.candidates[0]?.avgScore ?? 0;
   const overallAvg =
      result.candidates.length > 0
         ? Math.round(
              result.candidates.reduce((s, c) => s + c.avgScore, 0) /
                 result.candidates.length,
           )
         : 0;
   return (
      <div className="space-y-4">
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
               {
                  label: "Runs combined",
                  value: result.totalRuns,
                  icon: GitMerge,
                  accent: "bg-primary/10 text-primary",
               },
               {
                  label: "Candidates",
                  value: result.candidates.length,
                  icon: Users,
                  accent: "bg-violet-100 text-violet-600",
               },
               {
                  label: "Top avg score",
                  value: `${topAvg}%`,
                  icon: Star,
                  accent: "bg-amber-100 text-amber-600",
               },
               {
                  label: "Overall avg",
                  value: `${overallAvg}%`,
                  icon: BarChart2,
                  accent: "bg-emerald-100 text-emerald-600",
               },
            ].map(({ label, value, icon: Icon, accent }) => (
               <Card key={label}>
                  <CardContent className="p-4">
                     <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                           {label}
                        </p>
                        <div
                           className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}
                        >
                           <Icon className="h-3.5 w-3.5" />
                        </div>
                     </div>
                     <p className="text-2xl font-bold tracking-tight">
                        {value}
                     </p>
                  </CardContent>
               </Card>
            ))}
         </div>
         <div className="flex items-center justify-between">
            <div>
               <p className="text-sm font-semibold">
                  Combined shortlist — runs #{result.runNumbers.join(", #")}
               </p>
               <p className="text-xs text-muted-foreground mt-0.5">
                  Scores averaged across {result.totalRuns} runs
               </p>
            </div>
            <Button
               variant="outline"
               size="sm"
               onClick={onClose}
            >
               Clear
            </Button>
         </div>
         <div className="space-y-3">
            {result.candidates.map((c) => (
               <CombinedCandidateCard
                  key={c.candidateId}
                  candidate={c}
               />
            ))}
         </div>
         <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
            <CardContent className="flex items-start gap-2.5 py-3">
               <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
               <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  <strong>Combined view:</strong> Scores are averaged across the
                  selected runs. Final decisions remain with the recruiter.
               </p>
            </CardContent>
         </Card>
      </div>
   );
}

// ─── Screening Panel ──────────────────────────────────────────────────────────

function ScreeningPanel({
   jobId,
   jobTitle,
   jobShortlistSize,
}: {
   jobId: string;
   jobTitle: string;
   jobShortlistSize?: number;
}) {
   const { toast } = useToast();
   const { data: settings } = useGetSettings();
   const { data: applicantsData } = useApplicants(jobId);
   const applicantCount = applicantsData?.meta.total ?? 0;
   const { data: result, isLoading: resultLoading } = useScreeningResult(jobId);
   const { data: history = [] } = useScreeningHistory(jobId);
   const triggerScreening = useTriggerScreening(jobId, applicantCount);
   const combineHistory = useCombineHistory(jobId);

   // Shortlist size: initialized from job setting, falls back to settings default
   const [shortlistSize, setShortlistSize] = useState<number>(
      jobShortlistSize ?? settings?.defaultShortlistSize ?? 10,
   );

   // Combine state
   const [combineMode, setCombineMode] = useState(false);
   const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
   const [combinedResult, setCombinedResult] =
      useState<CombinedShortlistResult | null>(null);
   const [combineStrategy, setCombineStrategy] = useState<
      "average" | "max" | "min"
   >(settings?.defaultCombineStrategy ?? "average");

   // Decision state
   const [decisions, setDecisions] = useState<
      Record<string, CandidateDecision>
   >({});
   const [autoOpenDialog, setAutoOpenDialog] = useState(false);

   const handleDecision = useCallback(
      (id: string, decision: CandidateDecision) => {
         setDecisions((prev) => ({ ...prev, [id]: decision }));
      },
      [],
   );

   const shortlist = result?.shortlist ?? [];

   const counts = useMemo(() => {
      let selected = 0,
         rejected = 0,
         pool = 0;
      for (const c of shortlist) {
         const d = decisions[c.candidateId] ?? "pending";
         if (d === "selected") selected++;
         else if (d === "rejected") rejected++;
         else if (d === "pool") pool++;
      }
      return { selected, rejected, pool, total: shortlist.length };
   }, [decisions, shortlist]);

   const totalRecommended = shortlist.length;

   function acceptTop(n: number) {
      const next: Record<string, CandidateDecision> = {};
      shortlist.forEach((c, i) => {
         next[c.candidateId] = i < n ? "selected" : "pending";
      });
      setDecisions((prev) => ({ ...prev, ...next }));
   }
   function acceptAllRecommended() {
      const next: Record<string, CandidateDecision> = {};
      shortlist.forEach((c) => {
         next[c.candidateId] = "selected";
      });
      setDecisions((prev) => ({ ...prev, ...next }));
   }
   function rejectUnselected() {
      const next: Record<string, CandidateDecision> = {};
      shortlist.forEach((c) => {
         const d = decisions[c.candidateId] ?? "pending";
         if (d !== "selected" && d !== "pool") next[c.candidateId] = "rejected";
      });
      setDecisions((prev) => ({ ...prev, ...next }));
   }
   function clearAll() {
      setDecisions({});
   }

   const selectedIds = shortlist
      .filter((c) => (decisions[c.candidateId] ?? "pending") === "selected")
      .map((c) => c.candidateId);
   const rejectedIds = shortlist
      .filter((c) => (decisions[c.candidateId] ?? "pending") === "rejected")
      .map((c) => c.candidateId);
   const poolIds = shortlist
      .filter((c) => (decisions[c.candidateId] ?? "pending") === "pool")
      .map((c) => c.candidateId);

   const toggleRunSelect = (id: string) => {
      setSelectedRunIds((prev) =>
         prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
   };

   const handleCombine = async () => {
      if (selectedRunIds.length < 2) {
         toast({
            title: "Select at least 2 runs to combine",
            variant: "destructive",
         });
         return;
      }
      try {
         const res = await combineHistory.mutateAsync({
            runIds: selectedRunIds,
            strategy: combineStrategy,
         });
         setCombinedResult(res);
         setCombineMode(false);
         setSelectedRunIds([]);
         const strategyLabel =
            combineStrategy === "max"
               ? "best score"
               : combineStrategy === "min"
                 ? "lowest score"
                 : "average score";
         toast({
            title: "✓ Combined shortlist ready",
            description: `${res.candidates.length} candidates ranked by ${strategyLabel}.`,
         });
      } catch (e: unknown) {
         const msg = e instanceof Error ? e.message : "Unknown error";
         toast({
            title: "Combine failed",
            description: msg,
            variant: "destructive",
         });
      }
   };

   const handleTrigger = async () => {
      try {
         await triggerScreening.mutateAsync({ shortlistSize });
         setDecisions({});
         setAutoOpenDialog(false);
         toast({
            title: "✓ Screening complete",
            description: "Gemini AI has ranked your applicants.",
         });
      } catch (e: unknown) {
         const msg = e instanceof Error ? e.message : "Unknown error";
         toast({
            title: "Screening failed",
            description: msg,
            variant: "destructive",
         });
      }
   };

   const barData = shortlist.map((c) => ({
      name: c.applicant?.profile
         ? `${c.applicant.profile.firstName} ${c.applicant.profile.lastName}`.split(
              " ",
           )[0]
         : `#${c.rank}`,
      score: c.matchScore,
      rank: c.rank,
   }));

   const topScore = barData[0]?.score ?? 0;
   const avgScore =
      barData.length > 0
         ? Math.round(barData.reduce((s, c) => s + c.score, 0) / barData.length)
         : 0;

   const defaultTab = combinedResult ? "combined" : "shortlist";

   return (
      <div className="space-y-5 mt-5">
         {result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
               {[
                  {
                     label: "Applicants",
                     value: result.totalApplicants,
                     icon: Users,
                     accent: "bg-primary/10 text-primary",
                  },
                  {
                     label: "Shortlisted",
                     value: result.shortlistSize,
                     icon: Trophy,
                     accent:
                        "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                  },
                  {
                     label: "Top Score",
                     value: `${topScore}%`,
                     icon: CheckCircle2,
                     accent:
                        "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                  },
                  {
                     label: "Avg Score",
                     value: `${avgScore}%`,
                     icon: BarChart2,
                     accent:
                        "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
                  },
               ].map(({ label, value, icon: Icon, accent }) => (
                  <Card key={label}>
                     <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                           <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {label}
                           </p>
                           <div
                              className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}
                           >
                              <Icon className="h-3.5 w-3.5" />
                           </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight">
                           {value}
                        </p>
                     </CardContent>
                  </Card>
               ))}
            </div>
         )}

         {/* ── AI Recommendations CTA ─────────────────────────────── */}
         {result && shortlist.length > 0 && (
            <Card className="border-primary/20 bg-linear-to-br from-primary/4 to-background">
               <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                     </div>
                     <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                           <p className="text-sm font-semibold">
                              Gemini AI ranked {shortlist.length} candidate
                              {shortlist.length !== 1 ? "s" : ""} for this
                              position
                           </p>
                           <Badge
                              variant="secondary"
                              className="text-xs font-mono"
                           >
                              {result.modelUsed}
                           </Badge>
                        </div>
                        {shortlist[0] && (
                           <p className="text-xs text-muted-foreground leading-relaxed">
                              <span className="text-foreground font-medium">
                                 #1&nbsp;·&nbsp;
                                 {shortlist[0].applicant?.profile
                                    ? `${shortlist[0].applicant.profile.firstName} ${shortlist[0].applicant.profile.lastName}`
                                    : "Top Candidate"}
                              </span>{" "}
                              scored{" "}
                              <span
                                 className="font-bold"
                                 style={{
                                    color: SCORE_COLOR(shortlist[0].matchScore),
                                 }}
                              >
                                 {shortlist[0].matchScore}%
                              </span>
                              {shortlist[0].recommendation && (
                                 <>
                                    {" "}
                                    —{" "}
                                    {shortlist[0].recommendation.length > 130
                                       ? shortlist[0].recommendation
                                            .slice(0, 130)
                                            .trimEnd() + "…"
                                       : shortlist[0].recommendation}
                                 </>
                              )}
                           </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 pt-0.5">
                           <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {counts.selected} selected
                           </span>
                           <span className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {counts.rejected} rejected
                           </span>
                           <span className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
                              <Star className="h-3.5 w-3.5" />
                              {counts.pool} talent pool
                           </span>
                           {counts.total -
                              counts.selected -
                              counts.rejected -
                              counts.pool >
                              0 && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                 <Users className="h-3.5 w-3.5" />
                                 {counts.total -
                                    counts.selected -
                                    counts.rejected -
                                    counts.pool}{" "}
                                 pending
                              </span>
                           )}
                        </div>
                     </div>
                     <div className="shrink-0 w-full sm:w-auto">
                        {counts.selected === 0 ? (
                           <p className="text-xs text-amber-700 font-medium bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 leading-relaxed">
                              Review candidates below, then click{" "}
                              <strong>Finalize</strong>
                           </p>
                        ) : (
                           <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-xs gap-1.5 px-3 py-1.5">
                              <CheckCircle2 className="h-3 w-3" />
                              {counts.selected} ready to finalize
                           </Badge>
                        )}
                     </div>
                  </div>
               </CardContent>
            </Card>
         )}

         <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-3 gap-6">
            <div className="space-y-4">
               <ScreeningTrigger
                  applicantCount={applicantCount}
                  shortlistSize={shortlistSize}
                  hasResult={!!result}
                  isPending={triggerScreening.isPending}
                  onTrigger={handleTrigger}
                  onShortlistSizeChange={setShortlistSize}
                  jobDefaultShortlistSize={jobShortlistSize}
               />
               {result && (
                  <Card>
                     <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                           <Bot className="h-4 w-4 text-primary" /> Run Details
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-2.5 text-sm">
                        {[
                           {
                              label: "Model",
                              value: (
                                 <Badge
                                    variant="secondary"
                                    className="text-xs font-mono"
                                 >
                                    {result.modelUsed}
                                 </Badge>
                              ),
                           },
                           {
                              label: "Screened",
                              value: `${result?.totalApplicants} applicants`,
                           },
                           {
                              label: "Shortlisted",
                              value: `${result?.shortlist?.length} candidates`,
                           },
                           {
                              label: "Run at",
                              value: result?.screenedAt
                                 ? format(
                                      new Date(result.screenedAt),
                                      "d MMM yyyy, HH:mm",
                                   )
                                 : "—",
                           },
                        ].map(({ label, value }) => (
                           <div
                              key={label}
                              className="flex items-center justify-between"
                           >
                              <span className="text-muted-foreground text-xs">
                                 {label}
                              </span>
                              <span className="text-xs font-medium">
                                 {value}
                              </span>
                           </div>
                        ))}
                     </CardContent>
                  </Card>
               )}
               {barData.length > 0 && (
                  <Card>
                     <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Match Scores</CardTitle>
                     </CardHeader>
                     <CardContent className="pt-0 pl-0">
                        <ResponsiveContainer
                           width="100%"
                           height={Math.min(barData.length * 28 + 20, 400)}
                        >
                           <BarChart
                              data={barData}
                              layout="vertical"
                              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                           >
                              <XAxis
                                 type="number"
                                 domain={[0, 100]}
                                 tick={{ fontSize: 10 }}
                                 tickLine={false}
                                 axisLine={false}
                              />
                              <YAxis
                                 type="category"
                                 dataKey="name"
                                 tick={{ fontSize: 11 }}
                                 width={52}
                                 axisLine={false}
                                 tickLine={false}
                              />
                              <Tooltip
                                 cursor={{ fill: "hsl(var(--muted))" }}
                                 contentStyle={{
                                    fontSize: 12,
                                    borderRadius: 8,
                                 }}
                                 formatter={(v: number) => [
                                    `${v}/100`,
                                    "Score",
                                 ]}
                              />
                              <Bar
                                 dataKey="score"
                                 radius={[0, 4, 4, 0]}
                              >
                                 {barData.map((entry, i) => (
                                    <Cell
                                       key={`cell-${i}`}
                                       fill={SCORE_COLOR(entry.score)}
                                    />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </CardContent>
                  </Card>
               )}
               {!result && !resultLoading && (
                  <Card className="bg-muted/40 border-dashed">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                           How AI Screening Works
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-3">
                        {[
                           {
                              icon: FileText,
                              step: "1",
                              text: "Job requirements sent to Gemini",
                           },
                           {
                              icon: Users,
                              step: "2",
                              text: "Applicants processed in batches of 25",
                           },
                           {
                              icon: BarChart2,
                              step: "3",
                              text: "Weighted scoring across all batches",
                           },
                           {
                              icon: Sparkles,
                              step: "4",
                              text: "Global top-N shortlist with explanations",
                           },
                        ].map(({ icon: Icon, step, text }) => (
                           <div
                              key={step}
                              className="flex items-start gap-2.5"
                           >
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                 {step}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                                 {text}
                              </p>
                           </div>
                        ))}
                     </CardContent>
                  </Card>
               )}
            </div>

            <div className="md:col-span-1 lg:col-span-2">
               <Tabs defaultValue={defaultTab}>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                     <TabsList>
                        <TabsTrigger
                           value="shortlist"
                           className="gap-1.5"
                        >
                           <Trophy className="h-3.5 w-3.5" /> Shortlist
                           {result && (
                              <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                                 {result?.shortlist?.length}
                              </span>
                           )}
                        </TabsTrigger>
                        <TabsTrigger
                           value="history"
                           className="gap-1.5"
                        >
                           <History className="h-3.5 w-3.5" /> History
                           {history.length > 0 && (
                              <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-1.5">
                                 {history.length}
                              </span>
                           )}
                        </TabsTrigger>
                        {combinedResult && (
                           <TabsTrigger
                              value="combined"
                              className="gap-1.5"
                           >
                              <GitMerge className="h-3.5 w-3.5" /> Combined
                              <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                                 {combinedResult.candidates.length}
                              </span>
                           </TabsTrigger>
                        )}
                     </TabsList>
                     {result && (
                        <Badge
                           variant="secondary"
                           className="text-xs gap-1"
                        >
                           <Bot className="h-3 w-3" /> Gemini AI
                        </Badge>
                     )}
                  </div>

                  <TabsContent
                     value="shortlist"
                     className="space-y-3 mt-0"
                  >
                     {triggerScreening.isPending ? (
                        <div className="space-y-3">
                           <Card className="border-primary/30 bg-primary/5">
                              <CardContent className="flex items-center gap-3 py-4">
                                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                                    <Bot className="h-5 w-5 text-primary" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium">
                                       Gemini AI is analyzing applicants…
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                       Processing
                                    </p>
                                 </div>
                              </CardContent>
                           </Card>
                           {Array.from({ length: 3 }).map((_, i) => (
                              <div
                                 key={i}
                                 className="h-28 rounded-xl border bg-muted animate-pulse"
                              />
                           ))}
                        </div>
                     ) : resultLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                           <div
                              key={i}
                              className="h-28 rounded-xl border bg-muted animate-pulse"
                           />
                        ))
                     ) : shortlist.length ? (
                        <>
                           <BulkDecisionToolbar
                              counts={counts}
                              totalRecommended={totalRecommended}
                              onAcceptTop={acceptTop}
                              onAcceptAllRecommended={acceptAllRecommended}
                              onRejectAll={rejectUnselected}
                              onClearAll={clearAll}
                              onFinalize={() => setAutoOpenDialog(true)}
                              disableFinalize={counts.selected === 0}
                           />
                           {shortlist.length > 5 && (
                              <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2 text-xs text-muted-foreground shadow-sm">
                                 <span className="font-medium text-foreground">
                                    {shortlist.length} candidates ranked
                                 </span>
                                 <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                       <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                       ≥80%
                                    </span>
                                    <span className="flex items-center gap-1">
                                       <span className="h-2 w-2 rounded-full bg-amber-400" />
                                       60–79%
                                    </span>
                                    <span className="flex items-center gap-1">
                                       <span className="h-2 w-2 rounded-full bg-blue-500" />
                                       &lt;60%
                                    </span>
                                 </div>
                              </div>
                           )}
                           <div className="space-y-2">
                              {shortlist.map((candidate) => (
                                 <CandidateReviewRow
                                    key={candidate.candidateId}
                                    candidate={candidate}
                                    decision={
                                       decisions[candidate.candidateId] ??
                                       "pending"
                                    }
                                    onDecision={handleDecision}
                                    jobId={jobId}
                                 />
                              ))}
                           </div>
                           <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                              <CardContent className="flex items-start gap-2.5 py-3">
                                 <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                 <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                    <strong>Human-in-the-loop:</strong> AI
                                    rankings are recommendations only. Final
                                    hiring decisions remain with the recruiter.
                                 </p>
                              </CardContent>
                           </Card>

                           {/* ── Final Shortlist & Email Triggers ─────── */}
                           <div className="pt-1">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                 Final Shortlist &amp; Actions
                              </p>
                              <FinalizationPanel
                                 jobId={jobId}
                                 jobTitle={jobTitle}
                                 shortlist={shortlist}
                                 preSelectedIds={selectedIds}
                                 preRejectedIds={rejectedIds}
                                 preTalentPoolIds={poolIds}
                                 openDialogImmediately={autoOpenDialog}
                                 onDialogClose={() => setAutoOpenDialog(false)}
                              />
                           </div>
                        </>
                     ) : (
                        <Card className="border-dashed">
                           <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                                 <Sparkles className="h-8 w-8 text-primary" />
                              </div>
                              <div>
                                 <p className="font-semibold">No results yet</p>
                                 <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                    {applicantCount === 0
                                       ? "Add applicants to this job first, then run AI screening."
                                       : `${applicantCount} applicant${applicantCount > 1 ? "s" : ""} ready. Click "Run Screening" to rank them.`}
                                 </p>
                              </div>
                              {applicantCount === 0 && (
                                 <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                 >
                                    <Link href="/applicants">
                                       <Users className="h-4 w-4 mr-1.5" /> Add
                                       Applicants
                                    </Link>
                                 </Button>
                              )}
                           </CardContent>
                        </Card>
                     )}
                  </TabsContent>

                  <TabsContent
                     value="history"
                     className="mt-0"
                  >
                     {history.length === 0 ? (
                        <Card className="border-dashed">
                           <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                                 <History className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <p className="font-semibold">No history yet</p>
                              <p className="text-sm text-muted-foreground">
                                 Run a screening to start building your history.
                              </p>
                           </CardContent>
                        </Card>
                     ) : (
                        <div className="space-y-3">
                           {history.length >= 2 && (
                              <div
                                 className={cn(
                                    "rounded-xl border p-3 space-y-3 transition-all",
                                    combineMode
                                       ? "bg-primary/3 border-primary/30"
                                       : "bg-muted/30",
                                 )}
                              >
                                 <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                       <GitMerge className="h-4 w-4 text-primary" />
                                       <div>
                                          <p className="text-sm font-semibold">
                                             Combine runs
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                             Average scores across multiple runs
                                             for a more reliable shortlist
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                       {combineMode ? (
                                          <>
                                             <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                   setCombineMode(false);
                                                   setSelectedRunIds([]);
                                                }}
                                             >
                                                Cancel
                                             </Button>
                                             <Button
                                                size="sm"
                                                onClick={handleCombine}
                                                disabled={
                                                   selectedRunIds.length < 2 ||
                                                   combineHistory.isPending
                                                }
                                                className="gap-1.5"
                                             >
                                                {combineHistory.isPending ? (
                                                   <>
                                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                                                      Combining…
                                                   </>
                                                ) : (
                                                   <>
                                                      <GitMerge className="h-3.5 w-3.5" />{" "}
                                                      Combine{" "}
                                                      {selectedRunIds.length > 0
                                                         ? `(${selectedRunIds.length})`
                                                         : ""}
                                                   </>
                                                )}
                                             </Button>
                                          </>
                                       ) : (
                                          <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={() =>
                                                setCombineMode(true)
                                             }
                                             className="gap-1.5"
                                          >
                                             <Layers className="h-3.5 w-3.5" />{" "}
                                             Select runs to combine
                                          </Button>
                                       )}
                                    </div>
                                 </div>
                                 {combineMode && (
                                    <div className="space-y-2">
                                       <p className="text-xs text-muted-foreground">
                                          Select at least 2 runs below, then
                                          click Combine.
                                       </p>
                                       <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs text-muted-foreground mr-1">
                                             Strategy:
                                          </span>
                                          {(
                                             [
                                                {
                                                   value: "average",
                                                   label: "Average",
                                                },
                                                {
                                                   value: "max",
                                                   label: "Best Score",
                                                },
                                                {
                                                   value: "min",
                                                   label: "Conservative",
                                                },
                                             ] as const
                                          ).map(({ value, label }) => (
                                             <button
                                                key={value}
                                                onClick={() =>
                                                   setCombineStrategy(value)
                                                }
                                                className={cn(
                                                   "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                                   combineStrategy === value
                                                      ? "bg-violet-600 text-white border-violet-600"
                                                      : "border-input text-muted-foreground hover:bg-muted",
                                                )}
                                             >
                                                {label}
                                             </button>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           )}
                           <div className="space-y-2.5">
                              {history.map((run) => (
                                 <HistoryRunCard
                                    key={run._id}
                                    run={run}
                                    jobId={jobId}
                                    isSelected={selectedRunIds.includes(
                                       run._id,
                                    )}
                                    onToggleSelect={toggleRunSelect}
                                    showCheckbox={combineMode}
                                 />
                              ))}
                           </div>
                           <p className="text-center text-xs text-muted-foreground pt-1">
                              {history.length} run
                              {history.length !== 1 ? "s" : ""} · Click any run
                              to expand candidate details
                           </p>
                        </div>
                     )}
                  </TabsContent>

                  {combinedResult && (
                     <TabsContent
                        value="combined"
                        className="mt-0"
                     >
                        <CombinedResultPanel
                           result={combinedResult}
                           onClose={() => setCombinedResult(null)}
                        />
                     </TabsContent>
                  )}
               </Tabs>
            </div>
         </div>
      </div>
   );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScreeningIndexPage() {
   const { data, isLoading: jobsLoading } = useJobs({ limit: 100 });
   const jobs = data?.items ?? [];
   const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
   const selectedJob = jobs.find((j) => j._id === selectedJobId);

   if (jobs.length > 0 && !selectedJobId) setSelectedJobId(jobs[0]._id);

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title="AI Screening" />
         <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
               <div>
                  <h1 className="text-base font-semibold">
                     AI Candidate Screening
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                     Select a job position, then trigger Gemini AI to rank and
                     shortlist your applicants. Review candidates inline —
                     select, reject, or add to the talent pool, then finalize.
                  </p>
               </div>
               <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                     Select Position
                  </p>
                  {jobsLoading ? (
                     <div className="h-16 rounded-xl border bg-muted animate-pulse" />
                  ) : jobs.length === 0 ? (
                     <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                           <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <Briefcase className="h-7 w-7 text-primary" />
                           </div>
                           <div>
                              <p className="font-semibold">No jobs yet</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                 Create a job and add applicants to start
                                 screening.
                              </p>
                           </div>
                           <Button
                              asChild
                              size="sm"
                           >
                              <Link href="/jobs/new">
                                 <Plus className="h-4 w-4 mr-1" /> Create Job
                              </Link>
                           </Button>
                        </CardContent>
                     </Card>
                  ) : (
                     <JobSelector
                        jobs={jobs}
                        selectedId={selectedJobId}
                        onChange={setSelectedJobId}
                        isLoading={jobsLoading}
                     />
                  )}
               </div>
               {selectedJobId && (
                  <ScreeningPanel
                     key={selectedJobId}
                     jobId={selectedJobId}
                     jobTitle={selectedJob?.title ?? ""}
                     jobShortlistSize={selectedJob?.shortlistSize}
                  />
               )}
            </div>
         </main>
      </div>
   );
}
