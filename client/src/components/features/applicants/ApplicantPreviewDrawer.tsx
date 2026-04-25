"use client";

import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
   MapPin,
   Mail,
   Clock,
   ExternalLink,
   Layers,
   Globe,
   Sparkles,
   CheckCircle2,
   AlertCircle,
   Code2,
   Briefcase,
   UserCircle,
   History,
} from "lucide-react";
import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
   SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApplicantDetail } from "@/services/applicant.service";
import { cn } from "@/lib/utils";
import type { CriteriaScores } from "@/types";

const LEVEL_COLOR: Record<string, string> = {
   Beginner: "bg-slate-100 text-slate-600 border-slate-200",
   Intermediate: "bg-blue-50 text-blue-700 border-blue-200",
   Advanced: "bg-violet-50 text-violet-700 border-violet-200",
   Expert: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

interface ApplicantPreviewDrawerProps {
   applicantId: string | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function ApplicantPreviewDrawer({
   applicantId,
   open,
   onOpenChange,
}: ApplicantPreviewDrawerProps) {
   const { data, isLoading } = useApplicantDetail(applicantId ?? "");

   const applicant = data?.applicant;
   const profile = applicant?.profile;
   const screening = data?.screening;
   const screeningHistory = data?.screeningHistory ?? [];
   const job = data?.job;

   const fullName = profile
      ? `${profile.firstName} ${profile.lastName}`
      : "Applicant";
   const initials = profile
      ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
      : "?";
   const linkedin =
      profile?.socialLinks?.["linkedin"] ?? profile?.socialLinks?.["LinkedIn"];

   return (
      <Sheet
         open={open}
         onOpenChange={onOpenChange}
      >
         <SheetContent
            side="right"
            className="w-full max-w-xl overflow-hidden"
         >
            <SheetHeader>
               <SheetTitle>Applicant Preview</SheetTitle>
               <SheetDescription>
                  Quick view —{" "}
                  <Link
                     href={applicantId ? `/applicants/${applicantId}` : "#"}
                     className="text-primary hover:underline"
                     onClick={() => onOpenChange(false)}
                  >
                     open full profile
                  </Link>
               </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
               {isLoading || !profile ? (
                  <div className="space-y-3">
                     {Array.from({ length: 5 }).map((_, i) => (
                        <div
                           key={i}
                           className="h-12 rounded-lg bg-muted animate-pulse"
                        />
                     ))}
                  </div>
               ) : (
                  <>
                     {/* Hero */}
                     <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-full bg-primary/10 text-primary text-lg font-bold flex items-center justify-center shrink-0">
                           {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-bold text-base">
                                 {fullName}
                              </h2>
                              {linkedin && (
                                 <a
                                    href={linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/70"
                                 >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                 </a>
                              )}
                              <Badge
                                 variant={
                                    applicant?.source === "platform"
                                       ? "default"
                                       : "secondary"
                                 }
                                 className="gap-1"
                              >
                                 {applicant?.source === "platform" ? (
                                    <Layers className="h-3 w-3" />
                                 ) : (
                                    <Globe className="h-3 w-3" />
                                 )}
                                 {applicant?.source}
                              </Badge>
                           </div>
                           <p className="text-sm text-muted-foreground mt-0.5">
                              {profile.headline}
                           </p>
                           <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                              {profile.location && (
                                 <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {profile.location}
                                 </span>
                              )}
                              <span className="flex items-center gap-1">
                                 <Mail className="h-3 w-3" />
                                 {profile.email}
                              </span>
                              {applicant && (
                                 <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Applied{" "}
                                    {formatDistanceToNow(
                                       new Date(applicant.createdAt),
                                       { addSuffix: true },
                                    )}
                                 </span>
                              )}
                           </div>
                           {profile.availability && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                 <Badge
                                    variant={
                                       profile.availability.status ===
                                       "Available"
                                          ? "success"
                                          : "secondary"
                                    }
                                    className="text-xs"
                                 >
                                    {profile.availability.status}
                                 </Badge>
                                 <Badge
                                    variant="outline"
                                    className="text-xs"
                                 >
                                    {profile.availability.type}
                                 </Badge>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Latest screening */}
                     {screening && (
                        <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 space-y-3">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-primary">
                                 <Sparkles className="h-4 w-4" />
                                 <span className="text-sm font-semibold">
                                    Latest AI Screening
                                 </span>
                              </div>
                              <div className="text-right">
                                 <span
                                    className={cn(
                                       "text-xl font-bold tabular-nums",
                                       screening.matchScore >= 80
                                          ? "text-emerald-600"
                                          : screening.matchScore >= 60
                                            ? "text-amber-600"
                                            : "text-rose-600",
                                    )}
                                 >
                                    {screening.matchScore}%
                                 </span>
                                 <p className="text-xs text-muted-foreground">
                                    Rank #{screening.rank}
                                 </p>
                              </div>
                           </div>
                           <div
                              className={cn(
                                 "mt-1 h-2 w-full rounded-full overflow-hidden bg-muted",
                              )}
                           >
                              <div
                                 className={cn(
                                    "h-full rounded-full",
                                    screening.matchScore >= 80
                                       ? "bg-emerald-500"
                                       : screening.matchScore >= 60
                                         ? "bg-amber-500"
                                         : "bg-rose-500",
                                 )}
                                 style={{ width: `${screening.matchScore}%` }}
                              />
                           </div>
                           {screening.criteriaScores && (
                              <div className="space-y-1.5">
                                 {CRITERIA_META.map(({ key, label, color }) => {
                                    const val =
                                       screening.criteriaScores![key] ?? 0;
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
                                                   "h-full rounded-full",
                                                   color,
                                                )}
                                                style={{ width: `${val}%` }}
                                             />
                                          </div>
                                          <span className="text-xs font-mono tabular-nums w-6 text-right">
                                             {val}
                                          </span>
                                       </div>
                                    );
                                 })}
                              </div>
                           )}
                           <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                 <div className="flex items-center gap-1 text-emerald-600 mb-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span className="text-xs font-semibold">
                                       Strengths
                                    </span>
                                 </div>
                                 <ul className="space-y-1">
                                    {screening.strengths
                                       .slice(0, 3)
                                       .map((s, i) => (
                                          <li
                                             key={i}
                                             className="flex gap-1.5 text-xs text-muted-foreground"
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
                                 <div className="flex items-center gap-1 text-amber-600 mb-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span className="text-xs font-semibold">
                                       Gaps
                                    </span>
                                 </div>
                                 <ul className="space-y-1">
                                    {screening.gaps.slice(0, 3).map((g, i) => (
                                       <li
                                          key={i}
                                          className="flex gap-1.5 text-xs text-muted-foreground"
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
                           <div className="rounded-md bg-background border p-3">
                              <p className="text-xs text-primary font-semibold mb-1">
                                 Recommendation
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                 {screening.recommendation}
                              </p>
                           </div>
                           <p className="text-xs text-muted-foreground">
                              Screened{" "}
                              {format(
                                 new Date(screening.screenedAt),
                                 "MMM d, yyyy 'at' HH:mm",
                              )}
                           </p>
                        </div>
                     )}

                     {/* Screening history mini-timeline */}
                     {screeningHistory.length > 1 && (
                        <div>
                           <div className="flex items-center gap-2 mb-3">
                              <History className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-semibold">
                                 Score across {screeningHistory.length} runs
                              </span>
                           </div>
                           <div className="flex items-end gap-1.5 h-10">
                              {[...screeningHistory].reverse().map((run, i) => {
                                 const height = Math.max(
                                    6,
                                    (run.matchScore / 100) * 40,
                                 );
                                 return (
                                    <div
                                       key={run.runNumber}
                                       className="flex flex-col items-center gap-0.5 flex-1"
                                       title={`Run ${run.runNumber}: ${run.matchScore}%`}
                                    >
                                       <div
                                          className={cn(
                                             "w-full rounded-t-sm",
                                             run.matchScore >= 80
                                                ? "bg-emerald-400"
                                                : run.matchScore >= 60
                                                  ? "bg-amber-400"
                                                  : "bg-rose-400",
                                             i === screeningHistory.length - 1
                                                ? "opacity-100"
                                                : "opacity-50",
                                          )}
                                          style={{ height: `${height}px` }}
                                       />
                                       <span className="text-[10px] text-muted-foreground">
                                          R{run.runNumber}
                                       </span>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     )}

                     {/* Skills */}
                     {profile.skills && profile.skills.length > 0 && (
                        <div>
                           <div className="flex items-center gap-2 mb-2">
                              <Code2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-semibold">
                                 Skills
                              </span>
                           </div>
                           <div className="flex flex-wrap gap-1.5">
                              {profile.skills.map((s) => (
                                 <span
                                    key={s.name}
                                    className={cn(
                                       "text-xs border rounded-full px-2.5 py-0.5",
                                       LEVEL_COLOR[s.level] ?? "bg-muted",
                                    )}
                                 >
                                    {s.name}
                                 </span>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Applied job */}
                     {job && (
                        <div className="rounded-lg border p-3">
                           <div className="flex items-center gap-1.5 mb-1">
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                 Applied for
                              </span>
                           </div>
                           <Link
                              href={`/jobs/${job._id}`}
                              className="text-sm font-semibold hover:text-primary transition-colors block"
                           >
                              {job.title}
                           </Link>
                           <div className="flex gap-1.5 mt-1.5">
                              <Badge
                                 variant="outline"
                                 className="text-xs"
                              >
                                 {job.type}
                              </Badge>
                              <Badge
                                 variant={
                                    job.status === "open"
                                       ? "success"
                                       : "secondary"
                                 }
                                 className="text-xs capitalize"
                              >
                                 {job.status}
                              </Badge>
                           </div>
                        </div>
                     )}

                     {/* Actions */}
                     <div className="flex gap-2 pt-2">
                        <Button
                           asChild
                           className="flex-1 gap-1.5"
                           onClick={() => onOpenChange(false)}
                        >
                           <Link
                              href={
                                 applicantId
                                    ? `/applicants/${applicantId}`
                                    : "#"
                              }
                           >
                              <UserCircle className="h-4 w-4" />
                              Full Profile
                           </Link>
                        </Button>
                        {job && (
                           <Button
                              asChild
                              variant="outline"
                              className="flex-1 gap-1.5"
                              onClick={() => onOpenChange(false)}
                           >
                              <Link href={`/jobs/${job._id}/applicants`}>
                                 View in Job
                              </Link>
                           </Button>
                        )}
                     </div>
                  </>
               )}
            </div>
         </SheetContent>
      </Sheet>
   );
}
