"use client";

import { useState } from "react";
import Link from "next/link";
import {
   UploadCloud,
   Briefcase,
   ChevronDown,
   Check,
   MapPin,
   FileSpreadsheet,
   Plus,
   Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileUploadZone } from "@/components/features/applicants/FileUploadZone";
import { ApplicantTable } from "@/components/features/applicants/ApplicantTable";
import { useJobs } from "@/services/job.service";
import {
   useApplicants,
   useUploadExternalApplicants,
   useDeleteApplicant,
   useUploadResumeApplicants,
} from "@/services/applicant.service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
   open: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
   screening: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
   draft: { badge: "bg-secondary text-secondary-foreground", dot: "bg-slate-400" },
   closed: { badge: "bg-muted text-muted-foreground", dot: "bg-slate-300" },
};

const MAX_RESUMES = 10;

// ── Job Selector ──────────────────────────────────────────────────────────────
function JobSelector({
   jobs,
   selectedId,
   onChange,
   isLoading,
}: {
   jobs: { _id: string; title: string; status: string; location: string; type: string }[];
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
            <div className={cn("h-9 w-9 shrink-0 rounded-lg flex items-center justify-center", selected ? "bg-primary/10" : "bg-muted")}>
               <Briefcase className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
               {selected ? (
                  <>
                     <p className="text-sm font-semibold truncate">{selected.title}</p>
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
               <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize mr-2 shrink-0", STATUS_STYLE[selected.status]?.badge)}>
                  {selected.status}
               </span>
            )}
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
         </button>

         {open && (
            <>
               <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
               <div className="absolute left-0 top-full mt-1.5 z-50 w-full rounded-xl border bg-card shadow-xl overflow-hidden">
                  <div className="px-3 py-2 border-b">
                     <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {jobs.length} position{jobs.length !== 1 ? "s" : ""}
                     </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1.5">
                     {jobs.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No jobs yet</p>
                     ) : (
                        jobs.map((job) => (
                           <button
                              key={job._id}
                              onClick={() => { onChange(job._id); setOpen(false); }}
                              className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted", job._id === selectedId && "bg-primary/5")}
                           >
                              <div className={cn("h-2 w-2 rounded-full shrink-0", STATUS_STYLE[job.status]?.dot ?? "bg-slate-300")} />
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-medium truncate">{job.title}</p>
                                 <p className="text-xs text-muted-foreground truncate">{job.location} · {job.type}</p>
                              </div>
                              {job._id === selectedId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize", STATUS_STYLE[job.status]?.badge)}>
                                 {job.status}
                              </span>
                           </button>
                        ))
                     )}
                  </div>
                  <div className="border-t px-4 py-2">
                     <Link href="/jobs/new" onClick={() => setOpen(false)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Plus className="h-3 w-3" /> Create new job
                     </Link>
                  </div>
               </div>
            </>
         )}
      </div>
   );
}

// ── Upload Panel ──────────────────────────────────────────────────────────────
function UploadPanel({ jobId }: { jobId: string }) {
   const [page, setPage] = useState(1);
   const [limit, setLimit] = useState(10);
   const { toast } = useToast();
   const { data, isLoading } = useApplicants(jobId, { page, limit });
   const uploadExternal = useUploadExternalApplicants(jobId);
   const uploadResumes = useUploadResumeApplicants(jobId);
   const deleteApplicant = useDeleteApplicant(jobId);

   const external = (data?.items ?? []).filter((a) => a.source === "external");

   const handleFile = async (file: File) => {
      try {
         const result = await uploadExternal.mutateAsync(file);
         toast({ title: `${(result as { count?: number }).count ?? "?"} applicant(s) imported` });
      } catch {
         toast({ title: "File upload failed", variant: "destructive" });
      }
   };

   const handleResumes = async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, MAX_RESUMES);
      if (!fileArray.length) return;

      const invalid = fileArray.filter((f) => f.type !== "application/pdf");
      if (invalid.length > 0) {
         toast({
            title: "Only PDF files are accepted",
            description: `Skipped: ${invalid.map((f) => f.name).join(", ")}`,
            variant: "destructive",
         });
         return;
      }

      try {
         const result = await uploadResumes.mutateAsync(fileArray);
         toast({ title: `${result.count} resume${result.count !== 1 ? "s" : ""} parsed successfully` });
      } catch {
         toast({ title: "Bulk upload failed", description: "Ensure all PDFs are text-based.", variant: "destructive" });
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
      <div className="space-y-5">
         {/* CSV / Excel upload */}
         <Card>
            <CardContent className="p-5">
               <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                     <UploadCloud className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                     <p className="text-sm font-semibold">Upload Applicants</p>
                     <p className="text-xs text-muted-foreground">CSV or Excel (.csv, .xlsx, .xls)</p>
                  </div>
               </div>
               <FileUploadZone onFile={handleFile} isLoading={uploadExternal.isPending} />
            </CardContent>
         </Card>

         {/* Resume upload */}
         <Card>
            <CardContent className="p-5">
               <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                     <FileSpreadsheet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                     <p className="text-sm font-semibold">Upload Resumes (PDF)</p>
                     <p className="text-xs text-muted-foreground">
                        AI extracts profile data automatically. Max {MAX_RESUMES} at a time — more files means longer processing.
                     </p>
                  </div>
               </div>
               <FileUploadZone
                  onFile={() => {}}
                  onFiles={handleResumes}
                  isLoading={uploadResumes.isPending}
                  accept={{ "application/pdf": [".pdf"] }}
                  multiple
                  maxFiles={MAX_RESUMES}
               />
               {uploadResumes.isPending && (
                  <p className="text-xs text-muted-foreground text-center animate-pulse mt-2">
                     Parsing resumes with AI… this may take a moment
                  </p>
               )}
            </CardContent>
         </Card>

         {/* External applicants table */}
            <ApplicantTable
               data={{
         items: external,
         meta: {
            total: external.length,
            page: page,
            limit: limit,
            totalPages: Math.ceil(external.length / limit)
         }
      }} // ✅ data has shape: { items: [], meta: { total, page, limit, totalPages } }
         isLoading={isLoading}
         onDelete={handleDelete}
         isDeleting={deleteApplicant.isPending}
         onPageChange={(newPage) => setPage(newPage)}
         onPageSizeChange={(newLimit) => setLimit(newLimit)}
         page={page}
         limit={limit}
      />
         {!isLoading && external.length > 0 && (
            <div className="flex justify-end">
               <Button asChild>
                  <Link href={`/jobs/${jobId}/screening`}>
                     <Sparkles className="h-4 w-4 mr-1.5" /> Run AI Screening
                  </Link>
               </Button>
            </div>
         )}
      </div>
   );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExternalApplicantsPage() {
   const { data, isLoading: jobsLoading } = useJobs({ limit: 100 });
   const jobs = data?.items ?? [];
   const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

   if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0]._id);
   }

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header
            title="External Applicants"
            actions={
               <Button asChild size="sm" variant="outline">
                  <Link href="/jobs/new">
                     <Plus className="h-4 w-4 mr-1.5" /> New Job
                  </Link>
               </Button>
            }
         />
         <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-6">
               {/* Intro */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-2 border-primary/20 bg-primary/2">
                     <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <UploadCloud className="h-3.5 w-3.5 text-primary" />
                           </div>
                           <p className="text-sm font-semibold">External Applicant Uploads</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                           Import candidates from CSV or Excel files exported from job boards, LinkedIn,
                           or any ATS. Select a job position below, upload your file, and the candidates
                           will be ready for AI screening.
                        </p>
                     </CardContent>
                  </Card>
                  <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
                     {[
                        { step: "1", text: "Select a job" },
                        { step: "2", text: "Upload CSV / Excel" },
                        { step: "3", text: "Run AI Screening" },
                     ].map(({ step, text }) => (
                        <div key={step} className="flex items-center gap-2.5 rounded-xl border bg-card p-3">
                           <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                              {step}
                           </span>
                           <p className="text-xs font-medium">{text}</p>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Job selector */}
               <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                     Select Position
                  </p>
                  {jobsLoading ? (
                     <div className="h-16 rounded-xl border bg-muted animate-pulse" />
                  ) : jobs.length === 0 ? (
                     <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                           <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <Briefcase className="h-6 w-6 text-primary" />
                           </div>
                           <div>
                              <p className="font-semibold">No jobs yet</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                 Create a job first to start uploading applicants.
                              </p>
                           </div>
                           <Button asChild size="sm">
                              <Link href="/jobs/new">
                                 <Plus className="h-4 w-4 mr-1.5" /> Create Job
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

               {/* Upload panel */}
               {selectedJobId && <UploadPanel key={selectedJobId} jobId={selectedJobId} />}
            </div>
         </main>
      </div>
   );
}