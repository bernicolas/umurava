"use client";

import { useEffect, useState } from "react";
import {
   BrainCircuit,
   CheckCircle2,
   Loader2,
   FileText,
   Layers,
   BarChart2,
   ListOrdered,
   Wand2,
   Sparkles,
   ShieldCheck,
   Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScreeningConfig } from "@/types";

interface ScreeningProgressPanelProps {
   jobTitle?: string;
   applicantCount: number;
   settings?: ScreeningConfig;
   currentBatch?: number;
   totalBatches?: number;
   processedApplicants?: number;
}

interface ProgressStage {
   id: string;
   icon: React.ElementType;
   label: string;
   isComplete: (progress: number) => boolean;
}

const STAGES: ProgressStage[] = [
   {
      id: "connect",
      icon: BrainCircuit,
      label: "Connecting to Gemini AI",
      isComplete: (p) => p >= 5,
   },
   {
      id: "analyze",
      icon: FileText,
      label: "Analyzing job requirements",
      isComplete: (p) => p >= 15,
   },
   {
      id: "evaluate",
      icon: Layers,
      label: "Evaluating candidate profiles",
      isComplete: (p) => p >= 40,
   },
   {
      id: "score",
      icon: BarChart2,
      label: "Computing match scores",
      isComplete: (p) => p >= 65,
   },
   {
      id: "rank",
      icon: ListOrdered,
      label: "Ranking candidates",
      isComplete: (p) => p >= 85,
   },
   {
      id: "generate",
      icon: Wand2,
      label: "Generating recommendations",
      isComplete: (p) => p >= 95,
   },
   {
      id: "finalize",
      icon: Sparkles,
      label: "Finalizing shortlist",
      isComplete: (p) => p >= 100,
   },
];

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

export function ScreeningProgressPanel({
   jobTitle,
   applicantCount,
   settings,
   currentBatch,
   totalBatches,
   processedApplicants = 0,
}: ScreeningProgressPanelProps) {
   const weights = settings?.scoringWeights;
   const minScore = settings?.minScoreThreshold ?? 0;
   const preferImmediate = settings?.preferImmediateAvailability ?? false;
   
   // Calculate real progress percentage
   const progressPercent = totalBatches && currentBatch
      ? Math.round((currentBatch / totalBatches) * 100)
      : 0;
   
   const currentStage = STAGES.findLast(stage => stage.isComplete(progressPercent)) 
      ?? STAGES[0]!;
   
   const nextStage = STAGES.find(stage => !stage.isComplete(progressPercent));

   return (
      <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-12rem)] py-12 px-4">
         <div className="w-full max-w-xl mx-auto space-y-8">
            {/* Animated orb header */}
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
                     Gemini AI is analyzing {applicantCount} applicant
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
                  {currentBatch && totalBatches && (
                     <p className="text-xs text-muted-foreground">
                        Batch {currentBatch} of {totalBatches} ·{" "}
                        {processedApplicants} of {applicantCount} applicants processed
                     </p>
                  )}
               </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
               <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                     {currentStage.label}
                  </span>
                  <span className="tabular-nums">{progressPercent}%</span>
               </div>
               <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                     className="h-full bg-primary rounded-full transition-all duration-700 ease-in-out"
                     style={{ width: `${progressPercent}%` }}
                  />
               </div>
               {nextStage && (
                  <p className="text-xs text-muted-foreground">
                     Next: {nextStage.label}
                  </p>
               )}
            </div>

            {/* Stage list */}
            <div className="rounded-xl border bg-muted/20 divide-y overflow-hidden">
               {STAGES.map((stage) => {
                  const Icon = stage.icon;
                  const isComplete = stage.isComplete(progressPercent);
                  const isActive = !isComplete && 
                     STAGES.findIndex(s => s.id === stage.id) === 
                     STAGES.findIndex(s => !s.isComplete(progressPercent));
                  const isPending = !isComplete && !isActive;
                  
                  return (
                     <div
                        key={stage.id}
                        className={cn(
                           "flex items-center gap-3 px-4 py-2.5 transition-colors duration-200",
                           isActive && "bg-primary/[0.04]",
                           isPending && "opacity-40",
                        )}
                     >
                        <div
                           className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                              isComplete && "bg-emerald-100 text-emerald-600",
                              isActive && "bg-primary/15 text-primary",
                              isPending && "bg-muted text-muted-foreground",
                           )}
                        >
                           {isComplete ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                           ) : isActive ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                           ) : (
                              <Icon className="h-3 w-3" />
                           )}
                        </div>
                        <span
                           className={cn(
                              "text-sm",
                              isComplete && "text-emerald-700 line-through decoration-emerald-300",
                              isActive && "text-foreground font-medium",
                              isPending && "text-muted-foreground",
                           )}
                        >
                           {stage.label}
                        </span>
                        {isComplete && (
                           <span className="ml-auto text-xs text-emerald-600 font-medium">
                              Done
                           </span>
                        )}
                        {isActive && (
                           <span className="ml-auto">
                              <ThinkingDots />
                           </span>
                        )}
                     </div>
                  );
               })}
            </div>

            {/* Active settings chips */}
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
                           <ShieldCheck className="h-2.5 w-2.5" />
                           Min score {minScore}%
                        </span>
                     )}
                     {preferImmediate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                           <Zap className="h-2.5 w-2.5" />
                           Prefer immediate
                        </span>
                     )}
                  </div>
               </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
               This usually takes 15–45 seconds depending on applicant count
            </p>
         </div>
      </div>
   );
}