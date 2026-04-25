"use client";

import { useState } from "react";
import Link from "next/link";
import {
   Trophy,
   Briefcase,
   BarChart2,
   CheckCircle2,
   ChevronDown,
   ChevronUp,
   Sparkles,
   Clock,
   Bot,
   AlertCircle,
   MapPin,
   Download,
   Eye,
   Star,
   ArrowRight,
   ChevronLeft,
   ExternalLink,
   UserCircle,
   CalendarClock,
   MailOpen,
   Mail,
   Loader2,
   Send,
   Undo2,
   UserCheck,
   UserPlus,
   UserMinus,
   XCircle,
   Users,
} from "lucide-react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ApplicantPreviewDrawer } from "@/components/features/applicants/ApplicantPreviewDrawer";
import { Header } from "@/components/layout/Header";
import { ScoreBar } from "@/components/features/screening/ScoreBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAllShortlists } from "@/services/screening.service";
import {
   useFinalizeCandidates,
   useSendInterviewInvitations,
   useSendRegretLetters,
} from "@/services/finalSelection.service";
import { exportToCsv } from "@/lib/exportCsv";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import type {
   ShortlistedCandidate,
   ShortlistWithJob,
   FinalSelection,
} from "@/types";

// ─── Types & helpers ──────────────────────────────────────────────────────────

type LocalStatus = "selected" | "pool" | "rejected";

function initSelections(
   shortlist: ShortlistedCandidate[],
   fs?: FinalSelection,
): Map<string, LocalStatus> {
   const map = new Map<string, LocalStatus>();
   for (const c of shortlist) {
      if (fs?.selectedCandidateIds.includes(c.candidateId))
         map.set(c.candidateId, "selected");
      else if (fs?.talentPoolCandidateIds.includes(c.candidateId))
         map.set(c.candidateId, "pool");
      else if (fs) map.set(c.candidateId, "rejected");
      else map.set(c.candidateId, "selected");
   }
   return map;
}

function candidateName(c: ShortlistedCandidate) {
   return c.applicant?.profile
      ? `${c.applicant.profile.firstName} ${c.applicant.profile.lastName}`
      : `Candidate #${c.rank}`;
}
function candidateInitials(c: ShortlistedCandidate) {
   return c.applicant?.profile
      ? (
           c.applicant.profile.firstName[0] + c.applicant.profile.lastName[0]
        ).toUpperCase()
      : `${c.rank}`;
}

const AVATAR_PALETTE = [
   "bg-violet-100 text-violet-700",
   "bg-blue-100 text-blue-700",
   "bg-emerald-100 text-emerald-700",
   "bg-amber-100 text-amber-700",
   "bg-rose-100 text-rose-700",
   "bg-sky-100 text-sky-700",
   "bg-pink-100 text-pink-700",
   "bg-teal-100 text-teal-700",
];

// ─── Rank Medal ───────────────────────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
   const base =
      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm text-xs font-black";
   if (rank === 1)
      return (
         <div
            className={cn(
               base,
               "bg-gradient-to-br from-amber-300 to-amber-500 ring-2 ring-amber-200",
            )}
         >
            1
         </div>
      );
   if (rank === 2)
      return (
         <div
            className={cn(
               base,
               "bg-gradient-to-br from-slate-300 to-slate-400 ring-2 ring-slate-200",
            )}
         >
            2
         </div>
      );
   if (rank === 3)
      return (
         <div
            className={cn(
               base,
               "bg-gradient-to-br from-orange-300 to-orange-500 ring-2 ring-orange-200",
            )}
         >
            3
         </div>
      );
   return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
         {rank}
      </div>
   );
}

// ─── Send Email Dialog ────────────────────────────────────────────────────────

