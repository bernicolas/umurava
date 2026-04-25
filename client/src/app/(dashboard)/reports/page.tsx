"use client";

import React, { useMemo } from "react";
import {
   AreaChart,
   Area,
   BarChart,
   Bar,
   PieChart,
   Pie,
   Cell,
   RadarChart,
   Radar,
   PolarGrid,
   PolarAngleAxis,
   PolarRadiusAxis,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   Legend,
   ResponsiveContainer,
} from "recharts";
import {
   BarChart2,
   FileSpreadsheet,
   TrendingUp,
   Users,
   Briefcase,
   Sparkles,
   CheckCircle2,
   Star,
   Trophy,
   Target,
   Activity,
   ChevronDown,
   FileText,
   Layers,
   ArrowUpRight,
   Medal,
   BarChart3,
   PieChart as PieChartIcon,
   MapPin,
   Zap,
   UserCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardStats, useJobs } from "@/services/job.service";
import { useAllShortlists } from "@/services/screening.service";
import { exportToCsv } from "@/lib/exportCsv";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ShortlistedCandidate, ShortlistWithJob } from "@/types";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
   primary: "hsl(221,72%,46%)",
   primaryMid: "hsl(221,72%,60%)",
   violet: "#8b5cf6",
   emerald: "#10b981",
   amber: "#f59e0b",
   sky: "#0ea5e9",
   rose: "#f43f5e",
   slate: "#94a3b8",
};

