"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ActivityEmailPanel } from "@/components/features/shortlists/ActivityEmailPanel";
import Link from "next/link";
import {
   ArrowLeft,
   Sparkles,
   Users,
   Upload,
   Layers,
   MoreVertical,
   Trash2,
   Globe,
   Clock,
   FileText,
   Lock,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { ApplicantTable } from "@/components/features/applicants/ApplicantTable";
import { FileUploadZone } from "@/components/features/applicants/FileUploadZone";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
   useApplicants,
   useAddPlatformApplicants,
   useUploadExternalApplicants,
   // useUploadResumeApplicant,
   useUploadResumeApplicants,
   useDeleteApplicant,
} from "@/services/applicant.service";
import { useJob } from "@/services/job.service";
import { useToast } from "@/hooks/use-toast";
import type { TalentProfile } from "@/types";

export default function JobApplicantsPage() {
   const { id } = useParams<{ id: string }>();
   const { toast } = useToast();
   const [page, setPage] = useState(1);
   const [limit, setLimit] = useState(10);

   const { data: job } = useJob(id);
   const { data, isLoading } = useApplicants(id, { page, limit });
   const addPlatform = useAddPlatformApplicants(id);
   const uploadExternal = useUploadExternalApplicants(id);
   // const uploadResume = useUploadResumeApplicant(id);
   const uploadResumes = useUploadResumeApplicants(id);
   const deleteApplicant = useDeleteApplicant(id);

   const [jsonInput, setJsonInput] = useState("");
   const [jsonError, setJsonError] = useState("");
   const applicants = data?.items ?? [];

   const MAX_RESUMES = 10;

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
      } catch (err: unknown) {
         const message =
            (err as { response?: { data?: { message?: string } } })?.response
               ?.data?.message ?? "Failed to add applicants";
         toast({ title: message, variant: "destructive" });
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

   // const handleResume = async (file: File) => {
   //    try {
   //       await uploadResume.mutateAsync(file);
   //       toast({
   //          title: "Resume parsed successfully",
   //          description: "Candidate profile extracted and added.",
   //       });
   //    } catch {
   //       toast({
   //          title: "Resume parsing failed",
   //          description: "Ensure the PDF is text-based and readable.",
   //          variant: "destructive",
   //       });
   //    }
   // };

   const handleResumes = async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, MAX_RESUMES);

      if (fileArray.length === 0) return;

      const invalidFiles = fileArray.filter(
         (f) => f.type !== "application/pdf",
      );
      if (invalidFiles.length > 0) {
         toast({
            title: "Invalid files detected",
            description: `Only PDF files are accepted. Skipped: ${invalidFiles.map((f) => f.name).join(", ")}`,
            variant: "destructive",
         });
         return;
      }

      try {
         const result = await uploadResumes.mutateAsync(fileArray);
         toast({
            title: `${result.count} resume${result.count !== 1 ? "s" : ""} parsed successfully`,
            description: "Candidate profiles extracted and added.",
         });
      } catch {
         toast({
            title: "Bulk upload failed",
            description:
               "One or more resumes could not be parsed. Ensure all PDFs are text-based.",
            variant: "destructive",
         });
      }
   };

   const handleDelete = async (applicantId: string) => {
      if (!confirm("Remove this applicant?")) return;
      try {
         await deleteApplicant.mutateAsync(applicantId);
         toast({ title: "Applicant removed" });
      } catch {
         toast({ title: "Delete failed", variant: "destructive" });
      }
   };

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title={job ? `${job.title} – Applicants` : "Applicants"} />

         <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-5">
               {/* Breadcrumb */}
               <div className="flex items-center justify-between">
                  <Button
                     variant="ghost"
                     size="sm"
                     asChild
                  >
                     <Link href={`/jobs/${id}`}>
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        {job?.title ?? "Back to Job"}
                     </Link>
                  </Button>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {isLoading
                           ? "…"
                           : `${applicants.length} applicant${applicants.length !== 1 ? "s" : ""}`}
                     </div>
                     <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                     >
                        <Link href={`/jobs/${id}/screening`}>
                           <Sparkles className="h-3.5 w-3.5" /> Run Screening
                        </Link>
                     </Button>
                  </div>
               </div>

               {/* Closed-job notice */}
               {job?.status === "closed" && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-4 py-3">
                     <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                     <p className="text-sm text-amber-700 dark:text-amber-400 leading-snug">
                        <span className="font-semibold">Job closed.</span> This
                        position is no longer accepting new applicants. You can
                        still view existing applicants and run screening.
                     </p>
                  </div>
               )}

               {/* Tabs */}
               <Tabs defaultValue="list">
                  <TabsList className="grid w-full grid-cols-4">
                     <TabsTrigger
                        value="list"
                        className="gap-1.5"
                     >
                        <Users className="h-3.5 w-3.5" />
                        All
                        {!isLoading && applicants.length > 0 && (
                           <span className="ml-1 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-xs font-bold">
                              {applicants.length}
                           </span>
                        )}
                     </TabsTrigger>
                     <TabsTrigger
                        value="platform"
                        className="gap-1.5"
                        disabled={job?.status === "closed"}
                     >
                        <Layers className="h-3.5 w-3.5" />
                        Platform
                     </TabsTrigger>
                     <TabsTrigger
                        value="upload"
                        className="gap-1.5"
                        disabled={job?.status === "closed"}
                     >
                        <Upload className="h-3.5 w-3.5" />
                        Spreadsheet
                     </TabsTrigger>
                     <TabsTrigger
                        value="resume"
                        className="gap-1.5"
                        disabled={job?.status === "closed"}
                     >
                        <FileText className="h-3.5 w-3.5" />
                        Resumes
                     </TabsTrigger>
                  </TabsList>

                  {/* ── All applicants ── */}
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
                     {!isLoading && applicants.length > 0 && (
                        <div className="mt-4 flex justify-end">
                           <Button asChild>
                              <Link href={`/jobs/${id}/screening`}>
                                 <Sparkles className="h-4 w-4 mr-1.5" />
                                 Run AI Screening
                              </Link>
                           </Button>
                        </div>
                     )}
                  </TabsContent>

                  {/* ── Platform JSON ── */}
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
                                 <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    Paste a JSON array of structured talent
                                    profiles exported from the Umurava platform.
                                 </p>
                              </div>
                           </div>
                           <Textarea
                              rows={10}
                              className="font-mono text-xs"
                              placeholder={`[{\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "skills": ["React", "Node.js"],\n  ...\n}]`}
                              value={jsonInput}
                              onChange={(e) => setJsonInput(e.target.value)}
                           />
                           {jsonError && (
                              <p className="text-xs text-destructive">
                                 {jsonError}
                              </p>
                           )}
                           <Button
                              onClick={handleJsonSubmit}
                              disabled={
                                 !jsonInput.trim() ||
                                 addPlatform.isPending ||
                                 job?.status === "closed"
                              }
                              className="w-full"
                           >
                              {addPlatform.isPending
                                 ? "Adding…"
                                 : "Add Applicants"}
                           </Button>
                        </CardContent>
                     </Card>
                  </TabsContent>

                  {/* ── File upload ── */}
                  <TabsContent
                     value="upload"
                     className="mt-4"
                  >
                     <FileUploadZone
                        onFile={handleFile}
                        isLoading={uploadExternal.isPending}
                     />
                  </TabsContent>

                  {/* ── Resume upload ── */}
                  <TabsContent
                     value="resume"
                     className="mt-4"
                  >
                     <Card>
                        <CardContent className="p-5 space-y-4">
                           <div className="flex items-start gap-3">
                              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                                 <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                 <p className="text-sm font-semibold">
                                    Upload PDF Resumes
                                 </p>
                                 <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    Upload a candidate&apos;s resume as a PDF
                                    file. AI will automatically extract their
                                    profile data. you can only upload{" "}
                                    {MAX_RESUMES} at a time and the more resumes
                                    increases ,the more the time taken for
                                    extracting data.
                                 </p>
                              </div>
                           </div>
                           <FileUploadZone
                              onFile={() => {}} // required by type, unused in multi mode
                              onFiles={handleResumes}
                              isLoading={uploadResumes.isPending}
                              accept={{ "application/pdf": [".pdf"] }}
                              multiple
                              maxFiles={MAX_RESUMES}
                           />
                           {uploadResumes.isPending && (
                              <p className="text-xs text-muted-foreground text-center animate-pulse">
                                 Parsing resumes with AI… this may take a moment
                              </p>
                           )}
                        </CardContent>
                     </Card>
                  </TabsContent>
               </Tabs>
            </div>
         </main>
         <ActivityEmailPanel jobId={id} />
      </div>
   );
}