function SendEmailDialog({
   open,
   onOpenChange,
   type,
   jobId,
   jobTitle,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   type: "invitation" | "regret";
   jobId: string;
   jobTitle: string;
}) {
   const { toast } = useToast();
   const [interviewDetails, setInterviewDetails] = useState("");
   const [targetGroup, setTargetGroup] = useState<
      "all" | "talent_pool" | "rejected"
   >("all");
   const { mutateAsync: sendInvitations, isPending: sendingInv } =
      useSendInterviewInvitations(jobId);
   const { mutateAsync: sendRegret, isPending: sendingReg } =
      useSendRegretLetters(jobId);
   const isPending = sendingInv || sendingReg;

   async function handleSend() {
      try {
         const result =
            type === "invitation"
               ? await sendInvitations({
                    interviewDetails: interviewDetails.trim() || undefined,
                 })
               : await sendRegret({ targetGroup });
         toast({
            title: result.failed > 0 ? "Partially sent" : "Emails sent!",
            description: result.message,
            variant: result.failed > 0 ? "destructive" : "default",
         });
         if (result.sent > 0) onOpenChange(false);
      } catch (err) {
         toast({
            title: "Failed to send emails",
            description: (err as Error).message,
            variant: "destructive",
         });
      }
   }

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="max-w-lg">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  {type === "invitation" ? (
                     <>
                        <MailOpen className="h-5 w-5 text-emerald-600" />
                        Send Interview Invitations
                     </>
                  ) : (
                     <>
                        <Mail className="h-5 w-5 text-rose-500" />
                        Send Regret Letters
                     </>
                  )}
               </DialogTitle>
               <DialogDescription>{jobTitle}</DialogDescription>
            </DialogHeader>

            {type === "invitation" && (
               <div className="space-y-2">
                  <label className="text-sm font-medium block">
                     Interview Details{" "}
                     <span className="text-muted-foreground font-normal text-xs">
                        (optional)
                     </span>
                  </label>
                  <Textarea
                     placeholder="e.g. Interview via Google Meet on May 5th at 10:00 AM EAT…"
                     value={interviewDetails}
                     onChange={(e) => setInterviewDetails(e.target.value)}
                     rows={4}
                     className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                     Leave blank to send your configured invitation template.
                  </p>
               </div>
            )}

            {type === "regret" && (
               <div className="space-y-3">
                  <p className="text-sm font-medium">Send to</p>
                  <div className="space-y-2">
                     {[
                        {
                           value: "all" as const,
                           label: "All rejected candidates",
                           desc: "Everyone not selected, including talent pool",
                        },
                        {
                           value: "talent_pool" as const,
                           label: "Talent pool only",
                           desc: "Near-miss candidates added to your pool",
                        },
                        {
                           value: "rejected" as const,
                           label: "Rejected only",
                           desc: "Candidates not selected and not in the pool",
                        },
                     ].map((opt) => (
                        <button
                           key={opt.value}
                           onClick={() => setTargetGroup(opt.value)}
                           className={cn(
                              "w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors",
                              targetGroup === opt.value
                                 ? "bg-primary/5 border-primary/30"
                                 : "border-muted hover:bg-muted/50",
                           )}
                        >
                           <div
                              className={cn(
                                 "mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                                 targetGroup === opt.value
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/30",
                              )}
                           >
                              {targetGroup === opt.value && (
                                 <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                           </div>
                           <div>
                              <p className="text-sm font-medium">{opt.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                 {opt.desc}
                              </p>
                           </div>
                        </button>
                     ))}
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                     Regret letters will use your configured template from
                     Settings → Email.
                  </div>
               </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
               <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
               >
                  Cancel
               </Button>
               <Button
                  onClick={handleSend}
                  disabled={isPending}
                  className={
                     type === "invitation"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : ""
                  }
               >
                  {isPending ? (
                     <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                     <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Emails
               </Button>
            </div>
         </DialogContent>
      </Dialog>
   );
}

// ─── Candidate Row ────────────────────────────────────────────────────────────

function CandidateRow({
   candidate,
   index,
   variant,
   onAction,
   onPreview,
   isSaving,
}: {
   candidate: ShortlistedCandidate;
   index: number;
   variant: LocalStatus;
   onAction: (id: string, next: LocalStatus) => void;
   onPreview: () => void;
   isSaving?: boolean;
}) {
   const [expanded, setExpanded] = useState(false);
   const profile = candidate.applicant?.profile;
   const name = candidateName(candidate);
   const initials = candidateInitials(candidate);
   const avatarColor = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
   const linkedin =
      profile?.socialLinks?.["linkedin"] ?? profile?.socialLinks?.["LinkedIn"];

   // Action buttons per section
   const actions =
      variant === "selected"
         ? [
              {
                 label: "Move to Pool",
                 icon: <UserPlus className="h-3.5 w-3.5" />,
                 next: "pool" as LocalStatus,
                 className:
                    "border border-violet-300 text-violet-700 hover:bg-violet-50 bg-white",
              },
              {
                 label: "Unselect",
                 icon: <XCircle className="h-3.5 w-3.5" />,
                 next: "rejected" as LocalStatus,
                 className:
                    "border border-rose-200 text-rose-500 hover:bg-rose-50 bg-white",
              },
           ]
         : variant === "pool"
           ? [
                {
                   label: "Select",
                   icon: <UserCheck className="h-3.5 w-3.5" />,
                   next: "selected" as LocalStatus,
                   className:
                      "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent",
                },
                {
                   label: "Remove",
                   icon: <UserMinus className="h-3.5 w-3.5" />,
                   next: "rejected" as LocalStatus,
                   className:
                      "border border-border text-muted-foreground hover:bg-muted bg-white",
                },
             ]
           : [
                {
                   label: "Reconsider",
                   icon: <Undo2 className="h-3.5 w-3.5" />,
                   next: "selected" as LocalStatus,
                   className:
                      "border border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white",
                },
                {
                   label: "Add to Pool",
                   icon: <UserPlus className="h-3.5 w-3.5" />,
                   next: "pool" as LocalStatus,
                   className:
                      "border border-violet-300 text-violet-700 hover:bg-violet-50 bg-white",
                },
             ];

   return (
      <div
         className={cn(
            "transition-colors",
            variant === "selected" && "hover:bg-emerald-50/60",
            variant === "pool" && "hover:bg-violet-50/40",
            variant === "rejected" &&
               "opacity-70 hover:opacity-90 hover:bg-muted/20",
         )}
      >
         {/* Main row */}
         <div className="flex items-center gap-3 px-5 py-3.5">
            <RankMedal rank={candidate.rank} />

            <div
               className={cn(
                  "hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  avatarColor,
               )}
            >
               {initials}
            </div>

            {/* Name */}
            <div
               className="flex-1 min-w-0 cursor-pointer"
               onClick={() => setExpanded((v) => !v)}
            >
               <p className="text-sm font-semibold truncate">{name}</p>
               <div className="flex items-center gap-2 mt-0.5">
                  {profile?.headline && (
                     <p className="text-xs text-muted-foreground truncate">
                        {profile.headline}
                     </p>
                  )}
                  {profile?.location && (
                     <span className="hidden xl:flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                        <MapPin className="h-2.5 w-2.5" />
                        {profile.location}
                     </span>
                  )}
               </div>
            </div>

            {/* Score bar */}
            <div className="hidden lg:block shrink-0 w-28">
               <ScoreBar
                  score={candidate.matchScore}
                  size="sm"
               />
            </div>

            {/* Score pill on mobile */}
            <div className="lg:hidden shrink-0">
               <span
                  className={cn(
                     "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                     candidate.matchScore >= 80
                        ? "bg-emerald-100 text-emerald-700"
                        : candidate.matchScore >= 60
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700",
                  )}
               >
                  {candidate.matchScore}%
               </span>
            </div>

            {/* Action buttons — labeled */}
            <div className="flex items-center gap-2 shrink-0">
               {actions.map(({ label, icon, next, className }) => (
                  <button
                     key={label}
                     onClick={() => onAction(candidate.candidateId, next)}
                     className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        className,
                     )}
                  >
                     {icon}
                     {label}
                  </button>
               ))}

               {/* Quick preview */}
               {candidate.applicant?._id && (
                  <button
                     onClick={(e) => {
                        e.stopPropagation();
                        onPreview();
                     }}
                     className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                     title="Quick preview"
                  >
                     <Eye className="h-3.5 w-3.5" />
                  </button>
               )}

               {/* Expand */}
               <button
                  onClick={() => setExpanded((v) => !v)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
               >
                  {expanded ? (
                     <ChevronUp className="h-4 w-4" />
                  ) : (
                     <ChevronDown className="h-4 w-4" />
                  )}
               </button>
            </div>
         </div>

         {/* Expanded detail */}
         {expanded && (
            <div className="border-t border-l-2 border-l-primary/20 mx-5 mb-3 rounded-r-xl bg-muted/20">
               <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_220px] gap-5">
                  <div className="md:col-span-2">
                     <div className="flex items-center gap-1.5 text-primary mb-2">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wide">
                           AI Recommendation
                        </span>
                     </div>
                     <p className="text-sm text-foreground leading-relaxed mb-4">
                        {candidate.recommendation}
                     </p>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <div className="flex items-center gap-1.5 text-emerald-600 mb-2">
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="text-xs font-semibold uppercase tracking-wide">
                                 Strengths
                              </span>
                           </div>
                           <ul className="space-y-1.5">
                              {candidate.strengths.map((s, i) => (
                                 <li
                                    key={i}
                                    className="text-xs text-muted-foreground flex gap-1.5"
                                 >
                                    <span className="text-emerald-500 shrink-0 mt-px">
                                       ✓
                                    </span>
                                    {s}
                                 </li>
                              ))}
                           </ul>
                        </div>
                        <div>
                           <div className="flex items-center gap-1.5 text-amber-600 mb-2">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-xs font-semibold uppercase tracking-wide">
                                 Gaps / Risks
                              </span>
                           </div>
                           <ul className="space-y-1.5">
                              {candidate.gaps.map((g, i) => (
                                 <li
                                    key={i}
                                    className="text-xs text-muted-foreground flex gap-1.5"
                                 >
                                    <span className="text-amber-500 shrink-0 mt-px">
                                       ·
                                    </span>
                                    {g}
                                 </li>
                              ))}
                           </ul>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     {candidate.criteriaScores && (
                        <div>
                           <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                              Score Breakdown
                           </p>
                           {[
                              { key: "skills" as const, bar: "bg-violet-400" },
                              {
                                 key: "experience" as const,
                                 bar: "bg-blue-400",
                              },
                              {
                                 key: "education" as const,
                                 bar: "bg-emerald-400",
                              },
                              { key: "projects" as const, bar: "bg-amber-400" },
                              {
                                 key: "availability" as const,
                                 bar: "bg-rose-400",
                              },
                           ].map(({ key, bar }) => {
                              const val = candidate.criteriaScores![key] ?? 0;
                              return (
                                 <div
                                    key={key}
                                    className="flex items-center gap-2 mb-1.5"
                                 >
                                    <span className="w-20 text-xs text-muted-foreground shrink-0 capitalize">
                                       {key}
                                    </span>
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                       <div
                                          className={cn(
                                             "h-full rounded-full",
                                             bar,
                                          )}
                                          style={{ width: `${val}%` }}
                                       />
                                    </div>
                                    <span className="text-xs font-mono tabular-nums w-7 text-right text-foreground/60">
                                       {val}
                                    </span>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                     {profile?.skills && profile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                           {profile.skills.slice(0, 6).map((s) => (
                              <Badge
                                 key={s.name}
                                 variant="secondary"
                                 className="text-[10px] px-1.5 py-0.5"
                              >
                                 {s.name}
                              </Badge>
                           ))}
                        </div>
                     )}
                     <div className="flex flex-col gap-1.5 pt-1">
                        {linkedin && (
                           <a
                              href={linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                           >
                              <ExternalLink className="h-3 w-3" />
                              LinkedIn Profile
                           </a>
                        )}
                        {candidate.applicant?._id && (
                           <Link
                              href={`/applicants/${candidate.applicant._id}`}
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                           >
                              <UserCircle className="h-3 w-3" />
                              View Full Profile
                           </Link>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

// ─── Candidate Section ────────────────────────────────────────────────────────

function CandidateSection({
   variant,
   candidates,
   selections,
   onAction,
   onPreview,
   collapsible = false,
   isSaving = false,
}: {
   variant: LocalStatus;
   candidates: ShortlistedCandidate[];
   selections: Map<string, LocalStatus>;
   onAction: (id: string, next: LocalStatus) => void;
   onPreview: (id: string) => void;
   collapsible?: boolean;
   isSaving?: boolean;
}) {
   const [collapsed, setCollapsed] = useState(false);

   const configs: Record<
      LocalStatus,
      {
         label: string;
         icon: React.ReactNode;
         headerClass: string;
         countClass: string;
      }
   > = {
      selected: {
         label: "Final Shortlist",
         icon: <Trophy className="h-4 w-4 text-amber-500" />,
         headerClass:
            "bg-gradient-to-r from-emerald-50 to-transparent border-emerald-200",
         countClass: "bg-emerald-100 text-emerald-700",
      },
      pool: {
         label: "Talent Pool",
         icon: <Users className="h-4 w-4 text-violet-500" />,
         headerClass:
            "bg-gradient-to-r from-violet-50 to-transparent border-violet-200",
         countClass: "bg-violet-100 text-violet-700",
      },
      rejected: {
         label: "Not Selected",
         icon: <XCircle className="h-4 w-4 text-muted-foreground" />,
         headerClass: "bg-muted/30 border-border",
         countClass: "bg-muted text-muted-foreground",
      },
   };

   const cfg = configs[variant];
   if (candidates.length === 0) return null;

   return (
      <div>
         {/* Section header */}
         <div
            className={cn(
               "flex items-center justify-between px-5 py-3 border-b",
               cfg.headerClass,
               collapsible && "cursor-pointer select-none",
            )}
            onClick={collapsible ? () => setCollapsed((v) => !v) : undefined}
         >
            <div className="flex items-center gap-2.5">
               {cfg.icon}
               <span className="text-sm font-semibold">{cfg.label}</span>
               <span
                  className={cn(
                     "inline-flex items-center justify-center rounded-full text-xs font-bold px-2 py-0.5 min-w-[1.5rem]",
                     cfg.countClass,
                  )}
               >
                  {candidates.length}
               </span>
               {variant === "selected" && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                     — selected for interview
                  </span>
               )}
               {variant === "pool" && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                     — near-miss candidates saved for future roles
                  </span>
               )}
            </div>
            {collapsible && (
               <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  {collapsed ? (
                     <ChevronDown className="h-4 w-4" />
                  ) : (
                     <ChevronUp className="h-4 w-4" />
                  )}
               </button>
            )}
         </div>

         {/* Column headers (only for selected section) */}
         {!collapsed && variant === "selected" && (
            <div className="hidden md:flex items-center gap-3 bg-muted/20 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b">
               <div className="w-9 shrink-0" />
               <div className="w-9 shrink-0 hidden sm:block" />
               <div className="flex-1">Candidate</div>
               <div className="hidden lg:block w-28 shrink-0">AI Score</div>
               <div className="w-56 shrink-0 text-right">Actions</div>
            </div>
         )}

         {/* Rows */}
         {!collapsed && (
            <div className="divide-y">
               {candidates.map((c, idx) => (
                  <CandidateRow
                     key={c.candidateId}
                     candidate={c}
                     index={idx}
                     variant={variant}
                     onAction={onAction}
                     onPreview={() => {
                        if (c.applicant?._id) onPreview(c.applicant._id);
                     }}
                     isSaving={isSaving}
                  />
               ))}
            </div>
         )}
      </div>
   );
}

// ─── Final Shortlists Table (overview page) ───────────────────────────────────

function FinalShortlistsTable({
   items,
   onOpen,
}: {
   items: ShortlistWithJob[];
   onOpen: (jobId: string) => void;
}) {
   const finalized = items.filter((i) => !!i.finalSelection?.finalizedAt);

   return (
      <div>
         <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Final Shortlists</h2>
            <Badge
               variant="secondary"
               className="text-xs"
            >
               {finalized.length}
            </Badge>
         </div>

         {finalized.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 px-5 py-8 text-center">
               <Trophy className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
               <p className="text-sm font-medium text-muted-foreground">
                  No finalized selections yet
               </p>
               <p className="text-xs text-muted-foreground/70 mt-1">
                  Open a position below and select your final candidates.
               </p>
            </div>
         ) : (
            <Card className="overflow-hidden shadow-sm">
               <div
                  className="hidden md:grid bg-muted/30 border-b px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                  style={{
                     gridTemplateColumns: "1fr 84px 72px 130px 150px 24px",
                  }}
               >
                  <div>Position</div>
                  <div className="text-center">Selected</div>
                  <div className="text-center">Pool</div>
                  <div>Finalized</div>
                  <div>Invitations</div>
                  <div />
               </div>
               <div className="divide-y">
                  {finalized.map((item) => {
                     const fs = item.finalSelection!;
                     const log = item.emailLog;
                     return (
                        <div
                           key={item.jobId}
                           onClick={() => onOpen(item.jobId)}
                           role="button"
                           tabIndex={0}
                           onKeyDown={(e) =>
                              e.key === "Enter" && onOpen(item.jobId)
                           }
                           className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_84px_72px_130px_150px_24px] items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                        >
                           <div className="min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                 {item.job?.title ?? "Untitled Job"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                 {item.job?.location && (
                                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                       <MapPin className="h-2.5 w-2.5" />
                                       {item.job.location}
                                    </span>
                                 )}
                                 {item.job?.type && (
                                    <Badge
                                       variant="outline"
                                       className="text-[10px] px-1.5 py-0 h-4"
                                    >
                                       {item.job.type}
                                    </Badge>
                                 )}
                              </div>
                           </div>
                           <div className="hidden md:flex flex-col items-center">
                              <span className="text-base font-bold text-emerald-600 tabular-nums">
                                 {fs.selectedCandidateIds.length}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                 selected
                              </span>
                           </div>
                           <div className="hidden md:flex flex-col items-center">
                              <span className="text-base font-bold text-violet-600 tabular-nums">
                                 {fs.talentPoolCandidateIds.length}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                 pool
                              </span>
                           </div>
                           <div className="hidden md:block">
                              <p className="text-xs font-medium">
                                 {format(
                                    new Date(fs.finalizedAt),
                                    "d MMM yyyy",
                                 )}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                 {fs.selectionType === "ai_recommended"
                                    ? "AI recommended"
                                    : "Manual"}
                              </p>
                           </div>
                           <div className="hidden md:block">
                              {log?.interviewInvitationsSent ? (
                                 <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                    <MailOpen className="h-3 w-3" />
                                    {log.interviewInvitationCount ?? 0} sent
                                 </span>
                              ) : (
                                 <span className="text-xs text-muted-foreground">
                                    Not yet sent
                                 </span>
                              )}
                           </div>
                           <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                     );
                  })}
               </div>
            </Card>
         )}
      </div>
   );
}

// ─── Job Overview Card ────────────────────────────────────────────────────────

function JobCard({
   item,
   onClick,
}: {
   item: ShortlistWithJob;
   onClick: () => void;
}) {
   const finalized = !!item.finalSelection?.finalizedAt;
   const fs = item.finalSelection;
   const topScore = item.shortlist.length
      ? Math.max(...item.shortlist.map((c) => c.matchScore))
      : 0;

   return (
      <div
         onClick={onClick}
         role="button"
         tabIndex={0}
         onKeyDown={(e) => e.key === "Enter" && onClick()}
         className="group flex flex-col gap-4 rounded-xl border bg-card p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
      >
         <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
               <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {item.job?.title ?? "Untitled Job"}
               </p>
               <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.job?.location && (
                     <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" />
                        {item.job.location}
                     </span>
                  )}
                  {item.job?.type && (
                     <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4"
                     >
                        {item.job.type}
                     </Badge>
                  )}
               </div>
            </div>
            {finalized ? (
               <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs font-medium shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Finalized
               </span>
            ) : (
               <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-xs font-medium shrink-0">
                  <Clock className="h-3 w-3" />
                  Pending
               </span>
            )}
         </div>
         <div className="grid grid-cols-3 gap-2 text-center py-2 border-y">
            <div>
               <p className="text-lg font-bold tabular-nums">
                  {item.shortlist.length}
               </p>
               <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  AI Ranked
               </p>
            </div>
            {finalized && fs ? (
               <>
                  <div>
                     <p className="text-lg font-bold tabular-nums text-emerald-600">
                        {fs.selectedCandidateIds.length}
                     </p>
                     <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Selected
                     </p>
                  </div>
                  <div>
                     <p className="text-lg font-bold tabular-nums text-violet-600">
                        {fs.talentPoolCandidateIds.length}
                     </p>
                     <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        In Pool
                     </p>
                  </div>
               </>
            ) : (
               <>
                  <div>
                     <p className="text-lg font-bold tabular-nums">
                        {topScore}%
                     </p>
                     <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Top Score
                     </p>
                  </div>
                  <div>
                     <p className="text-lg font-bold tabular-nums text-muted-foreground">
                        —
                     </p>
                     <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Pending
                     </p>
                  </div>
               </>
            )}
         </div>
         <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
               <Clock className="h-3 w-3" />
               {formatDistanceToNow(new Date(item.screenedAt), {
                  addSuffix: true,
               })}
            </span>
            <span className="flex items-center gap-0.5 text-primary font-medium group-hover:gap-1.5 transition-all">
               Open <ArrowRight className="h-3 w-3" />
            </span>
         </div>
      </div>
   );
}

// ─── Job Detail View ──────────────────────────────────────────────────────────

function JobDetailView({
   entry,
   onBack,
}: {
   entry: ShortlistWithJob;
   onBack: () => void;
}) {
   const { toast } = useToast();
   const [selections, setSelections] = useState<Map<string, LocalStatus>>(() =>
      initSelections(entry.shortlist, entry.finalSelection),
   );
   const [previewId, setPreviewId] = useState<string | null>(null);
   const [emailDialog, setEmailDialog] = useState<
      "invitation" | "regret" | null
   >(null);
   const { mutateAsync: finalize, isPending: saving } = useFinalizeCandidates(
      entry.jobId,
   );

   const fs = entry.finalSelection;
   const log = entry.emailLog;
   const finalized = !!fs?.finalizedAt;

   // Derived buckets
   const selected = entry.shortlist.filter(
      (c) => selections.get(c.candidateId) === "selected",
   );
   const pool = entry.shortlist.filter(
      (c) => selections.get(c.candidateId) === "pool",
   );
   const rejected = entry.shortlist.filter(
      (c) => selections.get(c.candidateId) === "rejected",
   );

   async function handleAction(id: string, next: LocalStatus) {
      // Compute new state synchronously so we can pass it directly to the API
      const prev = selections;
      const newSelections = new Map(prev).set(id, next);
      setSelections(newSelections);

      const newSelected = entry.shortlist.filter(
         (c) => newSelections.get(c.candidateId) === "selected",
      );
      const newPool = entry.shortlist.filter(
         (c) => newSelections.get(c.candidateId) === "pool",
      );
      const newRejected = entry.shortlist.filter(
         (c) => newSelections.get(c.candidateId) === "rejected",
      );

      if (newSelected.length === 0) {
         toast({
            title: "At least one candidate must remain selected",
            variant: "destructive",
         });
         setSelections(prev); // revert
         return;
      }

      const labels: Record<LocalStatus, string> = {
         selected: "Moved to Final Shortlist",
         pool: "Added to Talent Pool",
         rejected: "Moved to Not Selected",
      };

      try {
         await finalize({
            selectionType: "manual",
            selectedCandidateIds: newSelected.map((c) => c.candidateId),
            talentPoolCandidateIds: newPool.map((c) => c.candidateId),
            rejectedCandidateIds: newRejected.map((c) => c.candidateId),
         });
         toast({ title: labels[next] });
      } catch (err) {
         setSelections(prev); // revert on API failure
         toast({
            title: "Failed to save",
            description: (err as Error).message,
            variant: "destructive",
         });
      }
   }

   async function handleSave() {
      if (selected.length === 0) {
         toast({
            title: "Select at least one candidate",
            variant: "destructive",
         });
         return;
      }
      try {
         await finalize({
            selectionType: "manual",
            selectedCandidateIds: selected.map((c) => c.candidateId),
            talentPoolCandidateIds: pool.map((c) => c.candidateId),
            rejectedCandidateIds: rejected.map((c) => c.candidateId),
         });
         toast({
            title: "Selection saved!",
            description: `${selected.length} selected · ${pool.length} in talent pool`,
         });
      } catch (err) {
         toast({
            title: "Failed to save",
            description: (err as Error).message,
            variant: "destructive",
         });
      }
   }

   const scores = entry.shortlist.map((c) => c.matchScore);
   const topScore = scores.length ? Math.max(...scores) : 0;
   const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

   function handleExport() {
      exportToCsv(
         `shortlist-${(entry.job?.title ?? "job").replace(/\s+/g, "-").toLowerCase()}`,
         entry.shortlist.map((c) => ({
            Rank: c.rank,
            Name: candidateName(c),
            Score: c.matchScore,
            Status: selections.get(c.candidateId) ?? "pending",
            Recommendation: c.recommendation,
         })),
      );
   }

   return (
      <div className="space-y-6">
         {/* Breadcrumb */}
         <div className="flex items-center gap-3 flex-wrap">
            <Button
               variant="ghost"
               size="sm"
               className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
               onClick={onBack}
            >
               <ChevronLeft className="h-4 w-4" />
               All Positions
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-base font-semibold truncate flex-1 min-w-0">
               {entry.job?.title ?? "Screening Results"}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
               {entry.job?.type && (
                  <Badge
                     variant="secondary"
                     className="text-xs"
                  >
                     {entry.job.type}
                  </Badge>
               )}
               {entry.job?.location && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                     <MapPin className="h-3 w-3" />
                     {entry.job.location}
                  </span>
               )}
            </div>
         </div>

         {/* Quick stats */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
               {
                  label: "AI Ranked",
                  value: entry.shortlist.length,
                  Icon: Bot,
                  color: "text-primary",
                  bg: "bg-primary/10",
               },
               {
                  label: "Top Score",
                  value: `${topScore}%`,
                  Icon: Trophy,
                  color: "text-amber-600",
                  bg: "bg-amber-100",
               },
               {
                  label: "Avg Score",
                  value: `${avgScore}%`,
                  Icon: BarChart2,
                  color: "text-violet-600",
                  bg: "bg-violet-100",
               },
               finalized && fs
                  ? {
                       label: "Selected",
                       value: fs.selectedCandidateIds.length,
                       Icon: CheckCircle2,
                       color: "text-emerald-600",
                       bg: "bg-emerald-100",
                    }
                  : {
                       label: "Screened",
                       value: formatDistanceToNow(new Date(entry.screenedAt), {
                          addSuffix: true,
                       }),
                       Icon: Clock,
                       color: "text-slate-500",
                       bg: "bg-muted",
                    },
            ].map(({ label, value, Icon, color, bg }) => (
               <Card
                  key={label}
                  className="border-0 bg-muted/30"
               >
                  <CardContent className="p-4 flex items-center gap-3">
                     <div
                        className={cn(
                           "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                           bg,
                        )}
                     >
                        <Icon className={cn("h-4 w-4", color)} />
                     </div>
                     <div className="min-w-0">
                        <p className={cn("text-sm font-bold truncate", color)}>
                           {value}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                           {label}
                        </p>
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>

         {/* ─── Candidate Table ──────────────────────────────────────── */}
         <div>
            {/* Table header bar */}
            <div className="flex items-center justify-between mb-3">
               <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Candidate Selection
               </h2>
               <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-8 text-xs"
                  onClick={handleExport}
               >
                  <Download className="h-3.5 w-3.5" />
                  Export
               </Button>
            </div>

            <Card className="overflow-hidden shadow-sm">
               {/* Tally + save bar */}
               <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b bg-muted/10">
                  <div className="flex items-center gap-5 text-xs font-medium">
                     <span className="flex items-center gap-1.5 text-emerald-600">
                        <Trophy className="h-3.5 w-3.5" />
                        <span className="text-lg font-bold tabular-nums leading-none">
                           {selected.length}
                        </span>
                        selected
                     </span>
                     <span className="flex items-center gap-1.5 text-violet-600">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-lg font-bold tabular-nums leading-none">
                           {pool.length}
                        </span>
                        in pool
                     </span>
                     <span className="flex items-center gap-1.5 text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" />
                        <span className="text-lg font-bold tabular-nums leading-none">
                           {rejected.length}
                        </span>
                        not selected
                     </span>
                  </div>
                  <div className="flex items-center gap-2">
                     {finalized && (
                        <>
                           {!log?.interviewInvitationsSent ? (
                              <Button
                                 size="sm"
                                 className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                                 onClick={() => setEmailDialog("invitation")}
                              >
                                 <MailOpen className="h-3.5 w-3.5" />
                                 Send Invitations
                              </Button>
                           ) : (
                              <Button
                                 size="sm"
                                 variant="outline"
                                 className="gap-1.5 h-8 text-xs text-emerald-600 border-emerald-200"
                                 onClick={() => setEmailDialog("invitation")}
                              >
                                 <MailOpen className="h-3.5 w-3.5" />
                                 Re-send Invitations
                              </Button>
                           )}
                           {!log?.regretLettersSent && rejected.length > 0 && (
                              <Button
                                 size="sm"
                                 variant="outline"
                                 className="gap-1.5 h-8 text-xs"
                                 onClick={() => setEmailDialog("regret")}
                              >
                                 <Mail className="h-3.5 w-3.5" />
                                 Send Regret Letters
                              </Button>
                           )}
                        </>
                     )}
                     <Button
                        size="sm"
                        className="gap-1.5 h-8"
                        onClick={handleSave}
                        disabled={saving || selected.length === 0}
                     >
                        {saving ? (
                           <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                           <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {finalized ? "Update Selection" : "Save Selection"}
                     </Button>
                  </div>
               </div>

               {/* ── Section 1: Selected ── */}
               <CandidateSection
                  key="selected"
                  variant="selected"
                  candidates={selected}
                  selections={selections}
                  onAction={handleAction}
                  onPreview={(id) => setPreviewId(id)}
                  isSaving={saving}
               />

               {selected.length === 0 && (
                  <div className="flex items-center justify-center gap-3 px-5 py-10 border-b text-center">
                     <div>
                        <Trophy className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">
                           No candidates selected yet
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                           Use <strong>Reconsider</strong> below to add
                           candidates to your final shortlist.
                        </p>
                     </div>
                  </div>
               )}

               {/* ── Section 2: Not Selected ── */}
               {rejected.length > 0 && (
                  <CandidateSection
                     key="rejected"
                     variant="rejected"
                     candidates={rejected}
                     selections={selections}
                     onAction={handleAction}
                     onPreview={(id) => setPreviewId(id)}
                     collapsible
                     isSaving={saving}
                  />
               )}

               {/* ── Section 3: Talent Pool ── */}
               {pool.length > 0 && (
                  <CandidateSection
                     key="pool"
                     variant="pool"
                     candidates={pool}
                     selections={selections}
                     onAction={handleAction}
                     onPreview={(id) => setPreviewId(id)}
                     collapsible
                     isSaving={saving}
                  />
               )}

               {/* Footer */}
               <div className="flex items-center gap-4 px-5 py-3 border-t bg-muted/10 text-xs text-muted-foreground flex-wrap">
                  <span className="ml-auto flex items-center gap-1">
                     <Bot className="h-3 w-3" />
                     {entry.modelUsed} ·{" "}
                     {formatDistanceToNow(new Date(entry.screenedAt), {
                        addSuffix: true,
                     })}
                  </span>
               </div>
            </Card>
         </div>

         {/* AI Screening link */}
         <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-5 py-4">
            <div className="flex items-start gap-3">
               <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
               </div>
               <div>
                  <p className="text-sm font-medium">
                     Want to re-run AI analysis or view full scoring details?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                     Trigger a new run, view history, or combine multiple runs.
                  </p>
               </div>
            </div>
            <Button
               asChild
               variant="outline"
               size="sm"
               className="gap-2 shrink-0 ml-4"
            >
               <Link href="/screening">
                  AI Screening <ArrowRight className="h-3.5 w-3.5" />
               </Link>
            </Button>
         </div>

         {/* Interview Scheduling — coming soon */}
         <div className="rounded-xl border border-dashed bg-muted/10 px-5 py-4 flex items-center gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
               <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
               <p className="text-sm font-medium text-muted-foreground">
                  Interview Scheduling
               </p>
               <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Manage interview rounds and track outcomes — coming soon.
               </p>
            </div>
            <Badge
               variant="outline"
               className="text-xs shrink-0"
            >
               Coming Soon
            </Badge>
         </div>

         <ApplicantPreviewDrawer
            applicantId={previewId}
            open={!!previewId}
            onOpenChange={(open) => {
               if (!open) setPreviewId(null);
            }}
         />

         {emailDialog && (
            <SendEmailDialog
               open={!!emailDialog}
               onOpenChange={(v) => {
                  if (!v) setEmailDialog(null);
               }}
               type={emailDialog}
               jobId={entry.jobId}
               jobTitle={entry.job?.title ?? ""}
            />
         )}
      </div>
   );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShortlistsPage() {
   const { data: shortlists = [], isLoading } = useAllShortlists();
   const typedShortlists = shortlists as ShortlistWithJob[];
   const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

   const selectedEntry = selectedJobId
      ? (typedShortlists.find((s) => s.jobId === selectedJobId) ?? null)
      : null;

   const totalCandidates = typedShortlists.reduce(
      (a, s) => a + s.shortlist.length,
      0,
   );
   const allScores = typedShortlists.flatMap((s) =>
      s.shortlist.map((c) => c.matchScore),
   );
   const globalTop = allScores.length ? Math.max(...allScores) : 0;
   const finalizedCount = typedShortlists.filter(
      (s) => !!s.finalSelection?.finalizedAt,
   ).length;

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title="Shortlists" />
         <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {isLoading ? (
               <div className="space-y-4">
                  <div className="h-36 rounded-xl border bg-muted animate-pulse" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     {[1, 2, 3, 4].map((i) => (
                        <div
                           key={i}
                           className="h-20 rounded-xl border bg-muted animate-pulse"
                        />
                     ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {[1, 2, 3].map((i) => (
                        <div
                           key={i}
                           className="h-44 rounded-xl border bg-muted animate-pulse"
                        />
                     ))}
                  </div>
               </div>
            ) : typedShortlists.length === 0 ? (
               <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                     <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <Trophy className="h-8 w-8 text-primary" />
                     </div>
                     <div>
                        <p className="font-semibold">No shortlists yet</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                           Run AI screening on a job to generate your first
                           ranked shortlist.
                        </p>
                     </div>
                     <Button
                        asChild
                        size="sm"
                     >
                        <Link href="/jobs">
                           <Briefcase className="h-4 w-4 mr-1.5" />
                           Browse Jobs
                        </Link>
                     </Button>
                  </CardContent>
               </Card>
            ) : selectedEntry ? (
               <JobDetailView
                  key={selectedEntry.jobId}
                  entry={selectedEntry}
                  onBack={() => setSelectedJobId(null)}
               />
            ) : (
               <div className="space-y-6">
                  <div>
                     <h1 className="text-base font-semibold">Shortlists</h1>
                     <p className="text-sm text-muted-foreground mt-0.5">
                        Review AI-ranked candidates, finalize selections, and
                        send communications.
                     </p>
                  </div>

                  {/* Stats — top */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     {[
                        {
                           label: "Jobs Screened",
                           value: typedShortlists.length,
                           Icon: Briefcase,
                           color: "text-primary",
                           bg: "bg-primary/10",
                        },
                        {
                           label: "Total Shortlisted",
                           value: totalCandidates,
                           Icon: Trophy,
                           color: "text-amber-600",
                           bg: "bg-amber-100",
                        },
                        {
                           label: "Best Score",
                           value: `${globalTop}%`,
                           Icon: CheckCircle2,
                           color: "text-emerald-600",
                           bg: "bg-emerald-100",
                        },
                        {
                           label: "Finalized",
                           value: `${finalizedCount}/${typedShortlists.length}`,
                           Icon: Star,
                           color: "text-violet-600",
                           bg: "bg-violet-100",
                        },
                     ].map(({ label, value, Icon, color, bg }) => (
                        <Card
                           key={label}
                           className="border-0 bg-muted/30"
                        >
                           <CardContent className="p-4 flex items-center gap-3">
                              <div
                                 className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                    bg,
                                 )}
                              >
                                 <Icon className={cn("h-4 w-4", color)} />
                              </div>
                              <div>
                                 <p
                                    className={cn(
                                       "text-lg font-bold tabular-nums leading-none",
                                       color,
                                    )}
                                 >
                                    {value}
                                 </p>
                                 <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                                    {label}
                                 </p>
                              </div>
                           </CardContent>
                        </Card>
                     ))}
                  </div>

                  {/* Final Shortlists table */}
                  <FinalShortlistsTable
                     items={typedShortlists}
                     onOpen={setSelectedJobId}
                  />

                  {/* All positions */}
                  <div>
                     <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                        Screened Positions
                     </p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {typedShortlists.map((item) => (
                           <JobCard
                              key={item.jobId}
                              item={item}
                              onClick={() => setSelectedJobId(item.jobId)}
                           />
                        ))}
                     </div>
                  </div>
               </div>
            )}
         </main>
      </div>
   );
}
