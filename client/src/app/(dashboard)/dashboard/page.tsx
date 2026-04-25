"use client";

import Link from "next/link";
import {
   Briefcase,
   Users,
   Sparkles,
   CheckCircle2,
   Plus,
   TrendingUp,
   Bot,
   ChevronRight,
   MoreHorizontal,
   FileUp,
   MapPin,
} from "lucide-react";
import {
   BarChart,
   Bar,
   XAxis,
   YAxis,
   ResponsiveContainer,
   Tooltip,
   PieChart,
   Pie,
   Cell,
   AreaChart,
   Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { useJobs, useDashboardStats } from "@/services/job.service";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, string> = {
   draft: "bg-secondary text-secondary-foreground",
   open: "bg-emerald-100 text-emerald-700",
   screening: "bg-amber-100 text-amber-700",
   closed: "bg-muted text-muted-foreground",
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
   label,
   value,
   icon: Icon,
   bg,
   iconCls,
   sub,
   isLoading,
}: {
   label: string;
   value: string | number;
   icon: React.ElementType;
   bg: string;
   iconCls: string;
   sub?: string;
   isLoading: boolean;
}) {
   return (
      <Card className="group hover:shadow-md transition-all duration-200">
         <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
               <div
                  className={cn(
                     "flex h-11 w-11 items-center justify-center rounded-xl",
                     bg,
                  )}
               >
                  <Icon className={cn("h-5 w-5", iconCls)} />
               </div>
               <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4" />
               </button>
            </div>
            {isLoading ? (
               <div className="h-8 w-20 bg-muted animate-pulse rounded-lg mb-1" />
            ) : (
               <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            {sub && !isLoading && (
               <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
            )}
         </CardContent>
      </Card>
   );
}

// ── Custom Tooltips ───────────────────────────────────────────────────────────
function BarTip({
   active,
   payload,
   label,
}: {
   active?: boolean;
   payload?: { color: string; name: string; value: number }[];
   label?: string;
}) {
   if (!active || !payload?.length) return null;
   return (
      <div className="rounded-xl border bg-card shadow-xl px-3 py-2 text-xs">
         <p className="font-semibold mb-1">{label}</p>
         {payload.map((p) => (
            <p
               key={p.name}
               style={{ color: p.color }}
            >
               {p.name}: <strong>{p.value}</strong>
            </p>
         ))}
      </div>
   );
}

function AreaTip({
   active,
   payload,
   label,
}: {
   active?: boolean;
   payload?: { value: number }[];
   label?: string;
}) {
   if (!active || !payload?.length) return null;
   return (
      <div className="rounded-xl border bg-card shadow-xl px-3 py-2 text-xs">
         <p className="font-semibold">{label}</p>
         <p className="text-primary font-bold">{payload[0].value}</p>
      </div>
   );
}

// ── Type icon map ─────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ElementType> = {
   "Full-time": Briefcase,
   "Part-time": Users,
   Contract: TrendingUp,
};

// ── Candidate Dashboard ───────────────────────────────────────────────────────
function CandidateDashboard({
   jobs,
   isLoading,
   user,
}: {
   jobs: import("@/types").Job[];
   isLoading: boolean;
   user: { name: string; role: string } | null;
}) {
   const openJobs = jobs.filter((j) => j.status === "open");
   const firstName = user?.name?.split(" ")[0] ?? "there";
   const hour = new Date().getHours();
   const greeting =
      hour < 12
         ? "Good morning"
         : hour < 18
           ? "Good afternoon"
           : "Good evening";

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title={`${greeting}, ${firstName}`} />
         <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Welcome banner */}
            <div
               className="rounded-2xl p-6 text-white overflow-hidden relative"
               style={{
                  background:
                     "linear-gradient(135deg, hsl(221 72% 48%) 0%, hsl(224 90% 45%) 100%)",
               }}
            >
               <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
               <div className="pointer-events-none absolute bottom-0 right-16 h-20 w-20 rounded-full bg-white/5" />
               <div className="relative z-10">
                  <p className="text-sm font-medium text-white/80 mb-1">
                     Welcome back
                  </p>
                  <h2 className="text-2xl font-bold mb-2">{firstName}</h2>
                  <p className="text-white/80 text-sm max-w-sm leading-relaxed">
                     There {openJobs.length === 1 ? "is" : "are"} currently{" "}
                     <span className="font-bold text-white">
                        {isLoading ? "..." : openJobs.length} open position
                        {openJobs.length !== 1 ? "s" : ""}
                     </span>{" "}
                     available. Browse and find your next opportunity.
                  </p>
                  <Link
                     href="/jobs"
                     className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white text-primary font-semibold text-sm px-4 py-2 hover:bg-white/90 transition-colors"
                  >
                     <Briefcase className="h-4 w-4" /> Browse Jobs
                  </Link>
               </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
               <Card>
                  <CardContent className="pt-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                     </div>
                     <div>
                        {isLoading ? (
                           <div className="h-7 w-12 bg-muted animate-pulse rounded-lg mb-1" />
                        ) : (
                           <p className="text-3xl font-bold">
                              {openJobs.length}
                           </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                           Open Positions
                        </p>
                     </div>
                  </CardContent>
               </Card>
               <Card>
                  <CardContent className="pt-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-violet-600" />
                     </div>
                     <div>
                        {isLoading ? (
                           <div className="h-7 w-12 bg-muted animate-pulse rounded-lg mb-1" />
                        ) : (
                           <p className="text-3xl font-bold">{jobs.length}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                           Total Listings
                        </p>
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* Recent open jobs */}
            <Card>
               <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Latest Openings</CardTitle>
                  <Link
                     href="/jobs"
                     className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                     View all <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
               </CardHeader>
               <CardContent className="p-0">
                  {isLoading ? (
                     <div className="space-y-0">
                        {Array.from({ length: 3 }).map((_, i) => (
                           <div
                              key={i}
                              className="flex items-center gap-4 px-6 py-4 border-b last:border-0"
                           >
                              <div className="h-9 w-9 rounded-lg bg-muted animate-pulse shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                 <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                                 <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                              </div>
                           </div>
                        ))}
                     </div>
                  ) : openJobs.length === 0 ? (
                     <p className="text-sm text-muted-foreground text-center py-10">
                        No open positions at the moment.
                     </p>
                  ) : (
                     <div>
                        {openJobs.slice(0, 5).map((job) => (
                           <Link
                              key={job._id}
                              href={`/jobs/${job._id}`}
                              className="flex items-center gap-4 px-6 py-4 border-b last:border-0 hover:bg-muted/40 transition-colors group"
                           >
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                 <Briefcase className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                    {job.title}
                                 </p>
                                 <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    {job.location && (
                                       <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {job.location}
                                       </span>
                                    )}
                                    <span>{job.type}</span>
                                 </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                           </Link>
                        ))}
                     </div>
                  )}
               </CardContent>
            </Card>
         </main>
      </div>
   );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
   const user = useAppSelector((s) => s.auth.user);
   const { data, isLoading } = useJobs({ limit: 100 });
   const { data: dashStats, isLoading: isStatsLoading } = useDashboardStats();
   const jobs = data?.items ?? [];

   const stats = {
      total: jobs.length,
      open: jobs.filter((j) => j.status === "open").length,
      screening: jobs.filter((j) => j.screeningStatus === "running").length,
      closed: jobs.filter((j) => j.status === "closed").length,
      draft: jobs.filter((j) => j.status === "draft").length,
   };

   const recentJobs = [...jobs]
      .sort(
         (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

   const trendData = dashStats?.trend ?? [];
   const activityData = trendData.map((t) => ({
      month: t.month,
      value: t.screened,
   }));
   const sparklineData = trendData.map((t) => ({ v: t.applications }));

   const rawPipeline = [
      { name: "Open", value: stats.open, color: "#10b981" },
      { name: "Screening", value: stats.screening, color: "#f59e0b" },
      { name: "Closed", value: stats.closed, color: "#94a3b8" },
      { name: "Draft", value: stats.draft, color: "#e2e8f0" },
   ];
   const pipelineData = rawPipeline.filter((d) => d.value > 0);
   const pipelineFallback = [{ name: "No data", value: 1, color: "#e2e8f0" }];

   const pipelineDisplay =
      pipelineData.length > 0 ? pipelineData : pipelineFallback;
   const dominantTotal = pipelineDisplay.reduce((s, d) => s + d.value, 0);
   const dominantPct =
      pipelineData.length > 0
         ? Math.round((pipelineData[0].value / dominantTotal) * 100)
         : 0;

   const byType = jobs.reduce<Record<string, number>>((acc, j) => {
      acc[j.type] = (acc[j.type] ?? 0) + 1;
      return acc;
   }, {});
   const typeRows = Object.entries(byType).sort((a, b) => b[1] - a[1]);

   const firstName = user?.name?.split(" ")[0] ?? "Recruiter";
   const hour = new Date().getHours();
   const greeting =
      hour < 12
         ? "Good morning"
         : hour < 18
           ? "Good afternoon"
           : "Good evening";

   // Candidates get a limited dashboard
   if (user?.role === "candidate") {
      return (
         <CandidateDashboard
            jobs={jobs}
            isLoading={isLoading}
            user={user}
         />
      );
   }

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title={`${greeting}, ${firstName}`} />

         <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* ── Row 1: KPI cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <StatCard
                  label="Total Jobs"
                  value={stats.total}
                  icon={Briefcase}
                  bg="bg-violet-100"
                  iconCls="text-violet-600"
                  sub="All time"
                  isLoading={isLoading}
               />
               <StatCard
                  label="Open Positions"
                  value={stats.open}
                  icon={CheckCircle2}
                  bg="bg-cyan-100"
                  iconCls="text-cyan-600"
                  sub="Accepting applicants"
                  isLoading={isLoading}
               />
               <StatCard
                  label="Avg. Match Score"
                  value={
                     dashStats && dashStats.avgMatchScore > 0
                        ? `${dashStats.avgMatchScore}%`
                        : "—"
                  }
                  icon={TrendingUp}
                  bg="bg-orange-100"
                  iconCls="text-orange-500"
                  sub="Across screenings"
                  isLoading={isLoading || isStatsLoading}
               />
               <StatCard
                  label="AI Screenings"
                  value={dashStats?.totalRuns ?? 0}
                  icon={Bot}
                  bg="bg-pink-100"
                  iconCls="text-pink-500"
                  sub="Total runs"
                  isLoading={isLoading || isStatsLoading}
               />
            </div>

            {/* ── Row 2: Trend chart + Donut ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Bar chart — Recruitment Activity */}
               <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                     <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                           Recruitment Activity
                        </CardTitle>
                        <span className="text-xs text-muted-foreground cursor-default select-none">
                           Show by months ↓
                        </span>
                     </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                     <ResponsiveContainer
                        width="100%"
                        height={190}
                     >
                        <BarChart
                           data={trendData}
                           barGap={4}
                           barCategoryGap="32%"
                        >
                           <XAxis
                              dataKey="month"
                              tick={{ fontSize: 11, fill: "hsl(220 13% 46%)" }}
                              axisLine={false}
                              tickLine={false}
                           />
                           <YAxis
                              tick={{ fontSize: 11, fill: "hsl(220 13% 46%)" }}
                              axisLine={false}
                              tickLine={false}
                           />
                           <Tooltip
                              content={<BarTip />}
                              cursor={{ fill: "hsl(220 20% 96%)" }}
                           />
                           <Bar
                              dataKey="applications"
                              name="Applications"
                              fill="hsl(221 72% 46%)"
                              radius={[4, 4, 0, 0]}
                           />
                           <Bar
                              dataKey="screened"
                              name="Screened"
                              fill="hsl(172 76% 52%)"
                              radius={[4, 4, 0, 0]}
                           />
                        </BarChart>
                     </ResponsiveContainer>
                     <div className="flex items-center gap-5 mt-1">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                           <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />{" "}
                           Applications
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                           <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />{" "}
                           Screened
                        </span>
                     </div>
                  </CardContent>
               </Card>

               {/* Donut — Pipeline Status */}
               <Card>
                  <CardHeader className="pb-0">
                     <CardTitle className="text-sm font-semibold">
                        Pipeline Status
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center pt-4 pb-5">
                     <div className="relative">
                        <ResponsiveContainer
                           width={160}
                           height={160}
                        >
                           <PieChart>
                              <Pie
                                 data={pipelineDisplay}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={50}
                                 outerRadius={70}
                                 paddingAngle={pipelineData.length > 1 ? 3 : 0}
                                 dataKey="value"
                                 stroke="none"
                              >
                                 {pipelineDisplay.map((entry, idx) => (
                                    <Cell
                                       key={idx}
                                       fill={entry.color}
                                    />
                                 ))}
                              </Pie>
                           </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                           <p className="text-2xl font-bold leading-none">
                              {dominantPct}%
                           </p>
                           <Briefcase className="h-4 w-4 text-muted-foreground mt-1" />
                        </div>
                     </div>
                     <div className="flex flex-col gap-2 mt-3 w-full px-2">
                        {rawPipeline.map((d) => (
                           <div
                              key={d.name}
                              className="flex items-center justify-between text-xs"
                           >
                              <span className="flex items-center gap-2">
                                 <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ background: d.color }}
                                 />
                                 {d.name}
                              </span>
                              <span className="font-semibold">{d.value}</span>
                           </div>
                        ))}
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* ── Row 3: Area chart + Type table + Metric card ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Area chart — Screening Activity */}
               <Card>
                  <CardHeader className="pb-0">
                     <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                           Screening Activity
                        </CardTitle>
                        <span className="text-xs text-muted-foreground cursor-default select-none">
                           Last 6 months
                        </span>
                     </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                     <ResponsiveContainer
                        width="100%"
                        height={140}
                     >
                        <AreaChart data={activityData}>
                           <defs>
                              <linearGradient
                                 id="actGrad"
                                 x1="0"
                                 y1="0"
                                 x2="0"
                                 y2="1"
                              >
                                 <stop
                                    offset="0%"
                                    stopColor="hsl(221 72% 46%)"
                                    stopOpacity={0.25}
                                 />
                                 <stop
                                    offset="100%"
                                    stopColor="hsl(221 72% 48%)"
                                    stopOpacity={0}
                                 />
                              </linearGradient>
                           </defs>
                           <XAxis
                              dataKey="month"
                              tick={{ fontSize: 10, fill: "hsl(220 13% 46%)" }}
                              axisLine={false}
                              tickLine={false}
                           />
                           <YAxis hide />
                           <Tooltip content={<AreaTip />} />
                           <Area
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(221 72% 48%)"
                              strokeWidth={2}
                              fill="url(#actGrad)"
                              dot={false}
                              activeDot={{ r: 4, fill: "hsl(221 72% 48%)" }}
                           />
                        </AreaChart>
                     </ResponsiveContainer>
                  </CardContent>
               </Card>

               {/* Jobs by Type table */}
               <Card>
                  <CardHeader className="pb-3">
                     <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                           Jobs by Type
                        </CardTitle>
                        <Button
                           variant="ghost"
                           size="sm"
                           asChild
                           className="h-7 text-xs gap-1 px-2"
                        >
                           <Link href="/jobs">
                              All <ChevronRight className="h-3 w-3" />
                           </Link>
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent>
                     <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                        <span>Type</span>
                        <span>Jobs</span>
                     </div>
                     {isLoading ? (
                        <div className="space-y-3">
                           {[1, 2, 3].map((i) => (
                              <div
                                 key={i}
                                 className="h-8 bg-muted animate-pulse rounded"
                              />
                           ))}
                        </div>
                     ) : typeRows.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                           No jobs yet
                        </p>
                     ) : (
                        <div className="space-y-3">
                           {typeRows.map(([type, count]) => {
                              const Icon = TYPE_ICONS[type] ?? Briefcase;
                              return (
                                 <div
                                    key={type}
                                    className="flex items-center justify-between"
                                 >
                                    <div className="flex items-center gap-2.5">
                                       <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                          <Icon className="h-3.5 w-3.5 text-primary" />
                                       </div>
                                       <span className="text-sm font-medium">
                                          {type}
                                       </span>
                                    </div>
                                    <span className="text-sm font-bold">
                                       {count}
                                    </span>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Metric card */}
               <Card
                  className="relative overflow-hidden border-0 text-white"
                  style={{
                     background:
                        "linear-gradient(135deg, hsl(221 72% 58%) 0%, hsl(221 72% 38%) 100%)",
                  }}
               >
                  <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
                  <div className="absolute -right-2 -bottom-8 h-20 w-20 rounded-full bg-white/5" />
                  <CardContent className="p-5 relative z-10">
                     <p className="text-3xl font-bold leading-none mb-1">
                        {isStatsLoading
                           ? "…"
                           : (dashStats?.totalApplicants ?? 0)}
                     </p>
                     <p className="text-sm text-white/80 mb-3">
                        Candidates reviewed
                     </p>
                     <ResponsiveContainer
                        width="100%"
                        height={55}
                     >
                        <AreaChart
                           data={
                              sparklineData.length > 0
                                 ? sparklineData
                                 : [{ v: 0 }]
                           }
                        >
                           <defs>
                              <linearGradient
                                 id="spkGrad"
                                 x1="0"
                                 y1="0"
                                 x2="0"
                                 y2="1"
                              >
                                 <stop
                                    offset="0%"
                                    stopColor="white"
                                    stopOpacity={0.35}
                                 />
                                 <stop
                                    offset="100%"
                                    stopColor="white"
                                    stopOpacity={0}
                                 />
                              </linearGradient>
                           </defs>
                           <Area
                              type="monotone"
                              dataKey="v"
                              stroke="white"
                              strokeWidth={2}
                              fill="url(#spkGrad)"
                              dot={false}
                           />
                        </AreaChart>
                     </ResponsiveContainer>
                  </CardContent>
               </Card>
            </div>

            {/* ── Row 4: Recent Jobs + Quick Actions ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Recent Jobs */}
               <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                     <h2 className="text-sm font-semibold">Recent Jobs</h2>
                     <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs gap-1"
                     >
                        <Link href="/jobs">
                           All jobs <ChevronRight className="h-3 w-3" />
                        </Link>
                     </Button>
                  </div>
                  {isLoading ? (
                     <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                           <div
                              key={i}
                              className="h-16 rounded-xl border bg-muted animate-pulse"
                           />
                        ))}
                     </div>
                  ) : recentJobs.length === 0 ? (
                     <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                           <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <Briefcase className="h-6 w-6 text-muted-foreground" />
                           </div>
                           <p className="text-sm text-muted-foreground">
                              No jobs yet. Start by posting one.
                           </p>
                           <Button
                              asChild
                              size="sm"
                           >
                              <Link href="/jobs/new">
                                 <Plus className="h-4 w-4 mr-1" /> Create your
                                 first job
                              </Link>
                           </Button>
                        </CardContent>
                     </Card>
                  ) : (
                     <div className="space-y-2">
                        {recentJobs.map((job) => (
                           <Link
                              key={job._id}
                              href={`/jobs/${job._id}`}
                           >
                              <div className="group flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all">
                                 <div className="flex items-center gap-3 min-w-0">
                                    <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                       <Briefcase className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                       <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                          {job.title}
                                       </p>
                                       <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <MapPin className="h-3 w-3 shrink-0" />
                                          {job.location} · {job.type}
                                       </p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <span
                                       className={cn(
                                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                          STATUS_VARIANTS[job.status],
                                       )}
                                    >
                                       {job.status}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                 </div>
                              </div>
                           </Link>
                        ))}
                     </div>
                  )}
               </div>

               {/* Quick Actions */}
               <div className="space-y-3">
                  <h2 className="text-sm font-semibold">Quick Actions</h2>
                  <div className="space-y-2">
                     {[
                        {
                           href: "/jobs/new",
                           icon: Plus,
                           label: "Post New Job",
                           desc: "Define role, skills & requirements",
                           bg: "bg-primary/10",
                           ic: "text-primary",
                        },
                        {
                           href: "/applicants",
                           icon: FileUp,
                           label: "Add Applicants",
                           desc: "Upload CSV/Excel or paste profiles",
                           bg: "bg-cyan-100",
                           ic: "text-cyan-600",
                        },
                        {
                           href: "/screening",
                           icon: Sparkles,
                           label: "Run AI Screening",
                           desc: "Rank candidates with Gemini AI",
                           bg: "bg-violet-100",
                           ic: "text-violet-600",
                        },
                        {
                           href: "/shortlists",
                           icon: Users,
                           label: "View Shortlists",
                           desc: "Review AI-ranked candidates",
                           bg: "bg-emerald-100",
                           ic: "text-emerald-600",
                        },
                     ].map(({ href, icon: Icon, label, desc, bg, ic }) => (
                        <Link
                           key={label}
                           href={href}
                        >
                           <div className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 hover:shadow-sm hover:border-primary/30 transition-all">
                              <div
                                 className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                    bg,
                                 )}
                              >
                                 <Icon className={cn("h-4 w-4", ic)} />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                                    {label}
                                 </p>
                                 <p className="text-xs text-muted-foreground">
                                    {desc}
                                 </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                           </div>
                        </Link>
                     ))}
                  </div>
               </div>
            </div>
         </main>
      </div>
   );
}
