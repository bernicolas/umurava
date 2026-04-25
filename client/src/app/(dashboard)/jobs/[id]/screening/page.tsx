"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
   ArrowLeft,
   Bot,
   Clock,
   Users,
   Sparkles,
   FileText,
   BarChart2,
   Trophy,
   CheckCircle2,
   AlertTriangle,
   History,
   TrendingUp,
   BrainCircuit,
   Layers,
   ListOrdered,
   Wand2,
   Loader2,
   ShieldCheck,
   Zap,
   ChevronDown,
   ChevronUp,
   Boxes,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApplicants } from "@/services/applicant.service";
import {
   useScreeningResult,
   useScreeningHistory,
   useTriggerScreening,
   useHistoryRunDetail,
} from "@/services/screening.service";
import { useGetSettings } from "@/services/settings.service";
import { useJob } from "@/services/job.service";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ActivityEmailPanel } from "@/components/features/shortlists/ActivityEmailPanel";

const SCORE_COLOR = (score: number) => {
   if (score >= 80) return "hsl(142 71% 45%)";
   if (score >= 60) return "hsl(38 92% 50%)";
   return "hsl(222 89% 54%)";
};

// ─── Batch progress state (driven by SSE) ────────────────────────────────────

interface BatchProgressState {
   batchNumber: number;
   totalBatches: number;
   processedApplicants: number;
   totalApplicants: number;
}

// ─── Stage definitions ────────────────────────────────────────────────────────

const PRE_STAGES = [
   {
      id: 0,
      icon: BrainCircuit,
      label: "Connecting to Gemini AI",
      detail: "Establishing secure connection",
      durationMs: 1200,
   },
   {
      id: 1,
      icon: FileText,
      label: "Reading job requirements",
      detail: "Parsing role, skills, and expectations",
      durationMs: 2000,
   },
   {
      id: 2,
      icon: Layers,
      label: "Preparing batches",
      detail: "Splitting applicants into groups of 15",
      durationMs: 1500,
   },
] as const;

const POST_STAGES = [
   {
      id: 98,
      icon: ListOrdered,
      label: "Merging & ranking globally",
      detail: "Sorting all scores — best candidates first",
      durationMs: 2000,
   },
   {
      id: 99,
      icon: Wand2,
      label: "Finalising shortlist",
      detail: "Preparing your results…",
      durationMs: 99999,
   },
] as const;

type StagePhase = "pre" | "batching" | "post";

interface ProgressDisplayState {
   phase: StagePhase;
   preStageIndex: number;
   postStageIndex: number;
   batchProgress: BatchProgressState | null;
}

function useScreeningProgressDisplay(
   isRunning: boolean,
   sseBatch: BatchProgressState | null,
): ProgressDisplayState {
   const [state, setState] = useState<ProgressDisplayState>({
      phase: "pre",
      preStageIndex: 0,
      postStageIndex: 0,
      batchProgress: null,
   });
   const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const prevBatch = useRef<BatchProgressState | null>(null);

   useEffect(() => {
      if (!isRunning) {
         setState({
            phase: "pre",
            preStageIndex: 0,
            postStageIndex: 0,
            batchProgress: null,
         });
         if (timerRef.current) clearTimeout(timerRef.current);
         prevBatch.current = null;
         return;
      }
      let idx = 0;
      function advancePre() {
         if (idx < PRE_STAGES.length - 1) {
            timerRef.current = setTimeout(() => {
               idx++;
               setState((prev) =>
                  prev.phase === "pre" ? { ...prev, preStageIndex: idx } : prev,
               );
               advancePre();
            }, PRE_STAGES[idx]!.durationMs);
         }
      }
      advancePre();
      return () => {
         if (timerRef.current) clearTimeout(timerRef.current);
      };
   }, [isRunning]);

   useEffect(() => {
      if (!isRunning || !sseBatch) return;
      if (prevBatch.current?.batchNumber === sseBatch.batchNumber) return;
      prevBatch.current = sseBatch;

      setState((prev) => ({
         ...prev,
         phase: "batching",
         batchProgress: sseBatch,
      }));

      if (sseBatch.batchNumber >= sseBatch.totalBatches) {
         if (timerRef.current) clearTimeout(timerRef.current);
         timerRef.current = setTimeout(() => {
            setState((prev) => ({ ...prev, phase: "post", postStageIndex: 0 }));
            let pidx = 0;
            function advancePost() {
               if (pidx < POST_STAGES.length - 1) {
                  timerRef.current = setTimeout(() => {
                     pidx++;
                     setState((prev) => ({ ...prev, postStageIndex: pidx }));
                     advancePost();
                  }, POST_STAGES[pidx]!.durationMs);
               }
            }
            advancePost();
         }, 600);
      }
   }, [isRunning, sseBatch]);

   return state;
}

