"use client";

import { useState } from "react";
import Link from "next/link";
import {
   ChevronDown,
   ChevronUp,
   CheckCircle2,
   AlertCircle,
   Sparkles,
   MapPin,
   UserCircle,
   ThumbsUp,
   ThumbsDown,
   Star,
   XCircle,
   Undo2,
   ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "./ScoreBar";
import type { ShortlistedCandidate } from "@/types";

export type CandidateDecision = "pending" | "selected" | "rejected" | "pool";

interface CandidateReviewRowProps {
   candidate: ShortlistedCandidate;
   decision: CandidateDecision;
   onDecision: (id: string, decision: CandidateDecision) => void;
   jobId?: string;
}

const CRITERIA_META = [
   { key: "skills" as const, label: "Skills", color: "bg-violet-400" },
   { key: "experience" as const, label: "Experience", color: "bg-blue-400" },
   { key: "education" as const, label: "Education", color: "bg-emerald-400" },
   { key: "projects" as const, label: "Projects", color: "bg-amber-400" },
   {
      key: "availability" as const,
      label: "Availability",
      color: "bg-rose-400",
   },
];

function rankClasses(rank: number) {
   if (rank === 1) return "bg-amber-400 text-white ring-2 ring-amber-200";
   if (rank === 2) return "bg-slate-400 text-white ring-2 ring-slate-200";
   if (rank === 3) return "bg-orange-400 text-white ring-2 ring-orange-200";
   return "bg-primary/10 text-primary";
}

function decisionBorder(decision: CandidateDecision) {
   switch (decision) {
      case "selected":
         return "border-l-4 border-l-emerald-400";
      case "rejected":
         return "border-l-4 border-l-rose-400 opacity-70";
      case "pool":
         return "border-l-4 border-l-violet-400";
      default:
         return "";
   }
}

function DecisionBadge({ decision }: { decision: CandidateDecision }) {
   if (decision === "pending") return null;
   const cfg = {
      selected: {
         label: "Selected",
         cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      rejected: {
         label: "Rejected",
         cls: "bg-rose-100 text-rose-700 border-rose-200",
      },
      pool: {
         label: "Talent Pool",
         cls: "bg-violet-100 text-violet-700 border-violet-200",
      },
   }[decision];
   return (
      <Badge
         variant="outline"
         className={cn("text-xs shrink-0", cfg.cls)}
      >
         {cfg.label}
      </Badge>
   );
}

export function CandidateReviewRow({
   candidate,
   decision,
   onDecision,
   jobId,
}: CandidateReviewRowProps) {
   const [expanded, setExpanded] = useState(false);
   const profile = candidate.applicant?.profile;
   const fullName = profile
      ? `${profile.firstName} ${profile.lastName}`
      : `Candidate #${candidate.rank}`;

   const isDecided = decision !== "pending";

   return (
      <Card
         className={cn(
            "transition-all duration-200 hover:shadow-md",
            decisionBorder(decision),
            decision === "rejected" && "bg-muted/30",
         )}
      >
         {/* Header row */}
         <div className="px-4 py-3">
            <div className="flex items-start gap-3">
               {/* Rank badge */}
               <div
                  className={cn(
                     "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm mt-0.5",
                     rankClasses(candidate.rank),
                  )}
               >
                  #{candidate.rank}
               </div>

               {/* Content column — grows, allows 2-row layout on small screens */}
               <div className="flex-1 min-w-0">
                  {/* Row 1: identity + (lg: inline controls) + expand toggle */}
                  <div className="flex items-start gap-2">
                     {/* Identity */}
                     <button
                        onClick={() => setExpanded((v) => !v)}
                        className="flex-1 min-w-0 text-left"
                     >
                        <div className="flex items-center gap-1.5 flex-wrap">
                           <p className="font-semibold text-sm">{fullName}</p>
                           {candidate.rank <= 3 && (
                              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                           )}
                        </div>
                        {profile?.headline && (
                           <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {profile.headline}
                           </p>
                        )}
                        {profile?.location && (
                           <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {profile.location}
                           </p>
                        )}
                     </button>

                     {/* lg+: score + decision badge + action buttons + expand — all inline */}
                     <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                        <ScoreBar
                           score={candidate.matchScore}
                           size="sm"
                        />
                        <DecisionBadge decision={decision} />
                        <div className="flex items-center gap-1 ml-1">
                           {/* Select */}
                           <button
                              onClick={() =>
                                 onDecision(
                                    candidate.candidateId,
                                    decision === "selected"
                                       ? "pending"
                                       : "selected",
                                 )
                              }
                              title={
                                 decision === "selected"
                                    ? "Undo selection"
                                    : "Select this candidate"
                              }
                              className={cn(
                                 "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border",
                                 decision === "selected"
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                                    : "bg-background text-muted-foreground border-muted hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
                              )}
                           >
                              {decision === "selected" ? (
                                 <Undo2 className="h-3 w-3" />
                              ) : (
                                 <ThumbsUp className="h-3 w-3" />
                              )}
                              <span className="hidden xl:inline">
                                 {decision === "selected" ? "Undo" : "Select"}
                              </span>
                           </button>
                           {/* Reject */}
                           <button
                              onClick={() =>
                                 onDecision(
                                    candidate.candidateId,
                                    decision === "rejected"
                                       ? "pending"
                                       : "rejected",
                                 )
                              }
                              title={
                                 decision === "rejected"
                                    ? "Undo rejection"
                                    : "Reject this candidate"
                              }
                              className={cn(
                                 "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border",
                                 decision === "rejected"
                                    ? "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200"
                                    : "bg-background text-muted-foreground border-muted hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200",
                              )}
                           >
                              {decision === "rejected" ? (
                                 <Undo2 className="h-3 w-3" />
                              ) : (
                                 <ThumbsDown className="h-3 w-3" />
                              )}
                              <span className="hidden xl:inline">
                                 {decision === "rejected" ? "Undo" : "Reject"}
                              </span>
                           </button>
                           {/* Talent Pool */}
                           <button
                              onClick={() =>
                                 onDecision(
                                    candidate.candidateId,
                                    decision === "pool" ? "pending" : "pool",
                                 )
                              }
                              title={
                                 decision === "pool"
                                    ? "Remove from talent pool"
                                    : "Add to talent pool (near-miss)"
                              }
                              className={cn(
                                 "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border",
                                 decision === "pool"
                                    ? "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200"
                                    : "bg-background text-muted-foreground border-muted hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200",
                              )}
                           >
                              <Star className="h-3 w-3" />
                              <span className="hidden xl:inline">
                                 {decision === "pool" ? "In Pool" : "Pool"}
                              </span>
                           </button>
                        </div>
                        {/* Expand toggle */}
                        <button
                           onClick={() => setExpanded((v) => !v)}
                           className="ml-1 rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground"
                        >
                           {expanded ? (
                              <ChevronUp className="h-4 w-4" />
                           ) : (
                              <ChevronDown className="h-4 w-4" />
                           )}
                        </button>
                     </div>

                     {/* < lg: expand toggle only (score + actions go on row 2) */}
                     <button
                        onClick={() => setExpanded((v) => !v)}
                        className="lg:hidden shrink-0 rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground"
                     >
                        {expanded ? (
                           <ChevronUp className="h-4 w-4" />
                        ) : (
                           <ChevronDown className="h-4 w-4" />
                        )}
                     </button>
                  </div>

                  {/* Row 2 (< lg only): score + decision badge + action buttons */}
                  <div className="lg:hidden flex items-center gap-2 mt-2 flex-wrap">
                     <ScoreBar
                        score={candidate.matchScore}
                        size="sm"
                     />
                     <DecisionBadge decision={decision} />
                     <div className="ml-auto flex items-center gap-1">
                        {/* Select */}
                        <button
                           onClick={() =>
                              onDecision(
                                 candidate.candidateId,
                                 decision === "selected"
                                    ? "pending"
                                    : "selected",
                              )
                           }
                           title={
                              decision === "selected"
                                 ? "Undo selection"
                                 : "Select this candidate"
                           }
                           className={cn(
                              "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border",
                              decision === "selected"
                                 ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                                 : "bg-background text-muted-foreground border-muted hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
                           )}
                        >
                           {decision === "selected" ? (
                              <Undo2 className="h-3 w-3" />
                           ) : (
                              <ThumbsUp className="h-3 w-3" />
                           )}
                           <span className="hidden sm:inline">
                              {decision === "selected" ? "Undo" : "Select"}
                           </span>
                        </button>
                        {/* Reject */}
                        <button
                           onClick={() =>
                              onDecision(
                                 candidate.candidateId,
                                 decision === "rejected"
                                    ? "pending"
                                    : "rejected",
                              )
                           }
                           title={
                              decision === "rejected"
                                 ? "Undo rejection"
                                 : "Reject this candidate"
                           }
                           className={cn(
                              "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border",
                              decision === "rejected"
                                 ? "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200"
                                 : "bg-background text-muted-foreground border-muted hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200",
                           )}
                        >
                           {decision === "rejected" ? (
                              <Undo2 className="h-3 w-3" />
                           ) : (
                              <ThumbsDown className="h-3 w-3" />
                           )}
                           <span className="hidden sm:inline">
                              {decision === "rejected" ? "Undo" : "Reject"}
                           </span>
                        </button>
                        {/* Talent Pool */}
                        <button
                           onClick={() =>
                              onDecision(
                                 candidate.candidateId,
                                 decision === "pool" ? "pending" : "pool",
                              )
                           }
                           title={
                              decision === "pool"
                                 ? "Remove from talent pool"
                                 : "Add to talent pool (near-miss)"
                           }
                           className={cn(
                              "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border",
                              decision === "pool"
                                 ? "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200"
                                 : "bg-background text-muted-foreground border-muted hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200",
                           )}
                        >
                           <Star className="h-3 w-3" />
                           <span className="hidden sm:inline">
                              {decision === "pool" ? "In Pool" : "Pool"}
                           </span>
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Expanded section */}
         {expanded && (
            <CardContent className="pt-0 pb-4 border-t bg-muted/10 space-y-4">
               {/* Score breakdown */}
               {candidate.criteriaScores && (
                  <div className="rounded-lg border bg-background p-3 space-y-2">
                     <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                        Score Breakdown
                     </p>
                     <div className="space-y-1.5">
                        {CRITERIA_META.map(({ key, label, color }) => {
                           const raw = candidate.criteriaScores?.[key] ?? 0;
                           return (
                              <div
                                 key={key}
                                 className="flex items-center gap-2"
                              >
                                 <span className="w-20 text-xs text-muted-foreground shrink-0">
                                    {label}
                                 </span>
                                 <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                       className={cn(
                                          "h-full rounded-full transition-all",
                                          color,
                                       )}
                                       style={{ width: `${raw}%` }}
                                    />
                                 </div>
                                 <span className="text-xs font-mono tabular-nums w-7 text-right text-foreground/70">
                                    {raw}
                                 </span>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                     <div className="flex items-center gap-1.5 text-emerald-600 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wide">
                           Strengths
                        </span>
                     </div>
                     <ul className="space-y-1">
                        {candidate.strengths.map((s, i) => (
                           <li
                              key={i}
                              className="text-xs text-muted-foreground flex gap-1.5"
                           >
                              <span className="text-emerald-500 mt-0.5">•</span>
                              {s}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <div>
                     <div className="flex items-center gap-1.5 text-amber-600 mb-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wide">
                           Gaps / Risks
                        </span>
                     </div>
                     <ul className="space-y-1">
                        {candidate.gaps.map((g, i) => (
                           <li
                              key={i}
                              className="text-xs text-muted-foreground flex gap-1.5"
                           >
                              <span className="text-amber-500 mt-0.5">•</span>
                              {g}
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>

               <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
                  <div className="flex items-center gap-1.5 text-primary mb-1.5">
                     <Sparkles className="h-3.5 w-3.5" />
                     <span className="text-xs font-semibold uppercase tracking-wide">
                        AI Recommendation
                     </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                     {candidate.recommendation}
                  </p>
               </div>

               {profile?.skills && profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                     {profile.skills.slice(0, 8).map((s) => (
                        <Badge
                           key={s.name}
                           variant="secondary"
                           className="text-xs"
                        >
                           {s.name} · {s.level}
                        </Badge>
                     ))}
                  </div>
               )}

               <div className="flex flex-wrap items-center gap-2 pt-1">
                  {candidate.applicant?._id && (
                     <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-7 text-xs"
                     >
                        <Link href={`/applicants/${candidate.applicant._id}`}>
                           <UserCircle className="h-3 w-3" />
                           Full Profile
                        </Link>
                     </Button>
                  )}
                  {jobId && (
                     <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-7 text-xs"
                     >
                        <Link href={`/jobs/${jobId}/screening`}>
                           <ExternalLink className="h-3 w-3" />
                           Screening Detail
                        </Link>
                     </Button>
                  )}

                  {/* Inline decision buttons in expanded view too */}
                  <div className="ml-auto flex items-center gap-1.5">
                     <span className="text-xs text-muted-foreground mr-1">
                        Decision:
                     </span>
                     <button
                        onClick={() =>
                           onDecision(candidate.candidateId, "selected")
                        }
                        className={cn(
                           "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                           decision === "selected"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "border-input hover:bg-emerald-50 hover:text-emerald-700",
                        )}
                     >
                        <CheckCircle2 className="h-3 w-3" /> Select
                     </button>
                     <button
                        onClick={() =>
                           onDecision(candidate.candidateId, "pool")
                        }
                        className={cn(
                           "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                           decision === "pool"
                              ? "bg-violet-100 text-violet-700 border-violet-200"
                              : "border-input hover:bg-violet-50 hover:text-violet-700",
                        )}
                     >
                        <Star className="h-3 w-3" /> Pool
                     </button>
                     <button
                        onClick={() =>
                           onDecision(candidate.candidateId, "rejected")
                        }
                        className={cn(
                           "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                           decision === "rejected"
                              ? "bg-rose-100 text-rose-700 border-rose-200"
                              : "border-input hover:bg-rose-50 hover:text-rose-700",
                        )}
                     >
                        <XCircle className="h-3 w-3" /> Reject
                     </button>
                     {isDecided && (
                        <button
                           onClick={() =>
                              onDecision(candidate.candidateId, "pending")
                           }
                           className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border border-input hover:bg-muted transition-colors text-muted-foreground"
                        >
                           <Undo2 className="h-3 w-3" /> Clear
                        </button>
                     )}
                  </div>
               </div>
            </CardContent>
         )}
      </Card>
   );
}
