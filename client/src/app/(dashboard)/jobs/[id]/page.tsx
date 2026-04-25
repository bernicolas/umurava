"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
   Users,
   Sparkles,
   ArrowLeft,
   Pencil,
   X,
   MapPin,
   Briefcase,
   Clock,
   GraduationCap,
   ListChecks,
   FileText,
   AlertCircle,
   Globe,
   Lock,
   RefreshCw,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { JobForm } from "@/components/features/jobs/JobForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
   useJob,
   useUpdateJob,
   useCloseJob,
   usePublishJob,
} from "@/services/job.service";
import { useApplicants } from "@/services/applicant.service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Job, JobFormData } from "@/types";
import { useAppSelector } from "@/store/hooks";
import { ActivityEmailPanel } from "@/components/features/shortlists/ActivityEmailPanel";

const STATUS_CONFIG: Record<
   string,
   { label: string; badge: string; dot: string }
> = {
   draft: {
      label: "Draft",
      badge: "bg-secondary text-secondary-foreground",
      dot: "bg-slate-400",
   },
   open: {
      label: "Open",
      badge: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
   },
   closed: {
      label: "Closed",
      badge: "bg-muted text-muted-foreground",
      dot: "bg-slate-300",
   },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
   return (
      <div className="flex items-start justify-between gap-4 py-2.5 border-b last:border-0">
         <span className="text-xs text-muted-foreground font-medium">
            {label}
         </span>
         <span className="text-xs font-semibold text-right">{value}</span>
      </div>
   );
}

/** Confirm dialog for destructive status actions */
function ConfirmDialog({
   open,
   title,
   description,
   confirmLabel,
   onConfirm,
   onCancel,
}: {
   open: boolean;
   title: string;
   description: string;
   confirmLabel: string;
   onConfirm: () => void;
   onCancel: () => void;
}) {
   if (!open) return null;
   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
         <div
            className="absolute inset-0 bg-black/40"
            onClick={onCancel}
         />
         <div className="relative z-10 w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="flex gap-3 justify-end">
               <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
               >
                  Cancel
               </Button>
               <Button
                  variant="destructive"
                  size="sm"
                  onClick={onConfirm}
               >
                  {confirmLabel}
               </Button>
            </div>
         </div>
      </div>
   );
}

