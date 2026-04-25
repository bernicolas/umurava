"use client";

import { use } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
   ArrowLeft,
   MapPin,
   Mail,
   Briefcase,
   GraduationCap,
   Code2,
   Globe,
   Award,
   FolderOpen,
   Sparkles,
   CheckCircle2,
   AlertCircle,
   Layers,
   Clock,
   ExternalLink,
   Star,
   TrendingUp,
   Users,
   History,
   TrendingDown,
   Minus,
   ChevronDown,
   ChevronUp,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBar } from "@/components/features/screening/ScoreBar";
import { useApplicantDetail } from "@/services/applicant.service";
import { ActivityEmailPanel } from "@/components/features/shortlists/ActivityEmailPanel";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ApplicantScreeningHistoryRun, CriteriaScores } from "@/types";

const LEVEL_COLOR: Record<string, string> = {
   Beginner: "bg-slate-100 text-slate-600 border-slate-200",
   Intermediate: "bg-blue-50 text-blue-700 border-blue-200",
   Advanced: "bg-violet-50 text-violet-700 border-violet-200",
   Expert: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PROFICIENCY_COLOR: Record<string, string> = {
   Basic: "bg-slate-100 text-slate-600 border-slate-200",
   Conversational: "bg-blue-50 text-blue-700 border-blue-200",
   Fluent: "bg-violet-50 text-violet-700 border-violet-200",
   Native: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const CRITERIA_META: {
   key: keyof CriteriaScores;
   label: string;
   color: string;
}[] = [
   { key: "skills", label: "Skills", color: "bg-blue-500" },
   { key: "experience", label: "Experience", color: "bg-violet-500" },
   { key: "education", label: "Education", color: "bg-amber-500" },
   { key: "projects", label: "Projects", color: "bg-emerald-500" },
   { key: "availability", label: "Availability", color: "bg-rose-500" },
];

function scoreRingColor(score: number) {
   if (score >= 80) return "text-emerald-500";
   if (score >= 60) return "text-amber-500";
   return "text-destructive";
}

function ScoreDelta({
   current,
   previous,
}: {
   current: number;
   previous: number;
}) {
   const delta = current - previous;
   if (delta === 0)
      return (
         <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
            <Minus className="h-3 w-3" />0
         </span>
      );
   if (delta > 0)
      return (
         <span className="flex items-center gap-0.5 text-emerald-600 text-xs">
            <TrendingUp className="h-3 w-3" />+{delta}
         </span>
      );
   return (
      <span className="flex items-center gap-0.5 text-rose-600 text-xs">
         <TrendingDown className="h-3 w-3" />
         {delta}
      </span>
   );
}

function ScreeningHistoryTimeline({
   runs,
}: {
   runs: ApplicantScreeningHistoryRun[];
}) {
   const [expandedRun, setExpandedRun] = useState<number | null>(0);

   return (
      <Card>
         <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
               <History className="h-4.5 w-4.5 text-muted-foreground" />
               Screening History
               <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {runs.length} run{runs.length !== 1 ? "s" : ""}
               </span>
            </CardTitle>
         </CardHeader>
         <CardContent className="space-y-3">
            {/* Score trend bar */}
            {runs.length > 1 && (
               <div className="flex items-end gap-1.5 h-12 mb-4 px-1">
                  {[...runs].reverse().map((run, i) => {
                     const height = Math.max(8, (run.matchScore / 100) * 48);
                     const isLast = i === runs.length - 1;
                     return (
                        <div
                           key={run.runNumber}
                           className="flex flex-col items-center gap-1 flex-1"
                        >
                           <div
                              className={cn(
                                 "w-full rounded-t-sm transition-all",
                                 run.matchScore >= 80
                                    ? "bg-emerald-400"
                                    : run.matchScore >= 60
                                      ? "bg-amber-400"
                                      : "bg-rose-400",
                                 isLast && "opacity-100",
                                 !isLast && "opacity-60",
                              )}
                              style={{ height: `${height}px` }}
                           />
                           <span className="text-xs text-muted-foreground">
                              R{run.runNumber}
                           </span>
                        </div>
                     );
                  })}
               </div>
            )}

            {/* Run cards */}
            {runs.map((run, idx) => {
               const prevRun = runs[idx + 1];
               const isExpanded = expandedRun === idx;
               return (
                  <div
                     key={run.runNumber}
                     className="rounded-lg border overflow-hidden"
                  >
                     <button
                        onClick={() => setExpandedRun(isExpanded ? null : idx)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                     >
                        <div
                           className={cn(
                              "shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                              idx === 0
                                 ? "bg-primary text-primary-foreground"
                                 : "bg-muted text-muted-foreground",
                           )}
                        >
                           R{run.runNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 flex-wrap">
                              <span
                                 className={cn(
                                    "text-sm font-bold tabular-nums",
                                    scoreRingColor(run.matchScore),
                                 )}
                              >
                                 {run.matchScore}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                 Rank #{run.rank} of {run.shortlistSize}
                              </span>
                              {prevRun && (
                                 <ScoreDelta
                                    current={run.matchScore}
                                    previous={prevRun.matchScore}
                                 />
                              )}
                              {idx === 0 && (
                                 <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                    Latest
                                 </span>
                              )}
                           </div>
                           <p className="text-xs text-muted-foreground mt-0.5">
                              {format(
                                 new Date(run.screenedAt),
                                 "MMM d, yyyy 'at' HH:mm",
                              )}{" "}
                              · {run.modelUsed}
                           </p>
                        </div>
                        {isExpanded ? (
                           <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                           <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                     </button>

                     {isExpanded && (
                        <div className="border-t px-4 py-4 space-y-4 bg-muted/10">
                           {run.criteriaScores && (
                              <div className="space-y-2">
                                 <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                                    Score breakdown
                                 </p>
                                 {CRITERIA_META.map(({ key, label, color }) => {
                                    const val = run.criteriaScores![key] ?? 0;
                                    return (
                                       <div
                                          key={key}
                                          className="flex items-center gap-3"
                                       >
                                          <span className="w-24 text-sm text-muted-foreground shrink-0">
                                             {label}
                                          </span>
                                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                             <div
                                                className={cn(
                                                   "h-full rounded-full",
                                                   color,
                                                )}
                                                style={{ width: `${val}%` }}
                                             />
                                          </div>
                                          <span className="text-sm font-mono tabular-nums w-8 text-right">
                                             {val}
                                          </span>
                                       </div>
                                    );
                                 })}
                              </div>
                           )}
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                 <div className="flex items-center gap-1 text-emerald-600 mb-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span className="text-xs font-semibold">
                                       Strengths
                                    </span>
                                 </div>
                                 <ul className="space-y-1">
                                    {run.strengths.map((s, i) => (
                                       <li
                                          key={i}
                                          className="flex gap-1.5 text-sm text-muted-foreground"
                                       >
                                          <span className="text-emerald-500 shrink-0">
                                             •
                                          </span>
                                          {s}
                                       </li>
                                    ))}
                                 </ul>
                              </div>
                              <div>
                                 <div className="flex items-center gap-1 text-amber-600 mb-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span className="text-xs font-semibold">
                                       Gaps
                                    </span>
                                 </div>
                                 <ul className="space-y-1">
                                    {run.gaps.map((g, i) => (
                                       <li
                                          key={i}
                                          className="flex gap-1.5 text-sm text-muted-foreground"
                                       >
                                          <span className="text-amber-500 shrink-0">
                                             •
                                          </span>
                                          {g}
                                       </li>
                                    ))}
                                 </ul>
                              </div>
                           </div>
                           <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
                              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">
                                 AI Recommendation
                              </p>
                              <p className="text-sm leading-relaxed">
                                 {run.recommendation}
                              </p>
                           </div>
                        </div>
                     )}
                  </div>
               );
            })}
         </CardContent>
      </Card>
   );
}

function SectionHeader({
   icon: Icon,
   title,
}: {
   icon: React.ElementType;
   title: string;
}) {
   return (
      <div className="flex items-center gap-2 mb-4">
         <Icon className="h-4.5 w-4.5 text-muted-foreground" />
         <h3 className="font-semibold text-base">{title}</h3>
      </div>
   );
}

export default function ApplicantDetailPage({
   params,
}: {
   params: Promise<{ id: string }>;
}) {
   const { id } = use(params);
   const { data, isLoading, isError } = useApplicantDetail(id);

   if (isLoading) {
      return (
         <div className="flex flex-col h-full">
            <Header title="Applicant" />
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {Array.from({ length: 4 }).map((_, i) => (
                  <div
                     key={i}
                     className="h-40 rounded-xl bg-muted animate-pulse"
                  />
               ))}
            </div>
         </div>
      );
   }

   if (isError || !data) {
      return (
         <div className="flex flex-col h-full">
            <Header title="Applicant" />
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
               <p>Applicant not found.</p>
            </div>
         </div>
      );
   }

   const { applicant, job, screening, screeningHistory = [] } = data;
   const { profile } = applicant;
   const fullName = `${profile.firstName} ${profile.lastName}`;
   const initials =
      `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase();
   const linkedin =
      profile.socialLinks?.["linkedin"] ?? profile.socialLinks?.["LinkedIn"];

   return (
      <div className="flex flex-col h-full">
         <Header title={fullName} />

         <div className="flex-1 overflow-y-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 px-6 py-3 border-b bg-background">
               <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground"
               >
                  <Link href="/applicants">
                     <ArrowLeft className="h-3.5 w-3.5" />
                     All Applicants
                  </Link>
               </Button>
               {job && (
                  <>
                     <span className="text-muted-foreground/40">/</span>
                     <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground"
                     >
                        <Link href={`/jobs/${job._id}/applicants`}>
                           {job.title}
                        </Link>
                     </Button>
                  </>
               )}
            </div>

            <div className="p-6 space-y-6">
               {/* ── Hero ─────────────────────────────────────────────── */}
               <Card>
                  <CardContent className="pt-6">
                     <div className="flex flex-col sm:flex-row items-start gap-5">
                        {/* Avatar */}
                        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary text-xl font-bold flex items-center justify-center shrink-0">
                           {initials}
                        </div>

                        {/* Name / headline / meta */}
                        <div className="flex-1 min-w-0">
                           <div className="flex flex-wrap items-center gap-2">
                              <h1 className="text-xl font-bold">{fullName}</h1>
                              {linkedin && (
                                 <a
                                    href={linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/70 transition-colors"
                                 >
                                    <ExternalLink className="h-4 w-4" />
                                 </a>
                              )}
                              <Badge
                                 variant={
                                    applicant.source === "platform"
                                       ? "default"
                                       : "secondary"
                                 }
                                 className="gap-1"
                              >
                                 {applicant.source === "platform" ? (
                                    <Layers className="h-3 w-3" />
                                 ) : (
                                    <Globe className="h-3 w-3" />
                                 )}
                                 {applicant.source}
                              </Badge>
                           </div>
                           <p className="text-muted-foreground mt-1">
                              {profile.headline}
                           </p>

                           <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                              {profile.location && (
                                 <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />{" "}
                                    {profile.location}
                                 </span>
                              )}
                              <span className="flex items-center gap-1">
                                 <Mail className="h-3.5 w-3.5 shrink-0" />{" "}
                                 {profile.email}
                              </span>
                              <span className="flex items-center gap-1">
                                 <Clock className="h-3.5 w-3.5 shrink-0" />
                                 Applied{" "}
                                 {formatDistanceToNow(
                                    new Date(applicant.createdAt),
                                    { addSuffix: true },
                                 )}
                              </span>
                           </div>

                           {/* Availability */}
                           {profile.availability && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                 <Badge
                                    variant={
                                       profile.availability.status ===
                                       "Available"
                                          ? "success"
                                          : "secondary"
                                    }
                                 >
                                    {profile.availability.status}
                                 </Badge>
                                 <Badge variant="outline">
                                    {profile.availability.type}
                                 </Badge>
                                 {profile.availability.startDate && (
                                    <Badge
                                       variant="outline"
                                       className="gap-1"
                                    >
                                       <Clock className="h-3 w-3" />
                                       From {profile.availability.startDate}
                                    </Badge>
                                 )}
                              </div>
                           )}
                        </div>

                        {/* Score ring (if screened) */}
                        {screening && (
                           <div className="shrink-0 flex flex-col items-center gap-1 p-4 rounded-xl border bg-muted/30">
                              <span
                                 className={cn(
                                    "text-4xl font-bold tabular-nums",
                                    scoreRingColor(screening.matchScore),
                                 )}
                              >
                                 {screening.matchScore}%
                              </span>
                              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                 Match score
                              </span>
                              <span className="text-sm text-muted-foreground">
                                 Rank #{screening.rank}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                 of {screening.shortlistSize} shortlisted
                              </span>
                           </div>
                        )}
                     </div>

                     {/* Bio */}
                     {profile.bio && (
                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t pt-4">
                           {profile.bio}
                        </p>
                     )}
                  </CardContent>
               </Card>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* ── Left column ── */}
                  <div className="lg:col-span-2 space-y-6">
                     {/* AI Screening */}
                     {screening && (
                        <Card className="border-primary/20 bg-primary/5">
                           <CardHeader className="pb-3">
                              <CardTitle className="flex items-center gap-2 text-base">
                                 <Sparkles className="h-4.5 w-4.5 text-primary" />
                                 AI Screening Result
                                 <span className="ml-auto text-xs font-normal text-muted-foreground">
                                    {format(
                                       new Date(screening.screenedAt),
                                       "MMM d, yyyy 'at' HH:mm",
                                    )}
                                 </span>
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-5">
                              {/* Score bar */}
                              <div className="flex items-center gap-4">
                                 <ScoreBar
                                    score={screening.matchScore}
                                    size="md"
                                 />
                                 <span className="text-sm text-muted-foreground">
                                    vs {screening.totalApplicants} total
                                    applicants
                                 </span>
                              </div>

                              {/* Criteria breakdown */}
                              {screening.criteriaScores && (
                                 <div className="rounded-lg border bg-background p-4 space-y-3">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                                       Score breakdown
                                    </p>
                                    {CRITERIA_META.map(
                                       ({ key, label, color }) => {
                                          const val =
                                             screening.criteriaScores![key] ??
                                             0;
                                          return (
                                             <div
                                                key={key}
                                                className="flex items-center gap-3"
                                             >
                                                <span className="w-24 text-sm text-muted-foreground shrink-0">
                                                   {label}
                                                </span>
                                                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                                   <div
                                                      className={cn(
                                                         "h-full rounded-full transition-all",
                                                         color,
                                                      )}
                                                      style={{
                                                         width: `${val}%`,
                                                      }}
                                                   />
                                                </div>
                                                <span className="text-sm font-mono tabular-nums w-8 text-right">
                                                   {val}
                                                </span>
                                             </div>
                                          );
                                       },
                                    )}
                                 </div>
                              )}

                              {/* Strengths & Gaps */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div>
                                    <div className="flex items-center gap-1.5 text-emerald-600 mb-2">
                                       <CheckCircle2 className="h-4 w-4" />
                                       <span className="text-sm font-semibold">
                                          Strengths
                                       </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                       {screening.strengths.map((s, i) => (
                                          <li
                                             key={i}
                                             className="flex gap-2 text-sm text-muted-foreground"
                                          >
                                             <span className="text-emerald-500 mt-0.5 shrink-0">
                                                •
                                             </span>
                                             {s}
                                          </li>
                                       ))}
                                    </ul>
                                 </div>
                                 <div>
                                    <div className="flex items-center gap-1.5 text-amber-600 mb-2">
                                       <AlertCircle className="h-4 w-4" />
                                       <span className="text-sm font-semibold">
                                          Gaps / Risks
                                       </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                       {screening.gaps.map((g, i) => (
                                          <li
                                             key={i}
                                             className="flex gap-2 text-sm text-muted-foreground"
                                          >
                                             <span className="text-amber-500 mt-0.5 shrink-0">
                                                •
                                             </span>
                                             {g}
                                          </li>
                                       ))}
                                    </ul>
                                 </div>
                              </div>

                              {/* Recommendation */}
                              <div className="rounded-md border border-primary/20 bg-background p-4">
                                 <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1.5">
                                    AI Recommendation
                                 </p>
                                 <p className="text-sm leading-relaxed">
                                    {screening.recommendation}
                                 </p>
                              </div>
                           </CardContent>
                        </Card>
                     )}

                     {/* Screening History */}
                     {screeningHistory.length > 0 && (
                        <ScreeningHistoryTimeline runs={screeningHistory} />
                     )}

                     {/* Work Experience */}
                     {profile.experience && profile.experience.length > 0 && (
                        <Card>
                           <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                 <Briefcase className="h-4.5 w-4.5 text-muted-foreground" />{" "}
                                 Work Experience
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-5">
                              {profile.experience.map((exp, i) => (
                                 <div
                                    key={i}
                                    className={cn(
                                       "relative pl-5",
                                       i < profile.experience.length - 1 &&
                                          "pb-5 border-b",
                                    )}
                                 >
                                    <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary/30 border-2 border-primary" />
                                    <div className="flex flex-wrap items-start justify-between gap-1">
                                       <div>
                                          <p className="font-semibold">
                                             {exp.role}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                             {exp.company}
                                          </p>
                                       </div>
                                       <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          {exp.startDate} —{" "}
                                          {exp.isCurrent
                                             ? "Present"
                                             : exp.endDate}
                                       </span>
                                    </div>
                                    {exp.description && (
                                       <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                                          {exp.description}
                                       </p>
                                    )}
                                    {exp.technologies &&
                                       exp.technologies.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                             {exp.technologies.map((t) => (
                                                <Badge
                                                   key={t}
                                                   variant="secondary"
                                                   className="text-xs"
                                                >
                                                   {t}
                                                </Badge>
                                             ))}
                                          </div>
                                       )}
                                 </div>
                              ))}
                           </CardContent>
                        </Card>
                     )}

                     {/* Projects */}
                     {profile.projects && profile.projects.length > 0 && (
                        <Card>
                           <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                 <FolderOpen className="h-4.5 w-4.5 text-muted-foreground" />{" "}
                                 Projects
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-5">
                              {profile.projects.map((proj, i) => (
                                 <div
                                    key={i}
                                    className={cn(
                                       i < profile.projects!.length - 1 &&
                                          "pb-5 border-b",
                                    )}
                                 >
                                    <div className="flex flex-wrap items-start justify-between gap-1">
                                       <div className="flex items-center gap-2">
                                          <p className="font-semibold">
                                             {proj.name}
                                          </p>
                                          {proj.link && (
                                             <a
                                                href={proj.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:text-primary/70"
                                             >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                             </a>
                                          )}
                                       </div>
                                       <span className="text-xs text-muted-foreground">
                                          {proj.role}
                                       </span>
                                    </div>
                                    {proj.description && (
                                       <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                                          {proj.description}
                                       </p>
                                    )}
                                    {proj.technologies &&
                                       proj.technologies.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                             {proj.technologies.map((t) => (
                                                <Badge
                                                   key={t}
                                                   variant="secondary"
                                                   className="text-xs"
                                                >
                                                   {t}
                                                </Badge>
                                             ))}
                                          </div>
                                       )}
                                 </div>
                              ))}
                           </CardContent>
                        </Card>
                     )}

                     {/* Education */}
                     {profile.education && profile.education.length > 0 && (
                        <Card>
                           <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                 <GraduationCap className="h-4.5 w-4.5 text-muted-foreground" />{" "}
                                 Education
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                              {profile.education.map((edu, i) => (
                                 <div
                                    key={i}
                                    className={cn(
                                       i < profile.education.length - 1 &&
                                          "pb-4 border-b",
                                    )}
                                 >
                                    <div className="flex flex-wrap items-start justify-between gap-1">
                                       <div>
                                          <p className="font-semibold">
                                             {edu.degree} in {edu.fieldOfStudy}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                             {edu.institution}
                                          </p>
                                       </div>
                                       <span className="text-xs text-muted-foreground">
                                          {edu.startYear} —{" "}
                                          {edu.endYear ?? "Present"}
                                       </span>
                                    </div>
                                 </div>
                              ))}
                           </CardContent>
                        </Card>
                     )}
                  </div>

                  {/* ── Right sidebar ── */}
                  <div className="space-y-6">
                     {/* Job applied for */}
                     {job && (
                        <Card>
                           <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                 <Briefcase className="h-4.5 w-4.5 text-muted-foreground" />{" "}
                                 Applied Job
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-3">
                              <Link
                                 href={`/jobs/${job._id}`}
                                 className="font-semibold hover:text-primary transition-colors block"
                              >
                                 {job.title}
                              </Link>
                              <div className="flex flex-wrap gap-1.5 text-sm text-muted-foreground">
                                 <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {job.location}
                                 </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                 <Badge variant="outline">{job.type}</Badge>
                                 <Badge
                                    variant={
                                       job.status === "open"
                                          ? "success"
                                          : "secondary"
                                    }
                                    className="capitalize"
                                 >
                                    {job.status}
                                 </Badge>
                              </div>
                              {job.requiredSkills &&
                                 job.requiredSkills.length > 0 && (
                                    <div>
                                       <p className="text-xs text-muted-foreground mb-1.5">
                                          Required skills
                                       </p>
                                       <div className="flex flex-wrap gap-1">
                                          {job.requiredSkills.map((s) => (
                                             <Badge
                                                key={s}
                                                variant="secondary"
                                                className="text-xs"
                                             >
                                                {s}
                                             </Badge>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              <Button
                                 asChild
                                 variant="outline"
                                 size="sm"
                                 className="w-full mt-2"
                              >
                                 <Link href={`/jobs/${job._id}/applicants`}>
                                    <Users className="h-3.5 w-3.5 mr-1.5" />
                                    View All Applicants
                                 </Link>
                              </Button>
                           </CardContent>
                        </Card>
                     )}

                     {/* Skills */}
                     {profile.skills && profile.skills.length > 0 && (
                        <Card>
                           <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                 <Code2 className="h-4.5 w-4.5 text-muted-foreground" />{" "}
                                 Skills
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-2">
                              {profile.skills.map((skill) => (
                                 <div
                                    key={skill.name}
                                    className="flex items-center justify-between gap-2"
                                 >
                                    <span className="text-sm font-medium truncate">
                                       {skill.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                       {skill.yearsOfExperience > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                             {skill.yearsOfExperience}y
                                          </span>
                                       )}
                                       <span
                                          className={cn(
                                             "text-xs border rounded-full px-2 py-0.5",
                                             LEVEL_COLOR[skill.level] ??
                                                "bg-muted",
                                          )}
                                       >
                                          {skill.level}
                                       </span>
                                    </div>
                                 </div>
                              ))}
                           </CardContent>
                        </Card>
                     )}

                     {/* Languages */}
                     {profile.languages && profile.languages.length > 0 && (
                        <Card>
                           <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                 <Globe className="h-4.5 w-4.5 text-muted-foreground" />{" "}
                                 Languages
                              </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-2">
                              {profile.languages.map((lang) => (
                                 <div
                                    key={lang.name}
                                    className="flex items-center justify-between"
                                 >
                                    <span className="text-sm font-medium">
                                       {lang.name}
                                    </span>
                                    <span
                                       className={cn(
                                          "text-xs border rounded-full px-2 py-0.5",
                                          PROFICIENCY_COLOR[lang.proficiency] ??
                                             "bg-muted",
                                       )}
                                    >
                                       {lang.proficiency}
                                    </span>
                                 </div>
                              ))}
                           </CardContent>
                        </Card>
                     )}

                     {/* Certifications */}
                     {profile.certifications &&
                        profile.certifications.length > 0 && (
                           <Card>
                              <CardHeader className="pb-2">
                                 <CardTitle className="flex items-center gap-2 text-base">
                                    <Award className="h-4.5 w-4.5 text-muted-foreground" />{" "}
                                    Certifications
                                 </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                 {profile.certifications.map((cert, i) => (
                                    <div
                                       key={i}
                                       className={cn(
                                          i <
                                             profile.certifications!.length -
                                                1 && "pb-3 border-b",
                                       )}
                                    >
                                       <p className="text-sm font-medium">
                                          {cert.name}
                                       </p>
                                       <p className="text-xs text-muted-foreground">
                                          {cert.issuer}
                                       </p>
                                       {cert.issueDate && (
                                          <p className="text-xs text-muted-foreground">
                                             {cert.issueDate}
                                          </p>
                                       )}
                                    </div>
                                 ))}
                              </CardContent>
                           </Card>
                        )}

                     {/* Social links */}
                     {profile.socialLinks &&
                        Object.keys(profile.socialLinks).length > 0 && (
                           <Card>
                              <CardHeader className="pb-2">
                                 <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="h-4.5 w-4.5 text-muted-foreground" />{" "}
                                    Links
                                 </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                 {Object.entries(profile.socialLinks).map(
                                    ([platform, url]) =>
                                       url && (
                                          <a
                                             key={platform}
                                             href={url}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="flex items-center gap-2 text-sm text-primary hover:underline capitalize"
                                          >
                                             <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                             {platform}
                                          </a>
                                       ),
                                 )}
                              </CardContent>
                           </Card>
                        )}
                  </div>
               </div>
            </div>
         </div>
         <ActivityEmailPanel />
      </div>
   );
}