function ThinkingDots() {
   return (
      <span className="inline-flex gap-0.5 ml-1">
         {[0, 1, 2].map((i) => (
            <span
               key={i}
               className="inline-block h-1 w-1 rounded-full bg-current animate-bounce"
               style={{ animationDelay: `${i * 150}ms` }}
            />
         ))}
      </span>
   );
}

// ─── Progress panel ───────────────────────────────────────────────────────────

function ScreeningProgressPanel({
   progressState,
   applicantCount,
   settings,
   jobTitle,
}: {
   progressState: ProgressDisplayState;
   applicantCount: number;
   settings?: import("@/types").ScreeningConfig;
   jobTitle?: string;
}) {
   const { phase, preStageIndex, postStageIndex, batchProgress } =
      progressState;
   const weights = settings?.scoringWeights;
   const minScore = settings?.minScoreThreshold ?? 0;
   const preferImmediate = settings?.preferImmediateAvailability ?? false;

   let pct: number;
   if (phase === "pre")
      pct = Math.round(((preStageIndex + 1) / PRE_STAGES.length) * 20);
   else if (phase === "batching")
      pct =
         20 +
         Math.round(
            (batchProgress
               ? batchProgress.batchNumber / batchProgress.totalBatches
               : 0) * 65,
         );
   else pct = 85 + Math.round(((postStageIndex + 1) / POST_STAGES.length) * 15);
   pct = Math.min(99, pct);

   const activeLabel =
      phase === "pre"
         ? PRE_STAGES[preStageIndex]!.label
         : phase === "batching"
           ? `Scoring batch ${batchProgress?.batchNumber ?? "?"} of ${batchProgress?.totalBatches ?? "?"}`
           : POST_STAGES[postStageIndex]!.label;

   const activeDetail =
      phase === "pre"
         ? PRE_STAGES[preStageIndex]!.detail
         : phase === "batching"
           ? `${batchProgress?.processedApplicants ?? 0} / ${batchProgress?.totalApplicants ?? applicantCount} applicants scored`
           : POST_STAGES[postStageIndex]!.detail;

   return (
      <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-12rem)] py-12 px-4">
         <div className="w-full max-w-xl mx-auto space-y-8">
            <div className="flex flex-col items-center gap-5">
               <div className="relative flex items-center justify-center">
                  <span
                     className="absolute h-28 w-28 rounded-full bg-primary/8 animate-ping"
                     style={{ animationDuration: "2.5s" }}
                  />
                  <span
                     className="absolute h-22 w-22 rounded-full bg-primary/10 animate-ping"
                     style={{ animationDuration: "2s", animationDelay: "0.3s" }}
                  />
                  <span
                     className="absolute h-24 w-24 rounded-full border-2 border-transparent border-t-primary animate-spin"
                     style={{ animationDuration: "1.1s" }}
                  />
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                     <BrainCircuit className="h-8 w-8 text-primary" />
                  </div>
               </div>
               <div className="text-center space-y-1.5">
                  <h2 className="text-lg font-bold text-foreground">
                     Gemini AI is analysing {applicantCount} applicant
                     {applicantCount !== 1 ? "s" : ""}
                     <ThinkingDots />
                  </h2>
                  {jobTitle && (
                     <p className="text-sm text-muted-foreground">
                        Finding the best fits for{" "}
                        <span className="font-medium text-foreground">
                           {jobTitle}
                        </span>
                     </p>
                  )}
                  {phase === "batching" && (
                     <p className="text-xs text-primary font-medium">
                        Processing in batches for maximum accuracy
                     </p>
                  )}
               </div>
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                     {activeLabel}
                  </span>
                  <span className="tabular-nums">{pct}%</span>
               </div>
               <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                     className="h-full bg-primary rounded-full transition-all duration-700 ease-in-out"
                     style={{ width: `${pct}%` }}
                  />
               </div>
               <p className="text-xs text-muted-foreground">{activeDetail}</p>
            </div>

            {phase === "batching" &&
               batchProgress &&
               batchProgress.totalBatches > 1 && (
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                     <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
                           <Boxes className="h-3.5 w-3.5" /> Batch progress
                        </p>
                        <span className="text-xs text-muted-foreground tabular-nums">
                           {batchProgress.batchNumber} /{" "}
                           {batchProgress.totalBatches} batches
                        </span>
                     </div>
                     <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: batchProgress.totalBatches }).map(
                           (_, i) => {
                              const n = i + 1;
                              const done = n < batchProgress.batchNumber;
                              const active = n === batchProgress.batchNumber;
                              return (
                                 <div
                                    key={n}
                                    title={`Batch ${n}`}
                                    className={cn(
                                       "h-6 w-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-all",
                                       done &&
                                          "bg-emerald-100 text-emerald-600 border border-emerald-200",
                                       active &&
                                          "bg-primary text-primary-foreground animate-pulse",
                                       !done &&
                                          !active &&
                                          "bg-muted text-muted-foreground/50 border border-border",
                                    )}
                                 >
                                    {done ? "✓" : n}
                                 </div>
                              );
                           },
                        )}
                     </div>
                     <div>
                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                           <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{
                                 width: `${(batchProgress.processedApplicants / batchProgress.totalApplicants) * 100}%`,
                              }}
                           />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                           {batchProgress.processedApplicants} of{" "}
                           {batchProgress.totalApplicants} applicants scored
                        </p>
                     </div>
                  </div>
               )}

            <div className="rounded-xl border bg-muted/20 divide-y overflow-hidden">
               {PRE_STAGES.map((stage, idx) => {
                  const Icon = stage.icon;
                  const done = phase !== "pre" || idx < preStageIndex;
                  const active = phase === "pre" && idx === preStageIndex;
                  const pending = phase === "pre" && idx > preStageIndex;
                  return (
                     <div
                        key={stage.id}
                        className={cn(
                           "flex items-center gap-3 px-4 py-2.5 transition-colors",
                           active && "bg-primary/[0.04]",
                           pending && "opacity-40",
                        )}
                     >
                        <div
                           className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              done && "bg-emerald-100 text-emerald-600",
                              active && "bg-primary/15 text-primary",
                              pending && "bg-muted text-muted-foreground",
                           )}
                        >
                           {done ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                           ) : active ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                           ) : (
                              <Icon className="h-3 w-3" />
                           )}
                        </div>
                        <span
                           className={cn(
                              "text-sm",
                              done &&
                                 "text-emerald-700 line-through decoration-emerald-300",
                              active && "text-foreground font-medium",
                              pending && "text-muted-foreground",
                           )}
                        >
                           {stage.label}
                        </span>
                        {done && (
                           <span className="ml-auto text-xs text-emerald-600 font-medium">
                              Done
                           </span>
                        )}
                        {active && (
                           <span className="ml-auto">
                              <ThinkingDots />
                           </span>
                        )}
                     </div>
                  );
               })}

               {(() => {
                  const done = phase === "post";
                  const active = phase === "batching";
                  const pending = phase === "pre";
                  return (
                     <div
                        className={cn(
                           "flex items-center gap-3 px-4 py-2.5 transition-colors",
                           active && "bg-primary/[0.04]",
                           pending && "opacity-40",
                        )}
                     >
                        <div
                           className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              done && "bg-emerald-100 text-emerald-600",
                              active && "bg-primary/15 text-primary",
                              pending && "bg-muted text-muted-foreground",
                           )}
                        >
                           {done ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                           ) : active ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                           ) : (
                              <Boxes className="h-3 w-3" />
                           )}
                        </div>
                        <span
                           className={cn(
                              "text-sm",
                              done &&
                                 "text-emerald-700 line-through decoration-emerald-300",
                              active && "text-foreground font-medium",
                              pending && "text-muted-foreground",
                           )}
                        >
                           {active && batchProgress
                              ? `Scoring batch ${batchProgress.batchNumber} of ${batchProgress.totalBatches}`
                              : "Scoring all applicants in batches"}
                        </span>
                        {done && (
                           <span className="ml-auto text-xs text-emerald-600 font-medium">
                              Done
                           </span>
                        )}
                        {active && batchProgress && (
                           <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                              {batchProgress.batchNumber}/
                              {batchProgress.totalBatches}
                           </span>
                        )}
                     </div>
                  );
               })()}

               {POST_STAGES.map((stage, idx) => {
                  const Icon = stage.icon;
                  const done = phase === "post" && idx < postStageIndex;
                  const active = phase === "post" && idx === postStageIndex;
                  const pending = phase !== "post" || idx > postStageIndex;
                  return (
                     <div
                        key={stage.id}
                        className={cn(
                           "flex items-center gap-3 px-4 py-2.5 transition-colors",
                           active && "bg-primary/[0.04]",
                           !done && pending && phase !== "post" && "opacity-40",
                        )}
                     >
                        <div
                           className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              done && "bg-emerald-100 text-emerald-600",
                              active && "bg-primary/15 text-primary",
                              pending && "bg-muted text-muted-foreground",
                           )}
                        >
                           {done ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                           ) : active ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                           ) : (
                              <Icon className="h-3 w-3" />
                           )}
                        </div>
                        <span
                           className={cn(
                              "text-sm",
                              done &&
                                 "text-emerald-700 line-through decoration-emerald-300",
                              active && "text-foreground font-medium",
                              pending && "text-muted-foreground",
                           )}
                        >
                           {stage.label}
                        </span>
                        {done && (
                           <span className="ml-auto text-xs text-emerald-600 font-medium">
                              Done
                           </span>
                        )}
                        {active && (
                           <span className="ml-auto">
                              <ThinkingDots />
                           </span>
                        )}
                     </div>
                  );
               })}
            </div>

            {settings && (
               <div className="rounded-xl border border-dashed p-3 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                     Screening with your settings
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                     {weights && (
                        <>
                           <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-mono border border-violet-200">
                              Skills {weights.skills}%
                           </span>
                           <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono border border-blue-200">
                              Exp {weights.experience}%
                           </span>
                           <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-mono border border-emerald-200">
                              Edu {weights.education}%
                           </span>
                           <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-mono border border-amber-200">
                              Projects {weights.projects}%
                           </span>
                           <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-mono border border-rose-200">
                              Avail {weights.availability}%
                           </span>
                        </>
                     )}
                     {minScore > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                           <ShieldCheck className="h-2.5 w-2.5" /> Min score{" "}
                           {minScore}%
                        </span>
                     )}
                     {preferImmediate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                           <Zap className="h-2.5 w-2.5" /> Prefer immediate
                        </span>
                     )}
                  </div>
               </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
               {applicantCount > 15
                  ? `Processing ${Math.ceil(applicantCount / 15)} batches — est. ${Math.ceil(applicantCount / 15) * 1}–${Math.ceil(applicantCount / 15) * 1.5}min`
                  : "This usually takes 45–85 seconds"}
            </p>
         </div>
      </div>
   );
}

