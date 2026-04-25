"use client";

import { useState } from "react";
import Link from "next/link";
import {
   Users,
   Briefcase,
   Bot,
   FileText,
   Upload,
   ChevronDown,
   Check,
   MapPin,
   Sparkles,
   UserPlus,
   Layers,
   Globe,
   Trash2,
   UploadCloud,
   FileSpreadsheet,
   X,
   Plus,
   ArrowRight,
   Clock,
   Lock,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useJobs } from "@/services/job.service";
import {
   useApplicants,
   useAddPlatformApplicants,
   useUploadExternalApplicants,
   useDeleteApplicant,
} from "@/services/applicant.service";
import { FileUploadZone } from "@/components/features/applicants/FileUploadZone";
import { ApplicantTable } from "@/components/features/applicants/ApplicantTable";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { TalentProfile } from "@/types";

const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
   open: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
   screening: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
   draft: {
      badge: "bg-secondary text-secondary-foreground",
      dot: "bg-slate-400",
   },
   closed: { badge: "bg-muted text-muted-foreground", dot: "bg-slate-300" },
};

// ── Job Selector Dropdown ─────────────────────────────────────────────────────
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
                     {isLoading ? "Loading jobs…" : "Choose a job position"}
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
                  <div className="max-h-60 overflow-y-auto py-1.5">
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

