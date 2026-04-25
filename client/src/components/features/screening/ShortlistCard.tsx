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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "./ScoreBar";
import type { ShortlistedCandidate } from "@/types";

interface ShortlistCardProps {
   candidate: ShortlistedCandidate;
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
   if (rank === 1)
      return "bg-amber-400 text-white ring-2 ring-amber-200 dark:ring-amber-600";
   if (rank === 2)
      return "bg-slate-400 text-white ring-2 ring-slate-200 dark:ring-slate-500";
   if (rank === 3)
      return "bg-orange-400 text-white ring-2 ring-orange-200 dark:ring-orange-600";
   return "bg-primary/10 text-primary";
}

function cardBorderClasses(rank: number) {
   if (rank === 1) return "border-l-4 border-l-amber-400";
   if (rank === 2) return "border-l-4 border-l-slate-400";
   if (rank === 3) return "border-l-4 border-l-orange-400";
   return "";
}

export function ShortlistCard({ candidate }: ShortlistCardProps) {
   const [expanded, setExpanded] = useState(candidate.rank <= 3);
   const profile = candidate.applicant?.profile;
   const fullName = profile
      ? `${profile.firstName} ${profile.lastName}`
      : `Candidate #${candidate.rank}`;

   return (
      <Card
         className={cn(
            "hover:shadow-md transition-all",
            cardBorderClasses(candidate.rank),
         )}
      >
         <CardHeader className="pb-3">
            <button
               onClick={() => setExpanded((v) => !v)}
               className="flex w-full items-start justify-between gap-3 text-left"
            >
               <div className="flex items-center gap-3 min-w-0">
                  <div
                     className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm",
                        rankClasses(candidate.rank),
                     )}
                  >
                     #{candidate.rank}
                  </div>
                  <div className="min-w-0">
                     <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{fullName}</p>
                     </div>
                     {profile?.headline && (
                        <p className="text-sm text-muted-foreground truncate">
                           {profile.headline}
                        </p>
                     )}
                     {profile?.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                           <MapPin className="h-2.5 w-2.5" />
                           {profile.location}
                        </p>
                     )}
                  </div>
               </div>
               <div className="flex items-center gap-3 shrink-0">
                  <ScoreBar
                     score={candidate.matchScore}
                     size="sm"
                  />
                  {expanded ? (
                     <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                     <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
               </div>
            </button>
         </CardHeader>

         {expanded && (
            <CardContent className="space-y-4 pt-0">
               {/* Criteria score breakdown */}
               {candidate.criteriaScores && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                     <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                        Score breakdown
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

               <div className="grid grid-cols-2 gap-3">
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
                              className="text-sm text-muted-foreground flex gap-1.5"
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
                              className="text-sm text-muted-foreground flex gap-1.5"
                           >
                              <span className="text-amber-500 mt-0.5">•</span>
                              {g}
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>

               <div className="rounded-md bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 text-primary mb-1.5">
                     <Sparkles className="h-3.5 w-3.5" />
                     <span className="text-xs font-semibold uppercase tracking-wide">
                        AI Recommendation
                     </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                     {candidate.recommendation}
                  </p>
               </div>

               {profile?.skills && profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                     {profile.skills.slice(0, 6).map((s) => (
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

               {/* View full profile */}
               {candidate.applicant?._id && (
                  <div className="pt-1">
                     <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                     >
                        <Link href={`/applicants/${candidate.applicant._id}`}>
                           <UserCircle className="h-3.5 w-3.5" />
                           View Full Profile
                        </Link>
                     </Button>
                  </div>
               )}
            </CardContent>
         )}
      </Card>
   );
}
