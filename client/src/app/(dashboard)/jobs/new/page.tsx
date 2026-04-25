"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
   ArrowLeft,
   Sparkles,
   Lightbulb,
   Target,
   CheckCircle2,
   Clock,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { JobForm } from "@/components/features/jobs/JobForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateJob } from "@/services/job.service";
import { useGetSettings } from "@/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import type { JobFormData } from "@/types";

const TIPS = [
   {
      icon: Target,
      title: "Be specific with requirements",
      body: "Clear requirements improve AI screening accuracy. List skills, experience level, and deliverables precisely.",
   },
   {
      icon: Lightbulb,
      title: "Include a shortlist target",
      body: "Setting a shortlist number helps Gemini AI know how many top candidates to surface from the pool.",
   },
   {
      icon: Sparkles,
      title: "AI does the heavy lifting",
      body: "Once applicants are added, trigger AI Screening and get ranked candidates with justifications automatically.",
   },
   {
      icon: Clock,
      title: "Draft first, publish later",
      body: "Save as Draft to refine the role before it goes live. You can change status anytime from the job detail page.",
   },
];

const STEPS = [
   "Fill in the job details below",
   "Add applicants via platform sync or file upload",
   "Trigger AI Screening to rank candidates",
];

export default function NewJobPage() {
   const router = useRouter();
   const createJob = useCreateJob();
   const { toast } = useToast();
   const { data: settings } = useGetSettings();

   const handleSubmit = async (data: JobFormData) => {
      const job = await createJob.mutateAsync(data);
      toast({ title: "Job created successfully" });
      router.push(`/jobs/${job._id}`);
   };

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title="New Job" />
         <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6 text-sm">
               <Link
                  href="/jobs"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
               >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Jobs</span>
               </Link>
               <span className="text-muted-foreground/40">/</span>
               <span className="font-medium">New Job</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
               {/* ── Form ────────────────────────────────────────────────── */}
               <div>
                  <JobForm
                     onSubmit={handleSubmit}
                     isSubmitting={createJob.isPending}
                     defaultShortlistSize={settings?.defaultShortlistSize}
                  />
               </div>

               {/* ── Side panel ──────────────────────────────────────────── */}
               <div className="flex flex-col gap-4">
                  {/* How it works */}
                  <Card className="border-primary/20 bg-primary/2">
                     <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                           <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                           </div>
                           <p className="text-sm font-semibold">How it works</p>
                        </div>
                        <ol className="flex flex-col gap-3">
                           {STEPS.map((step, i) => (
                              <li
                                 key={i}
                                 className="flex items-start gap-3"
                              >
                                 <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {i + 1}
                                 </span>
                                 <p className="text-xs text-muted-foreground leading-relaxed">
                                    {step}
                                 </p>
                              </li>
                           ))}
                        </ol>
                     </CardContent>
                  </Card>

                  {/* Tips */}
                  <Card>
                     <CardContent className="p-5">
                        <p className="text-sm font-semibold mb-4">
                           Best practices
                        </p>
                        <div className="flex flex-col gap-4">
                           {TIPS.map(({ icon: Icon, title, body }) => (
                              <div
                                 key={title}
                                 className="flex gap-3"
                              >
                                 <div className="h-7 w-7 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                 </div>
                                 <div>
                                    <p className="text-xs font-semibold mb-0.5">
                                       {title}
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                       {body}
                                    </p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </CardContent>
                  </Card>

                  {/* Checklist */}
                  <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
                     <CardContent className="p-5">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                           Before posting — checklist
                        </p>
                        {[
                           "Job title is clear and searchable",
                           "Requirements list key technical skills",
                           "Shortlist target is set",
                           "Location / type is specified",
                        ].map((item) => (
                           <div
                              key={item}
                              className="flex items-start gap-2 mb-2"
                           >
                              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                              <p className="text-xs text-muted-foreground">
                                 {item}
                              </p>
                           </div>
                        ))}
                     </CardContent>
                  </Card>
               </div>
            </div>
         </main>
      </div>
   );
}