// ─── History run card ─────────────────────────────────────────────────────────

function HistoryRunCard({
   run,
   jobId,
   isLatest,
}: {
   run: import("@/types").ScreeningHistoryEntry;
   jobId: string;
   isLatest: boolean;
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
         )}
      >
         <button
            onClick={() => setOpen((v) => !v)}
            className="w-full text-left"
         >
            <div className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors rounded-xl">
               <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                     <p className="text-sm font-semibold">
                        Run #{run.runNumber}
                     </p>
                     {isLatest && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                           Latest
                        </span>
                     )}
                     <Badge
                        variant="secondary"
                        className="text-xs font-mono"
                     >
                        {run.modelUsed}
                     </Badge>
                     {run.totalBatches && run.totalBatches > 1 && (
                        <Badge
                           variant="outline"
                           className="text-xs gap-1 text-muted-foreground"
                        >
                           <Boxes className="h-2.5 w-2.5" /> {run.totalBatches}{" "}
                           batches
                        </Badge>
                     )}
                  </div>
                  {run?.screenedAt && (
                     <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        {format(
                           new Date(run.screenedAt),
                           "d MMM yyyy 'at' HH:mm",
                        )}
                     </p>
                  )}
               </div>
               <div className="flex items-center gap-4 shrink-0 text-right">
                  <div className="hidden sm:block">
                     <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Screened
                     </p>
                     <p className="text-sm font-bold">{run.totalApplicants}</p>
                  </div>
                  <div>
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
                  <div className="text-muted-foreground">
                     {open ? (
                        <ChevronUp className="h-4 w-4" />
                     ) : (
                        <ChevronDown className="h-4 w-4" />
                     )}
                  </div>
               </div>
            </div>
         </button>

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScreeningPage() {
   const { id } = useParams<{ id: string }>();
   const { toast } = useToast();
   const { notifications } = useNotifications();

   const { data: job } = useJob(id);
   const { data: applicantsData } = useApplicants(id);
   const { data: settings } = useGetSettings();

   const isRunning = job?.screeningStatus === "running";
   const applicantCount = applicantsData?.meta.total ?? 0;
   const { data: result, isLoading: resultLoading } = useScreeningResult(id);
   const { data: history = [] } = useScreeningHistory(id);
   const triggerScreening = useTriggerScreening(id, applicantCount);

   const [sseBatch, setSseBatch] = useState<BatchProgressState | null>(null);

   // AFTER
   const qc = useQueryClient(); //

   useEffect(() => {
      if (!isRunning) setSseBatch(null);
   }, [isRunning]);

   useEffect(() => {
      // Batch progress — update the progress panel
      const latestBatch = notifications.findLast(
         (n) => n.type === "screening_batch_progress" && n.jobId === id,
      );
      if (latestBatch?.batchNumber && latestBatch?.totalBatches) {
         setSseBatch({
            batchNumber: latestBatch.batchNumber,
            totalBatches: latestBatch.totalBatches,
            processedApplicants: latestBatch.processedApplicants ?? 0,
            totalApplicants:
               latestBatch.totalApplicants ?? applicantsData?.meta.total ?? 0,
         });
      }

      // Screening done — flip the UI immediately without waiting for the poll cycle
      const doneSeen = notifications.some(
         (n) => n.type === "screening_done" && n.jobId === id,
      );
      if (doneSeen) {
         qc.invalidateQueries({ queryKey: ["jobs", id] });
         qc.invalidateQueries({ queryKey: ["screening", id] });
         qc.invalidateQueries({ queryKey: ["screening-history", id] });
      }
   }, [notifications, id, applicantsData?.meta.total, qc]);

   const progressState = useScreeningProgressDisplay(isRunning, sseBatch);

   const shortlistSize = job?.shortlistSize ?? 10;

   const handleTrigger = async () => {
      setSseBatch(null);
      try {
         await triggerScreening.mutateAsync();
         toast({
            title: "✓ Screening started",
            description:
               "Gemini AI is analyzing your applicants. You'll be notified when complete.",
         });
      } catch (e: unknown) {
         const msg = e instanceof Error ? e.message : "Unknown error";
         toast({
            title: "Failed to start screening",
            description: msg,
            variant: "destructive",
         });
      }
   };

   const barData =
      result?.shortlist?.map((c) => ({
         name: c.applicant?.profile
            ? `${c.applicant.profile.firstName} ${c.applicant.profile.lastName}`.split(
                 " ",
              )[0]
            : `#${c.rank}`,
         score: c.matchScore,
         rank: c.rank,
      })) ?? [];

   const topScore = barData[0]?.score ?? 0;
   const avgScore =
      barData.length > 0
         ? Math.round(barData.reduce((s, c) => s + c.score, 0) / barData.length)
         : 0;

   const chartHeight = Math.min(barData.length * 28 + 20, 400);

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title="AI Screening" />
         <main className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
               <div className="flex items-center gap-3">
                  <Button
                     variant="ghost"
                     size="sm"
                     asChild
                  >
                     <Link href={`/jobs/${id}`}>
                        <ArrowLeft className="h-4 w-4 mr-1" />{" "}
                        {job?.title ?? "Back"}
                     </Link>
                  </Button>
                  {result?.screenedAt && !isRunning && (
                     <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Screened{" "}
                        {format(
                           new Date(result?.screenedAt),
                           "MMM d, yyyy 'at' h:mm a",
                        )}
                     </span>
                  )}
                  {isRunning && (
                     <Badge
                        variant="secondary"
                        className="gap-1"
                     >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Screening in progress...
                     </Badge>
                  )}
               </div>
               {job && (
                  <Link href={`/jobs/${id}/applicants`}>
                     <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                     >
                        <Users className="h-3.5 w-3.5" /> Manage Applicants
                     </Button>
                  </Link>
               )}
            </div>

            {isRunning && (
               <ScreeningProgressPanel
                  progressState={progressState}
                  applicantCount={applicantCount}
                  settings={settings}
                  jobTitle={job?.title}
               />
            )}

            {!isRunning && (
               <div className="px-4 sm:px-6 pb-6 space-y-6">
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

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="space-y-4">
                        <ScreeningTrigger
                           applicantCount={applicantCount}
                           shortlistSize={shortlistSize}
                           hasResult={!!result}
                           isPending={triggerScreening.isPending}
                           onTrigger={handleTrigger}
                        />

                        {result && (
                           <Card>
                              <CardHeader className="pb-2">
                                 <CardTitle className="text-sm flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-primary" /> Run
                                    Details
                                 </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2.5 text-sm">
                                 <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">
                                       Model
                                    </span>
                                    <Badge
                                       variant="secondary"
                                       className="text-xs font-mono"
                                    >
                                       {result.modelUsed}
                                    </Badge>
                                 </div>
                                 <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">
                                       Screened
                                    </span>
                                    <span className="text-xs font-medium">
                                       {result.totalApplicants} applicants
                                    </span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">
                                       Shortlisted
                                    </span>
                                    <span className="text-xs font-medium">
                                       {result?.shortlist?.length ?? 0}{" "}
                                       candidates
                                    </span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">
                                       Run at
                                    </span>
                                    <span className="text-xs font-medium">
                                       {result?.screenedAt &&
                                          format(
                                             new Date(result.screenedAt),
                                             "d MMM yyyy, HH:mm",
                                          )}
                                    </span>
                                 </div>
                                 {result.totalBatches && (
                                    <div className="flex items-center justify-between">
                                       <span className="text-muted-foreground text-xs">
                                          Batches
                                       </span>
                                       <span className="text-xs font-medium">
                                          {result.totalBatches} batches
                                       </span>
                                    </div>
                                 )}
                              </CardContent>
                           </Card>
                        )}

                        {barData.length > 0 && (
                           <Card>
                              <CardHeader className="pb-2">
                                 <CardTitle className="text-sm">
                                    Match Scores
                                 </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0 pl-0">
                                 <ResponsiveContainer
                                    width="100%"
                                    height={chartHeight}
                                 >
                                    <BarChart
                                       data={barData}
                                       layout="vertical"
                                       margin={{
                                          top: 0,
                                          right: 16,
                                          bottom: 0,
                                          left: 8,
                                       }}
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
                                       icon: Boxes,
                                       step: "2",
                                       text: "Applicants split into batches for precise scoring",
                                    },
                                    {
                                       icon: BarChart2,
                                       step: "3",
                                       text: "Each batch independently scored using your weights",
                                    },
                                    {
                                       icon: ListOrdered,
                                       step: "4",
                                       text: "All scores merged — global top candidates selected",
                                    },
                                    {
                                       icon: Sparkles,
                                       step: "5",
                                       text: "Ranked shortlist with explanations delivered",
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

                     <div className="lg:col-span-2">
                        <Tabs defaultValue="shortlist">
                           <div className="flex items-center justify-between mb-3">
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
                              className="mt-0"
                           >
                              <div className="space-y-3">
                                 {resultLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                       <div
                                          key={i}
                                          className="h-28 rounded-xl border bg-muted animate-pulse"
                                       />
                                    ))
                                 ) : result?.shortlist?.length ? (
                                    result.shortlist.map((candidate) => (
                                       <ShortlistCard
                                          key={candidate.candidateId}
                                          candidate={candidate}
                                       />
                                    ))
                                 ) : (
                                    <Card className="border-dashed">
                                       <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                                             <Sparkles className="h-8 w-8 text-primary" />
                                          </div>
                                          <div>
                                             <p className="font-semibold">
                                                No results yet
                                             </p>
                                             <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                                {applicantCount === 0
                                                   ? "Add applicants first, then run AI screening."
                                                   : `${applicantCount} applicant${applicantCount > 1 ? "s" : ""} ready — click "Run Screening" to rank them.`}
                                             </p>
                                          </div>
                                          {applicantCount === 0 ? (
                                             <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                             >
                                                <Link
                                                   href={`/jobs/${id}/applicants`}
                                                >
                                                   <Users className="h-4 w-4 mr-1.5" />{" "}
                                                   Add Applicants
                                                </Link>
                                             </Button>
                                          ) : (
                                             <Button
                                                size="sm"
                                                onClick={handleTrigger}
                                                disabled={
                                                   triggerScreening.isPending
                                                }
                                             >
                                                <Sparkles className="h-4 w-4 mr-1.5" />{" "}
                                                Run AI Screening
                                             </Button>
                                          )}
                                       </CardContent>
                                    </Card>
                                 )}
                              </div>

                              {result && (
                                 <Card className="mt-3 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                                    <CardContent className="flex items-start gap-2.5 py-3">
                                       <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                       <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                          <strong>Human-in-the-loop:</strong> AI
                                          rankings are recommendations only.
                                          Final hiring decisions remain with the
                                          recruiter.
                                       </p>
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
                                       <p className="font-semibold">
                                          No history yet
                                       </p>
                                       <p className="text-sm text-muted-foreground">
                                          Run a screening to start building your
                                          history.
                                       </p>
                                    </CardContent>
                                 </Card>
                              ) : (
                                 <div className="space-y-2.5">
                                    {history.map((run, idx) => (
                                       <HistoryRunCard
                                          key={run._id}
                                          run={run}
                                          jobId={id}
                                          isLatest={idx === 0}
                                       />
                                    ))}
                                    <p className="text-center text-xs text-muted-foreground pt-2">
                                       {history.length} run
                                       {history.length !== 1 ? "s" : ""} total ·
                                       Click any run to view its shortlisted
                                       candidates
                                    </p>
                                 </div>
                              )}
                           </TabsContent>
                        </Tabs>
                     </div>
                  </div>
               </div>
            )}
         </main>
         <ActivityEmailPanel jobId={id} />
      </div>
   );
}