export default function JobDetailPage() {
   const { id } = useParams<{ id: string }>();
   const router = useRouter();
   const { data: job, isLoading } = useJob(id);
   const { data: applicantsData } = useApplicants(id);
   const updateJob = useUpdateJob(id);
   const closeJob = useCloseJob();
   const publishJob = usePublishJob();
   const { toast } = useToast();
   const [editing, setEditing] = useState(false);
   const [confirmClose, setConfirmClose] = useState(false);
   const { user } = useAppSelector((s) => s.auth);

   const applicantCount =
      applicantsData?.meta?.total ?? applicantsData?.items?.length ?? 0;

   const handleUpdate = async (data: JobFormData) => {
      await updateJob.mutateAsync(data);
      toast({ title: "Job updated successfully" });
      setEditing(false);
   };

   const handlePublish = async () => {
      try {
         await publishJob.mutateAsync(id);
         toast({ title: "Job published" });
      } catch (e: unknown) {
         toast({
            title: "Failed to publish job",
            description: e instanceof Error ? e.message : "Unknown error",
            variant: "destructive",
         });
      }
   };

   const handleClose = async () => {
      try {
         await closeJob.mutateAsync(id);
         toast({ title: "Job closed" });
      } catch (e: unknown) {
         toast({
            title: "Failed to close job",
            description: e instanceof Error ? e.message : "Unknown error",
            variant: "destructive",
         });
      }
   };

   if (isLoading) {
      return (
         <div className="flex flex-col flex-1 overflow-hidden">
            <Header title="Job" />
            <main className="flex-1 p-4 sm:p-6 space-y-4">
               {Array.from({ length: 5 }).map((_, i) => (
                  <div
                     key={i}
                     className="h-12 rounded-xl bg-muted animate-pulse"
                  />
               ))}
            </main>
         </div>
      );
   }

   if (!job) {
      return (
         <div className="flex flex-col flex-1 items-center justify-center p-6 gap-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Job not found.</p>
            <Button
               variant="outline"
               onClick={() => router.push("/jobs")}
            >
               <ArrowLeft className="h-4 w-4 mr-1" /> Back to Jobs
            </Button>
         </div>
      );
   }

   const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.draft;
   const isAdmin = user?.role !== "candidate";

   return (
      <>
         <ConfirmDialog
            open={confirmClose}
            title="Close this job?"
            description="Closing the job will stop accepting new applicants. You can reopen it later."
            confirmLabel="Close Job"
            onConfirm={() => {
               setConfirmClose(false);
               handleClose();
            }}
            onCancel={() => setConfirmClose(false)}
         />
         <div className="flex flex-col flex-1 overflow-hidden">
            <Header
               title={job.title}
               actions={
                  isAdmin ? (
                     <div className="flex items-center gap-2">
                        {/* Lifecycle action buttons */}
                        {!editing && (
                           <>
                              {job.status === "draft" && (
                                 <Button
                                    size="sm"
                                    className="gap-1.5"
                                    disabled={publishJob.isPending}
                                    onClick={handlePublish}
                                 >
                                    <Globe className="h-3.5 w-3.5" /> Publish
                                 </Button>
                              )}
                              {job.status === "open" && (
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                                    disabled={closeJob.isPending}
                                    onClick={() => setConfirmClose(true)}
                                 >
                                    <Lock className="h-3.5 w-3.5" /> Close
                                 </Button>
                              )}
                              {job.status === "closed" && (
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    disabled={publishJob.isPending}
                                    onClick={handlePublish}
                                 >
                                    <RefreshCw className="h-3.5 w-3.5" /> Reopen
                                 </Button>
                              )}
                           </>
                        )}
                        <Button
                           variant={editing ? "destructive" : "outline"}
                           size="sm"
                           onClick={() => setEditing((v) => !v)}
                           className="gap-1.5"
                        >
                           {editing ? (
                              <>
                                 <X className="h-3.5 w-3.5" /> Cancel
                              </>
                           ) : (
                              <>
                                 <Pencil className="h-3.5 w-3.5" /> Edit
                              </>
                           )}
                        </Button>
                     </div>
                  ) : undefined
               }
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
               {editing ? (
                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => setEditing(false)}
                        >
                           <ArrowLeft className="h-4 w-4 mr-1" /> Discard
                           changes
                        </Button>
                     </div>
                     <JobForm
                        defaultValues={{
                           title: job.title,
                           description: job.description,
                           requirements: job.requirements,
                           requiredSkills: job.requiredSkills,
                           requiredExperience: job.requiredExperience,
                           location: job.location,
                           type: job.type,
                           shortlistSize: job.shortlistSize,
                        }}
                        onSubmit={handleUpdate}
                        isSubmitting={updateJob.isPending}
                        submitLabel="Save Changes"
                     />
                  </div>
               ) : (
                  <div>
                     {/* Breadcrumb */}
                     <div className="flex items-center gap-2 mb-5">
                        <Button
                           variant="ghost"
                           size="sm"
                           asChild
                        >
                           <Link href="/jobs">
                              <ArrowLeft className="h-4 w-4 mr-1" /> Jobs
                           </Link>
                        </Button>
                        <span className="text-muted-foreground text-sm">/</span>
                        <span className="text-sm font-medium truncate max-w-48">
                           {job.title}
                        </span>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* ── Main content ── */}
                        <div className="lg:col-span-2 space-y-5">
                           {/* Title card */}
                           <Card>
                              <CardContent className="p-6">
                                 <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                       <Briefcase className="h-6 w-6 text-primary" />
                                    </div>
                                    <span
                                       className={cn(
                                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                                          statusCfg.badge,
                                       )}
                                    >
                                       <span
                                          className={cn(
                                             "h-1.5 w-1.5 rounded-full",
                                             statusCfg.dot,
                                          )}
                                       />
                                       {job.status}
                                    </span>
                                 </div>
                                 <h1 className="text-xl font-bold mb-1">
                                    {job.title}
                                 </h1>
                                 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                       <MapPin className="h-3.5 w-3.5 shrink-0" />{" "}
                                       {job.location}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                       <Clock className="h-3.5 w-3.5 shrink-0" />{" "}
                                       {job.type}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                       <GraduationCap className="h-3.5 w-3.5 shrink-0" />{" "}
                                       {job.requiredExperience}+ yrs exp
                                    </span>
                                 </div>
                              </CardContent>
                           </Card>

                           {/* Draft notice banner */}
                           {job.status === "draft" && (
                              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                 <Pencil className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                                 <div>
                                    <p className="font-semibold">
                                       Draft — not visible to applicants
                                    </p>
                                    <p className="text-amber-700 mt-0.5 text-xs">
                                       Review the details below and click{" "}
                                       <strong>Publish</strong> when ready to
                                       open applications.
                                    </p>
                                 </div>
                              </div>
                           )}

                           {/* Description */}
                           <Card>
                              <CardHeader className="pb-2">
                                 <CardTitle className="text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />{" "}
                                    Description
                                 </CardTitle>
                              </CardHeader>
                              <CardContent>
                                 <div
                                    className="prose prose-sm max-w-none text-muted-foreground [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                                    dangerouslySetInnerHTML={{
                                       __html: job.description,
                                    }}
                                 />
                              </CardContent>
                           </Card>

                           {/* Requirements */}
                           <Card>
                              <CardHeader className="pb-2">
                                 <CardTitle className="text-sm flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-muted-foreground" />{" "}
                                    Requirements
                                 </CardTitle>
                              </CardHeader>
                              <CardContent>
                                 <div
                                    className="prose prose-sm max-w-none text-muted-foreground [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                                    dangerouslySetInnerHTML={{
                                       __html: job.requirements,
                                    }}
                                 />
                              </CardContent>
                           </Card>

                           {/* Skills */}
                           <Card>
                              <CardHeader className="pb-2">
                                 <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-muted-foreground" />{" "}
                                    Required Skills
                                 </CardTitle>
                              </CardHeader>
                              <CardContent>
                                 <div className="flex flex-wrap gap-2">
                                    {job.requiredSkills.map((skill) => (
                                       <span
                                          key={skill}
                                          className="inline-flex items-center rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary"
                                       >
                                          {skill}
                                       </span>
                                    ))}
                                 </div>
                              </CardContent>
                           </Card>
                        </div>

                        {/* ── Sidebar ── */}
                        <div className="space-y-4">
                           {/* Metrics */}
                           <div className="grid grid-cols-2 gap-3">
                              <Card>
                                 <CardContent className="p-4 text-center">
                                    <p className="text-2xl font-bold text-primary">
                                       {applicantCount}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                       Applicants
                                    </p>
                                 </CardContent>
                              </Card>
                              <Card>
                                 <CardContent className="p-4 text-center">
                                    <p className="text-2xl font-bold text-primary">
                                       {job.shortlistSize}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                       Shortlist target
                                    </p>
                                 </CardContent>
                              </Card>
                           </div>

                           {/* Details */}
                           <Card>
                              <CardHeader className="pb-1">
                                 <CardTitle className="text-sm">
                                    Job Details
                                 </CardTitle>
                              </CardHeader>
                              <CardContent className="px-4 pb-4">
                                 <InfoRow
                                    label="Status"
                                    value={
                                       <span
                                          className={cn(
                                             "rounded-full px-2 py-0.5 capitalize text-xs font-semibold",
                                             statusCfg.badge,
                                          )}
                                       >
                                          {job.status}
                                       </span>
                                    }
                                 />
                                 <InfoRow
                                    label="Type"
                                    value={job.type}
                                 />
                                 <InfoRow
                                    label="Location"
                                    value={job.location}
                                 />
                                 <InfoRow
                                    label="Experience"
                                    value={`${job.requiredExperience}+ years`}
                                 />
                                 <InfoRow
                                    label="Created"
                                    value={formatDistanceToNow(
                                       new Date(job.createdAt),
                                       { addSuffix: true },
                                    )}
                                 />
                              </CardContent>
                           </Card>

                           {/* Actions */}
                           {isAdmin && (
                              <div className="space-y-2">
                                 <Button
                                    asChild
                                    variant="outline"
                                    className="w-full gap-2"
                                 >
                                    <Link href={`/jobs/${id}/applicants`}>
                                       <Users className="h-4 w-4" /> Manage
                                       Applicants
                                    </Link>
                                 </Button>
                                 <Button
                                    asChild
                                    className="w-full gap-2"
                                 >
                                    <Link href={`/jobs/${id}/screening`}>
                                       <Sparkles className="h-4 w-4" /> AI
                                       Screening
                                    </Link>
                                 </Button>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               )}
            </main>
            <ActivityEmailPanel jobId={id} />
         </div>
      </>
   );
}