// ── Applicants Panel (inline) ─────────────────────────────────────────────────
function ApplicantsPanel({
   jobId,
   jobStatus,
}: {
   jobId: string;
   jobStatus?: string;
}) {
   const [page, setPage] = useState(1);
   const [limit, setLimit] = useState(10);
   const { toast } = useToast();
   // const { data, isLoading } = useApplicants(jobId);
   const { data, isLoading } = useApplicants(jobId, { page, limit });
   const addPlatform = useAddPlatformApplicants(jobId);
   const uploadExternal = useUploadExternalApplicants(jobId);
   const deleteApplicant = useDeleteApplicant(jobId);

   const [jsonInput, setJsonInput] = useState("");
   const [jsonError, setJsonError] = useState("");
   const applicants = data?.items ?? [];

   const handleJsonSubmit = async () => {
      setJsonError("");
      let parsed: TalentProfile[];
      try {
         const raw = JSON.parse(jsonInput);
         parsed = Array.isArray(raw) ? raw : [raw];
      } catch {
         setJsonError("Invalid JSON – paste an array of talent profiles.");
         return;
      }
      try {
         await addPlatform.mutateAsync(parsed);
         toast({ title: `${parsed.length} applicant(s) added` });
         setJsonInput("");
      } catch {
         toast({ title: "Failed to add applicants", variant: "destructive" });
      }
   };

   const handleFile = async (file: File) => {
      try {
         const result = await uploadExternal.mutateAsync(file);
         toast({
            title: `${(result as { count?: number }).count ?? "?"} applicant(s) imported`,
         });
      } catch {
         toast({ title: "File upload failed", variant: "destructive" });
      }
   };

   const handleDelete = async (id: string) => {
      if (!confirm("Remove this applicant?")) return;
      try {
         await deleteApplicant.mutateAsync(id);
         toast({ title: "Applicant removed" });
      } catch {
         toast({ title: "Delete failed", variant: "destructive" });
      }
   };

   return (
      <div className="space-y-4 mt-4">
         {/* Closed-job notice */}
         {jobStatus === "closed" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-4 py-3">
               <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
               <p className="text-sm text-amber-700 dark:text-amber-400 leading-snug">
                  <span className="font-semibold">Job closed.</span> This
                  position is no longer accepting new applicants.
               </p>
            </div>
         )}

         {/* Stats bar */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-primary" />
               </div>
               <span className="text-sm font-semibold">
                  {isLoading ? "…" : applicants.length} applicant
                  {applicants.length !== 1 ? "s" : ""}
               </span>
            </div>
            <Link href={`/jobs/${jobId}/screening`}>
               <Button
                  size="sm"
                  className="gap-1.5"
               >
                  <Sparkles className="h-3.5 w-3.5" /> Run AI Screening
               </Button>
            </Link>
         </div>

         <Tabs defaultValue="list">
            <TabsList className="grid w-full grid-cols-3">
               <TabsTrigger
                  value="list"
                  className="gap-1.5"
               >
                  <Users className="h-3.5 w-3.5" /> Applicants
               </TabsTrigger>
               <TabsTrigger
                  value="platform"
                  className="gap-1.5"
                  disabled={jobStatus === "closed"}
               >
                  <Layers className="h-3.5 w-3.5" /> Platform
               </TabsTrigger>
               <TabsTrigger
                  value="upload"
                  className="gap-1.5"
                  disabled={jobStatus === "closed"}
               >
                  <Upload className="h-3.5 w-3.5" /> Upload
               </TabsTrigger>
            </TabsList>

            <TabsContent
               value="list"
               className="mt-4"
            >
               <ApplicantTable
                  data={data} // ✅ data has shape: { items: [], meta: { total, page, limit, totalPages } }
                  isLoading={isLoading}
                  onDelete={handleDelete}
                  isDeleting={deleteApplicant.isPending}
                  onPageChange={(newPage) => setPage(newPage)}
                  onPageSizeChange={(newLimit) => setLimit(newLimit)}
                  page={page}
                  limit={limit}
               />
            </TabsContent>

            <TabsContent
               value="platform"
               className="mt-4"
            >
               <Card>
                  <CardContent className="p-5 space-y-4">
                     <div className="flex items-start gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                           <Layers className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                           <p className="text-sm font-semibold">
                              Paste Umurava Profiles
                           </p>
                           <p className="text-xs text-muted-foreground mt-0.5">
                              Paste a JSON array of structured talent profiles
                              from the platform.
                           </p>
                        </div>
                     </div>
                     <Textarea
                        rows={8}
                        className="font-mono text-xs"
                        placeholder={`[{\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  ...\n}]`}
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                     />
                     {jsonError && (
                        <p className="text-xs text-destructive">{jsonError}</p>
                     )}
                     <Button
                        onClick={handleJsonSubmit}
                        disabled={
                           !jsonInput.trim() ||
                           addPlatform.isPending ||
                           jobStatus === "closed"
                        }
                        className="w-full"
                     >
                        {addPlatform.isPending ? "Adding…" : "Add Applicants"}
                     </Button>
                  </CardContent>
               </Card>
            </TabsContent>

            <TabsContent
               value="upload"
               className="mt-4"
            >
               <FileUploadZone
                  onFile={handleFile}
                  isLoading={uploadExternal.isPending}
               />
            </TabsContent>
         </Tabs>
      </div>
   );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ApplicantsPage() {
   const { data, isLoading: jobsLoading } = useJobs({ limit: 100 });
   const jobs = data?.items ?? [];
   const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
   const selectedJob = jobs.find((j) => j._id === selectedJobId) ?? null;

   // Auto-select first job when data arrives
   const prevJobsLength = useState(0);
   if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0]._id);
   }

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title="Applicants" />
         <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-6">
               {/* ── Intro ── */}
               <div>
                  <h1 className="text-base font-semibold">Applicant Manager</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                     Select a job position, then add or manage its applicants
                     inline.
                  </p>
               </div>

               {/* ── How-to steps ── */}
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                     {
                        icon: Briefcase,
                        step: "01",
                        title: "Select a Position",
                        desc: "Pick any open job below to view or add its applicants.",
                     },
                     {
                        icon: UserPlus,
                        step: "02",
                        title: "Add Applicants",
                        desc: "Paste JSON profiles or upload a CSV / Excel spreadsheet.",
                     },
                     {
                        icon: Bot,
                        step: "03",
                        title: "Run AI Screening",
                        desc: "Let Gemini AI rank and shortlist candidates automatically.",
                     },
                  ].map(({ icon: Icon, step, title, desc }) => (
                     <div
                        key={step}
                        className="flex gap-3 rounded-xl border bg-card p-4"
                     >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                           <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase mb-0.5">
                              Step {step}
                           </p>
                           <p className="text-sm font-semibold">{title}</p>
                           <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {desc}
                           </p>
                        </div>
                     </div>
                  ))}
               </div>

               {/* ── Selector + Panel ── */}
               {jobsLoading ? (
                  <div className="space-y-3">
                     <div className="h-16 rounded-xl border bg-muted animate-pulse" />
                     <div className="h-48 rounded-xl border bg-muted animate-pulse" />
                  </div>
               ) : jobs.length === 0 ? (
                  <Card className="border-dashed">
                     <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                           <Briefcase className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                           <p className="font-semibold">No jobs yet</p>
                           <p className="text-sm text-muted-foreground mt-1">
                              Create a job first, then add applicants to it.
                           </p>
                        </div>
                        <Button
                           asChild
                           size="sm"
                        >
                           <Link href="/jobs/new">
                              <Plus className="h-4 w-4 mr-1.5" /> Create Job
                           </Link>
                        </Button>
                     </CardContent>
                  </Card>
               ) : (
                  <div>
                     <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Select Position
                     </p>
                     <JobSelector
                        jobs={jobs}
                        selectedId={selectedJobId}
                        onChange={setSelectedJobId}
                        isLoading={jobsLoading}
                     />
                     {selectedJobId && (
                        <div className="mt-1 flex items-center justify-end">
                           <Link
                              href={`/jobs/${selectedJobId}`}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                           >
                              View job details{" "}
                              <ArrowRight className="h-3 w-3" />
                           </Link>
                        </div>
                     )}
                     {selectedJobId && (
                        <ApplicantsPanel
                           jobId={selectedJobId}
                           jobStatus={selectedJob?.status}
                        />
                     )}
                  </div>
               )}
            </div>
         </main>
      </div>
   );
}