const PIE_PALETTE = [C.primary, C.emerald, C.amber, C.violet, C.rose, C.sky];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function avg(nums: number[]) {
   return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

function getCandidateName(c: ShortlistedCandidate) {
   return c.applicant?.profile
      ? `${c.applicant.profile.firstName} ${c.applicant.profile.lastName}`
      : `Candidate #${c.rank}`;
}

function getInitials(c: ShortlistedCandidate) {
   return c.applicant?.profile
      ? (
           c.applicant.profile.firstName[0] + c.applicant.profile.lastName[0]
        ).toUpperCase()
      : `${c.rank}`;
}

function scoreTextClass(s: number) {
   if (s >= 80) return "text-emerald-600";
   if (s >= 60) return "text-amber-600";
   return "text-rose-500";
}

function scoreBgClass(s: number) {
   if (s >= 80) return "bg-emerald-500";
   if (s >= 60) return "bg-amber-500";
   return "bg-rose-500";
}

function scoreRingClass(s: number) {
   if (s >= 80) return "ring-emerald-200 bg-emerald-50 text-emerald-700";
   if (s >= 60) return "ring-amber-200 bg-amber-50 text-amber-700";
   return "ring-rose-200 bg-rose-50 text-rose-600";
}

// ─── Excel export (dynamic import to avoid SSR issues) ───────────────────────
function exportFullExcel(
   overviewRows: Record<string, unknown>[],
   jobRows: Record<string, unknown>[],
   candidateRows: Record<string, unknown>[],
   trendRows: Record<string, unknown>[],
) {
   import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const addSheet = (name: string, rows: Record<string, unknown>[]) => {
         if (rows.length)
            XLSX.utils.book_append_sheet(
               wb,
               XLSX.utils.json_to_sheet(rows),
               name,
            );
      };
      addSheet("Overview", overviewRows);
      addSheet("Job Performance", jobRows);
      addSheet("Top Candidates", candidateRows);
      addSheet("Monthly Trend", trendRows);
      XLSX.writeFile(
         wb,
         `umurava-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
   });
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────
function ChartTip({
   active,
   payload,
   label,
}: {
   active?: boolean;
   payload?: { name: string; value: number; color: string }[];
   label?: string;
}) {
   if (!active || !payload?.length) return null;
   return (
      <div className="rounded-2xl border bg-card/95 backdrop-blur-sm shadow-2xl px-4 py-3 text-sm min-w-32">
         {label && (
            <p className="font-semibold text-foreground mb-2 pb-2 border-b text-xs uppercase tracking-wide">
               {label}
            </p>
         )}
         {payload.map((p) => (
            <div
               key={p.name}
               className="flex items-center justify-between gap-4"
            >
               <div className="flex items-center gap-1.5">
                  <span
                     className="inline-block h-2 w-2 rounded-full shrink-0"
                     style={{ background: p.color }}
                  />
                  <span className="text-muted-foreground text-xs">
                     {p.name}
                  </span>
               </div>
               <span
                  className="font-bold text-xs"
                  style={{ color: p.color }}
               >
                  {p.value}
               </span>
            </div>
         ))}
      </div>
   );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ className }: { className?: string }) {
   return (
      <div className={cn("bg-muted/70 animate-pulse rounded-xl", className)} />
   );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyChart({ message }: { message: string }) {
   return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
         <BarChart3 className="h-8 w-8 opacity-30" />
         <p className="text-sm">{message}</p>
      </div>
   );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({
   label,
   value,
   sub,
   icon: Icon,
   iconBg,
   iconColor,
   accentBar,
   isLoading,
}: {
   label: string;
   value: string | number;
   sub?: string;
   icon: React.ElementType;
   iconBg: string;
   iconColor: string;
   accentBar: string;
   isLoading: boolean;
}) {
   return (
      <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border shadow-sm">
         <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ background: accentBar }}
         />
         <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
               <div
                  className={cn(
                     "flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm",
                     iconBg,
                  )}
               >
                  <Icon className={cn("h-5 w-5", iconColor)} />
               </div>
            </div>
            {isLoading ? (
               <div className="space-y-2">
                  <Sk className="h-8 w-20" />
                  <Sk className="h-4 w-28" />
               </div>
            ) : (
               <>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                     {value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                     {label}
                  </p>
                  {sub && (
                     <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {sub}
                     </p>
                  )}
               </>
            )}
         </CardContent>
      </Card>
   );
}

// ─── Candidate card (top shortlists grid) ────────────────────────────────────
function CandidateCard({
   candidate,
   rank,
}: {
   candidate: ShortlistedCandidate & { jobTitle: string };
   rank: number;
}) {
   const score = candidate.matchScore;
   const name = getCandidateName(candidate);
   const initials = getInitials(candidate);
   const profile = candidate.applicant?.profile;

   const CRITERIA = [
      { key: "skills" as const, label: "Skills", color: C.violet },
      { key: "experience" as const, label: "Exp.", color: C.primary },
      { key: "education" as const, label: "Edu.", color: C.emerald },
      { key: "projects" as const, label: "Proj.", color: C.amber },
      { key: "availability" as const, label: "Avail.", color: C.sky },
   ];

   return (
      <Card className="group hover:shadow-xl transition-all duration-300 border overflow-hidden">
         {/* Top accent bar */}
         <div
            className="h-1 w-full"
            style={{
               background:
                  rank <= 3
                     ? `linear-gradient(90deg, ${rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : "#f97316"}, transparent)`
                     : `linear-gradient(90deg, ${C.primary}, transparent)`,
            }}
         />
         <CardContent className="p-5">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
               <div className="relative shrink-0">
                  <div
                     className={cn(
                        "h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-sm",
                     )}
                     style={{
                        background:
                           rank === 1
                              ? "linear-gradient(135deg,#f59e0b,#d97706)"
                              : rank === 2
                                ? "linear-gradient(135deg,#94a3b8,#64748b)"
                                : rank === 3
                                  ? "linear-gradient(135deg,#f97316,#ea580c)"
                                  : `linear-gradient(135deg,${C.primary},${C.primaryMid})`,
                     }}
                  >
                     {initials}
                  </div>
                  {rank <= 3 && (
                     <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white shadow-sm border flex items-center justify-center">
                        {rank === 1 ? (
                           <span className="text-[9px]">🥇</span>
                        ) : rank === 2 ? (
                           <span className="text-[9px]">🥈</span>
                        ) : (
                           <span className="text-[9px]">🥉</span>
                        )}
                     </div>
                  )}
               </div>
               <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate leading-tight">
                     {name}
                  </p>
                  {profile?.headline && (
                     <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {profile.headline}
                     </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                     {candidate.jobTitle}
                  </p>
               </div>
            </div>

            {/* Score badge */}
            <div className="flex items-center justify-between mb-4">
               <span
                  className={cn(
                     "text-xs font-semibold px-2.5 py-1 rounded-full ring-1",
                     scoreRingClass(score),
                  )}
               >
                  #{rank} Rank
               </span>
               <div className="flex items-center gap-1.5">
                  <span
                     className={cn(
                        "text-2xl font-black tabular-nums",
                        scoreTextClass(score),
                     )}
                  >
                     {score}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                     %
                  </span>
               </div>
            </div>

            {/* Score bar */}
            <div className="mb-4">
               <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                     className={cn(
                        "h-full rounded-full transition-all duration-700",
                        scoreBgClass(score),
                     )}
                     style={{ width: `${score}%` }}
                  />
               </div>
            </div>

            {/* Criteria mini bars */}
            {candidate.criteriaScores && (
               <div className="space-y-1.5">
                  {CRITERIA.map(({ key, label, color }) => {
                     const cs = candidate.criteriaScores!;
                     return (
                        <div
                           key={key}
                           className="flex items-center gap-2"
                        >
                           <span className="text-[11px] text-muted-foreground w-10 shrink-0">
                              {label}
                           </span>
                           <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                 className="h-full rounded-full"
                                 style={{
                                    width: `${cs[key]}%`,
                                    background: color,
                                 }}
                              />
                           </div>
                           <span className="text-[11px] font-bold w-7 text-right tabular-nums text-muted-foreground">
                              {cs[key]}
                           </span>
                        </div>
                     );
                  })}
               </div>
            )}

            {/* Location */}
            {profile?.location && (
               <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground/70">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{profile.location}</span>
               </div>
            )}
         </CardContent>
      </Card>
   );
}

// ─── Shortlist summary card ───────────────────────────────────────────────────
function ShortlistSummaryCard({ sl }: { sl: ShortlistWithJob }) {
   const selected = sl.finalSelection?.selectedCandidateIds.length ?? 0;
   const scores = sl.shortlist.map((c) => c.matchScore);
   const topScore = scores.length ? Math.max(...scores) : 0;
   const avgScore = Math.round(avg(scores));

   return (
      <Card className="hover:shadow-md transition-all border">
         <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
               <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                     {sl.job?.title ?? "Unknown Position"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                     <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1.5"
                     >
                        {sl.job?.type ?? "—"}
                     </Badge>
                     {sl.job?.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                           <MapPin className="h-2.5 w-2.5" />
                           {sl.job.location}
                        </span>
                     )}
                  </div>
               </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
               <div className="bg-muted/40 rounded-xl p-2.5">
                  <p className="text-lg font-black text-foreground">
                     {sl.totalApplicants}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                     Applied
                  </p>
               </div>
               <div className="bg-violet-50 rounded-xl p-2.5">
                  <p className="text-lg font-black text-violet-600">
                     {sl.shortlist.length}
                  </p>
                  <p className="text-[10px] text-violet-500 mt-0.5">Listed</p>
               </div>
               <div className="bg-emerald-50 rounded-xl p-2.5">
                  <p className="text-lg font-black text-emerald-600">
                     {selected || "—"}
                  </p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">
                     Selected
                  </p>
               </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
               <span>
                  Top:{" "}
                  <strong className={scoreTextClass(topScore)}>
                     {topScore}%
                  </strong>
               </span>
               <span>
                  Avg:{" "}
                  <strong className={scoreTextClass(avgScore)}>
                     {avgScore}%
                  </strong>
               </span>
               <span className="text-muted-foreground/60">
                  {format(new Date(sl.screenedAt), "MMM d, yyyy")}
               </span>
            </div>
         </CardContent>
      </Card>
   );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHead({
   title,
   desc,
   icon: Icon,
}: {
   title: string;
   desc?: string;
   icon?: React.ElementType;
}) {
   return (
      <div className="flex items-center gap-3 mb-5">
         {Icon && (
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
               <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
         )}
         <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
         </div>
      </div>
   );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
   const { data: stats, isLoading: statsLoading } = useDashboardStats();
   const { data: shortlists = [], isLoading: shortlistsLoading } =
      useAllShortlists();
   const { data: jobsData, isLoading: jobsLoading } = useJobs({ limit: 200 });

   const isLoading = statsLoading || shortlistsLoading || jobsLoading;
   const jobs = jobsData?.items ?? [];
   const trend = stats?.trend ?? [];

   // ── Computed analytics ────────────────────────────────────────────────────
   const D = useMemo(() => {
      const allCandidates = shortlists.flatMap((s) =>
         s.shortlist.map((c) => ({
            ...c,
            jobTitle: s.job?.title ?? "Unknown Position",
            jobId: s.jobId,
         })),
      );

      // Top 12 by matchScore
      const topCandidates = [...allCandidates]
         .sort((a, b) => b.matchScore - a.matchScore)
         .slice(0, 12);

      // Criteria averages
      const withCriteria = allCandidates.filter((c) => c.criteriaScores);
      const radarData = [
         {
            subject: "Skills",
            score: Math.round(
               avg(withCriteria.map((c) => c.criteriaScores!.skills)),
            ),
         },
         {
            subject: "Experience",
            score: Math.round(
               avg(withCriteria.map((c) => c.criteriaScores!.experience)),
            ),
         },
         {
            subject: "Education",
            score: Math.round(
               avg(withCriteria.map((c) => c.criteriaScores!.education)),
            ),
         },
         {
            subject: "Projects",
            score: Math.round(
               avg(withCriteria.map((c) => c.criteriaScores!.projects)),
            ),
         },
         {
            subject: "Availability",
            score: Math.round(
               avg(withCriteria.map((c) => c.criteriaScores!.availability)),
            ),
         },
      ];

      // Score distribution (0–10, 10–20 … 90–100)
      const scoreDistribution = Array.from({ length: 10 }, (_, i) => {
         const lo = i * 10;
         const hi = lo + 10;
         return {
            range: `${lo}–${hi}`,
            count: allCandidates.filter(
               (c) => c.matchScore >= lo && c.matchScore < (i === 9 ? 101 : hi),
            ).length,
         };
      });

      // Per-job performance
      const jobPerformance = shortlists
         .filter((s) => s.job)
         .map((s) => {
            const scores = s.shortlist.map((c) => c.matchScore);
            const selected = s.finalSelection?.selectedCandidateIds.length ?? 0;
            const title = s.job?.title ?? "Unknown";
            return {
               title: title.length > 22 ? title.slice(0, 22) + "…" : title,
               fullTitle: title,
               applicants: s.totalApplicants,
               shortlisted: s.shortlist.length,
               selected,
               avgScore: Math.round(avg(scores)),
               topScore: scores.length ? Math.round(Math.max(...scores)) : 0,
            };
         })
         .sort((a, b) => b.avgScore - a.avgScore);

      // Job status pie
      const statusCounts = {
         Open: jobs.filter((j) => j.status === "open").length,
         Closed: jobs.filter((j) => j.status === "closed").length,
         Draft: jobs.filter((j) => j.status === "draft").length,
      };
      const statusPie = Object.entries(statusCounts)
         .filter(([, v]) => v > 0)
         .map(([name, value]) => ({ name, value }));

      // Screening status pie
      const screenedCount = jobs.filter(
         (j) => j.screeningStatus === "done",
      ).length;
      const screeningPie = [
         { name: "Screened", value: screenedCount },
         { name: "Pending", value: jobs.length - screenedCount },
      ].filter((d) => d.value > 0);

      // Totals
      const totalShortlisted = shortlists.reduce(
         (s, r) => s + r.shortlist.length,
         0,
      );
      const totalSelected = shortlists.reduce(
         (s, r) => s + (r.finalSelection?.selectedCandidateIds.length ?? 0),
         0,
      );
      const totalPool = shortlists.reduce(
         (s, r) => s + (r.finalSelection?.talentPoolCandidateIds?.length ?? 0),
         0,
      );

      // Hiring funnel
      const screened = shortlists.reduce((s, r) => s + r.totalApplicants, 0);
      const totalApps = stats?.totalApplicants ?? 0;
      const safePct = (n: number) =>
         totalApps ? Math.round((n / totalApps) * 100) : 0;

      const funnelSteps = [
         {
            name: "Total Applicants",
            value: totalApps,
            color: C.primary,
            pct: 100,
         },
         {
            name: "AI Screened",
            value: screened,
            color: C.violet,
            pct: safePct(screened),
         },
         {
            name: "Shortlisted",
            value: totalShortlisted,
            color: C.sky,
            pct: safePct(totalShortlisted),
         },
         {
            name: "Selected",
            value: totalSelected,
            color: C.emerald,
            pct: safePct(totalSelected),
         },
      ];

      return {
         allCandidates,
         topCandidates,
         radarData,
         scoreDistribution,
         jobPerformance,
         statusPie,
         screeningPie,
         funnelSteps,
         totalShortlisted,
         totalSelected,
         totalPool,
      };
   }, [shortlists, jobs, stats]);

   // ── Export handlers ───────────────────────────────────────────────────────
   const overviewExportRows = [
      { Metric: "Total Jobs", Value: jobs.length },
      {
         Metric: "Open Jobs",
         Value: D.statusPie.find((s) => s.name === "Open")?.value ?? 0,
      },
      { Metric: "Total Applicants", Value: stats?.totalApplicants ?? 0 },
      { Metric: "Screening Runs", Value: stats?.totalRuns ?? 0 },
      {
         Metric: "Avg Match Score",
         Value: `${stats?.avgMatchScore ? Math.round(stats.avgMatchScore * 100) : 0}%`,
      },
      { Metric: "Total Shortlisted", Value: D.totalShortlisted },
      { Metric: "Total Selected", Value: D.totalSelected },
      { Metric: "Talent Pool Size", Value: D.totalPool },
   ];

   const jobExportRows = D.jobPerformance.map((j) => ({
      "Job Title": j.fullTitle,
      "Total Applicants": j.applicants,
      Shortlisted: j.shortlisted,
      Selected: j.selected,
      "Avg Match Score (%)": j.avgScore,
      "Top Score (%)": j.topScore,
   }));

   const candidateExportRows = D.topCandidates.map((c, i) => ({
      Rank: i + 1,
      Name: getCandidateName(c),
      Email: c.applicant?.profile?.email ?? "",
      "Applied For": c.jobTitle,
      "Match Score (%)": c.matchScore,
      "Skills (%)": c.criteriaScores?.skills ?? "",
      "Experience (%)": c.criteriaScores?.experience ?? "",
      "Education (%)": c.criteriaScores?.education ?? "",
      "Projects (%)": c.criteriaScores?.projects ?? "",
      "Availability (%)": c.criteriaScores?.availability ?? "",
      Recommendation: c.recommendation,
      Strengths: c.strengths.join("; "),
      Gaps: c.gaps.join("; "),
   }));

   const trendExportRows = trend.map((t) => ({
      Month: t.month,
      Applications: t.applications,
      Screened: t.screened,
   }));

   const handleExportFull = () =>
      exportFullExcel(
         overviewExportRows,
         jobExportRows,
         candidateExportRows,
         trendExportRows,
      );

   const handleExportOverview = () =>
      exportToCsv("umurava-overview", overviewExportRows);
   const handleExportJobs = () =>
      exportToCsv("umurava-job-performance", jobExportRows);
   const handleExportCandidates = () =>
      exportToCsv("umurava-top-candidates", candidateExportRows);

   // ── Derived display values ────────────────────────────────────────────────
   const avgScorePct = stats?.avgMatchScore
      ? Math.round(stats.avgMatchScore * 100)
      : 0;
   const openCount = D.statusPie.find((s) => s.name === "Open")?.value ?? 0;

   // ── Render ────────────────────────────────────────────────────────────────
   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header
            title="Reports & Analytics"
            actions={
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        size="sm"
                        className="gap-2 shadow-sm"
                     >
                        <FileSpreadsheet className="h-4 w-4" />
                        Export
                        <ChevronDown className="h-3.5 w-3.5" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     align="end"
                     className="w-56"
                  >
                     <DropdownMenuLabel className="text-xs">
                        Export Reports
                     </DropdownMenuLabel>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        onClick={handleExportFull}
                        className="gap-2.5 cursor-pointer"
                     >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                           <p className="font-semibold text-sm">
                              Full Report (.xlsx)
                           </p>
                           <p className="text-xs text-muted-foreground">
                              All 4 sheets in one file
                           </p>
                        </div>
                     </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        onClick={handleExportOverview}
                        className="gap-2 cursor-pointer"
                     >
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        Overview Stats (.csv)
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={handleExportJobs}
                        className="gap-2 cursor-pointer"
                     >
                        <Briefcase className="h-4 w-4 text-violet-600 shrink-0" />
                        Job Performance (.csv)
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={handleExportCandidates}
                        className="gap-2 cursor-pointer"
                     >
                        <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                        Top Candidates (.csv)
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            }
         />

         <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Tabs
               defaultValue="overview"
               className="space-y-6"
            >
               {/* ── Tab bar ── */}
               <TabsList className="h-10 gap-0.5 bg-muted/60 p-1 rounded-xl">
                  <TabsTrigger
                     value="overview"
                     className="gap-1.5 rounded-lg text-sm data-[state=active]:shadow-sm"
                  >
                     <BarChart3 className="h-3.5 w-3.5" />
                     Overview
                  </TabsTrigger>
                  <TabsTrigger
                     value="screening"
                     className="gap-1.5 rounded-lg text-sm data-[state=active]:shadow-sm"
                  >
                     <Sparkles className="h-3.5 w-3.5" />
                     Screening
                  </TabsTrigger>
                  <TabsTrigger
                     value="shortlists"
                     className="gap-1.5 rounded-lg text-sm data-[state=active]:shadow-sm"
                  >
                     <Trophy className="h-3.5 w-3.5" />
                     Shortlists
                  </TabsTrigger>
               </TabsList>

               {/* ══════════════════════════════════════════════════════════ */}
               {/*  TAB 1 — OVERVIEW                                          */}
               {/* ══════════════════════════════════════════════════════════ */}
               <TabsContent
                  value="overview"
                  className="space-y-6 mt-0"
               >
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                     <KpiCard
                        label="Total Jobs"
                        value={isLoading ? "—" : jobs.length}
                        sub={`${openCount} open`}
                        icon={Briefcase}
                        iconBg="bg-primary/10"
                        iconColor="text-primary"
                        accentBar={C.primary}
                        isLoading={isLoading}
                     />
                     <KpiCard
                        label="Total Applicants"
                        value={
                           isLoading
                              ? "—"
                              : (stats?.totalApplicants ?? 0).toLocaleString()
                        }
                        icon={Users}
                        iconBg="bg-emerald-100"
                        iconColor="text-emerald-600"
                        accentBar={C.emerald}
                        isLoading={isLoading}
                     />
                     <KpiCard
                        label="Screening Runs"
                        value={isLoading ? "—" : (stats?.totalRuns ?? 0)}
                        sub={`${shortlists.length} jobs screened`}
                        icon={Sparkles}
                        iconBg="bg-violet-100"
                        iconColor="text-violet-600"
                        accentBar={C.violet}
                        isLoading={isLoading}
                     />
                     <KpiCard
                        label="Avg Match Score"
                        value={isLoading ? "—" : `${avgScorePct}%`}
                        icon={Target}
                        iconBg="bg-amber-100"
                        iconColor="text-amber-600"
                        accentBar={C.amber}
                        isLoading={isLoading}
                     />
                     <KpiCard
                        label="Shortlisted"
                        value={
                           isLoading ? "—" : D.totalShortlisted.toLocaleString()
                        }
                        icon={Star}
                        iconBg="bg-sky-100"
                        iconColor="text-sky-600"
                        accentBar={C.sky}
                        isLoading={isLoading}
                     />
                     <KpiCard
                        label="Selected"
                        value={
                           isLoading ? "—" : D.totalSelected.toLocaleString()
                        }
                        sub={`${D.totalPool} in talent pool`}
                        icon={CheckCircle2}
                        iconBg="bg-emerald-100"
                        iconColor="text-emerald-700"
                        accentBar={C.emerald}
                        isLoading={isLoading}
                     />
                  </div>

                  {/* Charts row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                     {/* Monthly Trend — spans 2 cols */}
                     <Card className="lg:col-span-2 border shadow-sm">
                        <CardHeader className="pb-1 pt-5 px-6">
                           <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                 <TrendingUp className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                 <CardTitle className="text-sm font-semibold">
                                    Monthly Hiring Trend
                                 </CardTitle>
                                 <p className="text-xs text-muted-foreground">
                                    Applications received vs AI screened
                                 </p>
                              </div>
                           </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                           {isLoading ? (
                              <Sk className="h-56 mt-2" />
                           ) : trend.length === 0 ? (
                              <EmptyChart message="No trend data yet" />
                           ) : (
                              <ResponsiveContainer
                                 width="100%"
                                 height={220}
                              >
                                 <AreaChart
                                    data={trend}
                                    margin={{
                                       top: 10,
                                       right: 10,
                                       bottom: 0,
                                       left: -10,
                                    }}
                                 >
                                    <defs>
                                       <linearGradient
                                          id="gApps"
                                          x1="0"
                                          y1="0"
                                          x2="0"
                                          y2="1"
                                       >
                                          <stop
                                             offset="5%"
                                             stopColor={C.primary}
                                             stopOpacity={0.18}
                                          />
                                          <stop
                                             offset="95%"
                                             stopColor={C.primary}
                                             stopOpacity={0}
                                          />
                                       </linearGradient>
                                       <linearGradient
                                          id="gScreened"
                                          x1="0"
                                          y1="0"
                                          x2="0"
                                          y2="1"
                                       >
                                          <stop
                                             offset="5%"
                                             stopColor={C.violet}
                                             stopOpacity={0.18}
                                          />
                                          <stop
                                             offset="95%"
                                             stopColor={C.violet}
                                             stopOpacity={0}
                                          />
                                       </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                       strokeDasharray="3 3"
                                       stroke="hsl(220 15% 93%)"
                                       vertical={false}
                                    />
                                    <XAxis
                                       dataKey="month"
                                       tick={{ fontSize: 11 }}
                                       tickLine={false}
                                       axisLine={false}
                                    />
                                    <YAxis
                                       tick={{ fontSize: 11 }}
                                       tickLine={false}
                                       axisLine={false}
                                    />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend
                                       iconType="circle"
                                       iconSize={8}
                                       wrapperStyle={{ fontSize: 12 }}
                                    />
                                    <Area
                                       type="monotone"
                                       dataKey="applications"
                                       name="Applications"
                                       stroke={C.primary}
                                       fill="url(#gApps)"
                                       strokeWidth={2.5}
                                       dot={false}
                                       activeDot={{ r: 4 }}
                                    />
                                    <Area
                                       type="monotone"
                                       dataKey="screened"
                                       name="Screened"
                                       stroke={C.violet}
                                       fill="url(#gScreened)"
                                       strokeWidth={2.5}
                                       dot={false}
                                       activeDot={{ r: 4 }}
                                    />
                                 </AreaChart>
                              </ResponsiveContainer>
                           )}
                        </CardContent>
                     </Card>

                     {/* Job Status Pie */}
                     <Card className="border shadow-sm">
                        <CardHeader className="pb-1 pt-5 px-6">
                           <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                 <PieChartIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                 <CardTitle className="text-sm font-semibold">
                                    Job Status
                                 </CardTitle>
                                 <p className="text-xs text-muted-foreground">
                                    Posting breakdown
                                 </p>
                              </div>
                           </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-5">
                           {isLoading ? (
                              <Sk className="h-48 mt-2" />
                           ) : D.statusPie.length === 0 ? (
                              <EmptyChart message="No jobs yet" />
                           ) : (
                              <>
                                 <ResponsiveContainer
                                    width="100%"
                                    height={160}
                                 >
                                    <PieChart>
                                       <Pie
                                          data={D.statusPie}
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={46}
                                          outerRadius={72}
                                          paddingAngle={4}
                                          dataKey="value"
                                          strokeWidth={0}
                                       >
                                          {D.statusPie.map((_, idx) => (
                                             <Cell
                                                key={idx}
                                                fill={
                                                   PIE_PALETTE[
                                                      idx % PIE_PALETTE.length
                                                   ]
                                                }
                                             />
                                          ))}
                                       </Pie>
                                       <Tooltip formatter={(v, n) => [v, n]} />
                                    </PieChart>
                                 </ResponsiveContainer>
                                 <div className="space-y-2.5 mt-2">
                                    {D.statusPie.map((entry, i) => (
                                       <div
                                          key={entry.name}
                                          className="flex items-center justify-between text-sm"
                                       >
                                          <div className="flex items-center gap-2">
                                             <div
                                                className="h-2.5 w-2.5 rounded-sm"
                                                style={{
                                                   background:
                                                      PIE_PALETTE[
                                                         i % PIE_PALETTE.length
                                                      ],
                                                }}
                                             />
                                             <span className="text-muted-foreground capitalize">
                                                {entry.name}
                                             </span>
                                          </div>
                                          <span className="font-bold">
                                             {entry.value}
                                          </span>
                                       </div>
                                    ))}
                                 </div>
                              </>
                           )}
                        </CardContent>
                     </Card>
                  </div>

                  {/* Hiring Funnel */}
                  <Card className="border shadow-sm">
                     <CardHeader className="pb-3 pt-5 px-6">
                        <div className="flex items-center gap-2">
                           <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Layers className="h-4 w-4 text-primary" />
                           </div>
                           <div>
                              <CardTitle className="text-sm font-semibold">
                                 Hiring Funnel
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                 Candidate journey through each stage
                              </p>
                           </div>
                        </div>
                     </CardHeader>
                     <CardContent className="px-6 pb-6">
                        {isLoading ? (
                           <div className="space-y-3 max-w-2xl mx-auto">
                              {[1, 2, 3, 4].map((i) => (
                                 <Sk
                                    key={i}
                                    className="h-14"
                                 />
                              ))}
                           </div>
                        ) : (
                           <div className="space-y-4 max-w-2xl mx-auto">
                              {D.funnelSteps.map((step, i) => (
                                 <div
                                    key={step.name}
                                    className="group"
                                 >
                                    <div className="flex items-center justify-between mb-1.5">
                                       <div className="flex items-center gap-2.5">
                                          <div
                                             className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm"
                                             style={{
                                                background: step.color,
                                             }}
                                          >
                                             {i + 1}
                                          </div>
                                          <span className="text-sm font-semibold text-foreground">
                                             {step.name}
                                          </span>
                                       </div>
                                       <div className="flex items-center gap-3">
                                          <span className="text-sm font-bold tabular-nums">
                                             {step.value.toLocaleString()}
                                          </span>
                                          <span
                                             className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                                             style={{
                                                background: step.color,
                                             }}
                                          >
                                             {step.pct}%
                                          </span>
                                       </div>
                                    </div>
                                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                                       <div
                                          className="h-full rounded-full transition-all duration-700 ease-out"
                                          style={{
                                             width: `${step.pct}%`,
                                             background: `linear-gradient(90deg, ${step.color}, ${step.color}cc)`,
                                          }}
                                       />
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </CardContent>
                  </Card>
               </TabsContent>

               {/* ══════════════════════════════════════════════════════════ */}
               {/*  TAB 2 — SCREENING PERFORMANCE                             */}
               {/* ══════════════════════════════════════════════════════════ */}
               <TabsContent
                  value="screening"
                  className="space-y-6 mt-0"
               >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                     {/* Per-job horizontal bar */}
                     <Card className="border shadow-sm">
                        <CardHeader className="pb-1 pt-5 px-6">
                           <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                 <BarChart2 className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                 <CardTitle className="text-sm font-semibold">
                                    Per-Job Performance
                                 </CardTitle>
                                 <p className="text-xs text-muted-foreground">
                                    Applicants → shortlisted → selected
                                 </p>
                              </div>
                           </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                           {isLoading ? (
                              <Sk className="h-72 mt-2" />
                           ) : D.jobPerformance.length === 0 ? (
                              <EmptyChart message="No screening data yet" />
                           ) : (
                              <ResponsiveContainer
                                 width="100%"
                                 height={Math.max(
                                    220,
                                    D.jobPerformance.length * 52,
                                 )}
                              >
                                 <BarChart
                                    data={D.jobPerformance}
                                    layout="vertical"
                                    margin={{
                                       left: 0,
                                       right: 16,
                                       top: 4,
                                       bottom: 4,
                                    }}
                                    barCategoryGap="28%"
                                    barGap={3}
                                 >
                                    <CartesianGrid
                                       strokeDasharray="3 3"
                                       horizontal={false}
                                       stroke="hsl(220 15% 93%)"
                                    />
                                    <XAxis
                                       type="number"
                                       tick={{ fontSize: 11 }}
                                       tickLine={false}
                                       axisLine={false}
                                    />
                                    <YAxis
                                       type="category"
                                       dataKey="title"
                                       tick={{ fontSize: 11 }}
                                       tickLine={false}
                                       axisLine={false}
                                       width={110}
                                    />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend
                                       iconType="circle"
                                       iconSize={8}
                                       wrapperStyle={{ fontSize: 12 }}
                                    />
                                    <Bar
                                       dataKey="applicants"
                                       name="Applicants"
                                       fill={C.primary}
                                       radius={[0, 4, 4, 0]}
                                    />
                                    <Bar
                                       dataKey="shortlisted"
                                       name="Shortlisted"
                                       fill={C.violet}
                                       radius={[0, 4, 4, 0]}
                                    />
                                    <Bar
                                       dataKey="selected"
                                       name="Selected"
                                       fill={C.emerald}
                                       radius={[0, 4, 4, 0]}
                                    />
                                 </BarChart>
                              </ResponsiveContainer>
                           )}
                        </CardContent>
                     </Card>

                     {/* Criteria Radar */}
                     <Card className="border shadow-sm">
                        <CardHeader className="pb-1 pt-5 px-6">
                           <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                 <Target className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                 <CardTitle className="text-sm font-semibold">
                                    Avg Criteria Scores
                                 </CardTitle>
                                 <p className="text-xs text-muted-foreground">
                                    AI scoring breakdown across all candidates
                                 </p>
                              </div>
                           </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-5">
                           {isLoading ? (
                              <Sk className="h-72 mt-2" />
                           ) : D.allCandidates.length === 0 ? (
                              <EmptyChart message="No scoring data yet" />
                           ) : (
                              <>
                                 <ResponsiveContainer
                                    width="100%"
                                    height={240}
                                 >
                                    <RadarChart
                                       data={D.radarData}
                                       cx="50%"
                                       cy="50%"
                                       outerRadius={85}
                                    >
                                       <PolarGrid stroke="hsl(220 15% 89%)" />
                                       <PolarAngleAxis
                                          dataKey="subject"
                                          tick={{ fontSize: 12 }}
                                       />
                                       <PolarRadiusAxis
                                          angle={30}
                                          domain={[0, 100]}
                                          tick={{ fontSize: 10 }}
                                       />
                                       <Radar
                                          name="Avg Score"
                                          dataKey="score"
                                          stroke={C.primary}
                                          fill={C.primary}
                                          fillOpacity={0.15}
                                          strokeWidth={2.5}
                                       />
                                       <Tooltip
                                          formatter={(v) => [
                                             `${v}%`,
                                             "Avg Score",
                                          ]}
                                       />
                                    </RadarChart>
                                 </ResponsiveContainer>
                                 <div className="grid grid-cols-5 gap-2 mt-3">
                                    {D.radarData.map((d) => (
                                       <div
                                          key={d.subject}
                                          className="text-center bg-muted/40 rounded-xl py-2"
                                       >
                                          <p
                                             className={cn(
                                                "text-xl font-black tabular-nums",
                                                scoreTextClass(d.score),
                                             )}
                                          >
                                             {d.score}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                             {d.subject}
                                          </p>
                                       </div>
                                    ))}
                                 </div>
                              </>
                           )}
                        </CardContent>
                     </Card>
                  </div>

                  {/* Score Distribution Histogram */}
                  <Card className="border shadow-sm">
                     <CardHeader className="pb-1 pt-5 px-6">
                        <div className="flex items-center gap-2">
                           <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Activity className="h-4 w-4 text-primary" />
                           </div>
                           <div>
                              <CardTitle className="text-sm font-semibold">
                                 Match Score Distribution
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                 How candidate match scores are distributed
                                 across all screenings
                              </p>
                           </div>
                        </div>
                     </CardHeader>
                     <CardContent className="px-4 pb-4">
                        {isLoading ? (
                           <Sk className="h-48 mt-2" />
                        ) : D.allCandidates.length === 0 ? (
                           <EmptyChart message="No candidate data yet" />
                        ) : (
                           <ResponsiveContainer
                              width="100%"
                              height={200}
                           >
                              <BarChart
                                 data={D.scoreDistribution}
                                 barCategoryGap="10%"
                                 margin={{
                                    top: 10,
                                    right: 10,
                                    bottom: 0,
                                    left: -10,
                                 }}
                              >
                                 <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="hsl(220 15% 93%)"
                                 />
                                 <XAxis
                                    dataKey="range"
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    label={{
                                       value: "Score Range (%)",
                                       position: "insideBottom",
                                       offset: -2,
                                       style: {
                                          fontSize: 11,
                                          fill: "hsl(220 15% 55%)",
                                       },
                                    }}
                                 />
                                 <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    label={{
                                       value: "Candidates",
                                       angle: -90,
                                       position: "insideLeft",
                                       offset: 10,
                                       style: {
                                          fontSize: 11,
                                          fill: "hsl(220 15% 55%)",
                                       },
                                    }}
                                 />
                                 <Tooltip content={<ChartTip />} />
                                 <Bar
                                    dataKey="count"
                                    name="Candidates"
                                    radius={[5, 5, 0, 0]}
                                 >
                                    {D.scoreDistribution.map((_, idx) => {
                                       const lo = idx * 10;
                                       const fill =
                                          lo >= 80
                                             ? C.emerald
                                             : lo >= 60
                                               ? C.amber
                                               : lo >= 40
                                                 ? C.sky
                                                 : C.rose;
                                       return (
                                          <Cell
                                             key={idx}
                                             fill={fill}
                                          />
                                       );
                                    })}
                                 </Bar>
                              </BarChart>
                           </ResponsiveContainer>
                        )}
                     </CardContent>
                  </Card>

                  {/* Job Performance Table */}
                  <Card className="border shadow-sm overflow-hidden">
                     <CardHeader className="pb-3 pt-5 px-6">
                        <div className="flex items-center gap-2">
                           <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Briefcase className="h-4 w-4 text-primary" />
                           </div>
                           <div>
                              <CardTitle className="text-sm font-semibold">
                                 Job Performance Summary
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                 Detailed breakdown sorted by average match
                                 score
                              </p>
                           </div>
                        </div>
                     </CardHeader>
                     <CardContent className="p-0">
                        {isLoading ? (
                           <div className="px-6 pb-6 space-y-3">
                              {[1, 2, 3, 4, 5].map((i) => (
                                 <Sk
                                    key={i}
                                    className="h-12"
                                 />
                              ))}
                           </div>
                        ) : D.jobPerformance.length === 0 ? (
                           <div className="px-6 pb-6">
                              <EmptyChart message="No job performance data yet" />
                           </div>
                        ) : (
                           <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                 <thead>
                                    <tr className="border-b bg-muted/30">
                                       <th className="text-left px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                                          Job Title
                                       </th>
                                       <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                                          Applicants
                                       </th>
                                       <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                                          Shortlisted
                                       </th>
                                       <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                                          Selected
                                       </th>
                                       <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                                          Avg Score
                                       </th>
                                       <th className="text-right px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                                          Top Score
                                       </th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {D.jobPerformance.map((job, i) => (
                                       <tr
                                          key={i}
                                          className="border-b last:border-0 hover:bg-muted/25 transition-colors"
                                       >
                                          <td className="px-6 py-4">
                                             <p className="font-semibold text-foreground">
                                                {job.fullTitle}
                                             </p>
                                          </td>
                                          <td className="px-4 py-4 text-right font-medium">
                                             {job.applicants}
                                          </td>
                                          <td className="px-4 py-4 text-right">
                                             <span className="font-bold text-violet-600">
                                                {job.shortlisted}
                                             </span>
                                          </td>
                                          <td className="px-4 py-4 text-right">
                                             <span
                                                className={cn(
                                                   "font-bold",
                                                   job.selected > 0
                                                      ? "text-emerald-600"
                                                      : "text-muted-foreground",
                                                )}
                                             >
                                                {job.selected || "—"}
                                             </span>
                                          </td>
                                          <td className="px-4 py-4 text-right">
                                             <span
                                                className={cn(
                                                   "font-black tabular-nums",
                                                   scoreTextClass(job.avgScore),
                                                )}
                                             >
                                                {job.avgScore}%
                                             </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                             <span
                                                className={cn(
                                                   "font-black tabular-nums",
                                                   scoreTextClass(job.topScore),
                                                )}
                                             >
                                                {job.topScore}%
                                             </span>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        )}
                     </CardContent>
                  </Card>
               </TabsContent>

               {/* ══════════════════════════════════════════════════════════ */}
               {/*  TAB 3 — SHORTLISTS                                        */}
               {/* ══════════════════════════════════════════════════════════ */}
               <TabsContent
                  value="shortlists"
                  className="space-y-6 mt-0"
               >
                  {/* Top candidates */}
                  <SectionHead
                     title="Top Shortlisted Candidates"
                     desc="Highest-scoring candidates across all screening runs, sorted by match score"
                     icon={Trophy}
                  />
                  {isLoading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                           <Sk
                              key={i}
                              className="h-64"
                           />
                        ))}
                     </div>
                  ) : D.topCandidates.length === 0 ? (
                     <Card className="p-10 text-center border">
                        <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                           No shortlisted candidates yet. Run AI screening to
                           see top candidates here.
                        </p>
                     </Card>
                  ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {D.topCandidates.map((c, i) => (
                           <CandidateCard
                              key={`${c.candidateId}-${i}`}
                              candidate={c}
                              rank={i + 1}
                           />
                        ))}
                     </div>
                  )}

                  {/* Per-job shortlist summary */}
                  {!isLoading && shortlists.length > 0 && (
                     <>
                        <SectionHead
                           title="Shortlist Summary by Job"
                           desc="Overview of screening results per job posting"
                           icon={Layers}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                           {shortlists
                              .filter((s) => s.job)
                              .map((sl) => (
                                 <ShortlistSummaryCard
                                    key={sl._id}
                                    sl={sl}
                                 />
                              ))}
                        </div>
                     </>
                  )}
               </TabsContent>
            </Tabs>
         </main>
      </div>
   );
}
