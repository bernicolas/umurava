"use client";

import { useState } from "react";
import {
   CheckCircle2,
   Users,
   MailOpen,
   Mail,
   Sparkles,
   AlertTriangle,
   Loader2,
   Bot,
   ListChecks,
   UserPlus,
   Send,
   Clock,
   Star,
} from "lucide-react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
   useFinalizationState,
   useFinalizeCandidates,
   useSendInterviewInvitations,
   useSendRegretLetters,
} from "@/services/finalSelection.service";
import type { ShortlistedCandidate } from "@/types";

interface FinalizationPanelProps {
   jobId: string;
   jobTitle: string;
   shortlist: ShortlistedCandidate[];
   // Pre-populated from inline review decisions
   preSelectedIds?: string[];
   preRejectedIds?: string[];
   preTalentPoolIds?: string[];
   // If true, open finalize dialog immediately
   openDialogImmediately?: boolean;
   onDialogClose?: () => void;
}

// ─── Small score pill ────────────────────────────────────────────────────────
function ScorePill({ score }: { score: number }) {
   return (
      <span
         className={cn(
            "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
            score >= 80
               ? "bg-emerald-100 text-emerald-700"
               : score >= 60
                 ? "bg-amber-100 text-amber-700"
                 : "bg-rose-100 text-rose-700",
         )}
      >
         {score}%
      </span>
   );
}

// ─── Finalize dialog ─────────────────────────────────────────────────────────
function FinalizeDialog({
   open,
   onOpenChange,
   jobId,
   jobTitle,
   shortlist,
   preSelectedIds,
   preRejectedIds,
   preTalentPoolIds,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   jobId: string;
   jobTitle: string;
   shortlist: ShortlistedCandidate[];
   preSelectedIds?: string[];
   preRejectedIds?: string[];
   preTalentPoolIds?: string[];
}) {
   const { toast } = useToast();
   const hasPreselect = (preSelectedIds?.length ?? 0) > 0;
   const [mode, setMode] = useState<"ai_recommended" | "manual">(
      hasPreselect ? "manual" : "ai_recommended",
   );
   const [selectedIds, setSelectedIds] = useState<Set<string>>(
      hasPreselect
         ? new Set(preSelectedIds)
         : new Set(shortlist.map((c) => c.candidateId)),
   );
   const [talentPoolIds, setTalentPoolIds] = useState<Set<string>>(
      new Set(preTalentPoolIds ?? []),
   );

   // Re-sync when pre-selections change (dialog re-opened with new selections)
   const preSelectedKey = (preSelectedIds ?? []).sort().join(",");
   const preTalentPoolKey = (preTalentPoolIds ?? []).sort().join(",");
   // eslint-disable-next-line react-hooks/exhaustive-deps
   require("react").useEffect(() => {
      if (open) {
         if (preSelectedIds && preSelectedIds.length > 0) {
            setMode("manual");
            setSelectedIds(new Set(preSelectedIds));
            setTalentPoolIds(new Set(preTalentPoolIds ?? []));
         }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [open, preSelectedKey, preTalentPoolKey]);

   const { mutateAsync: finalize, isPending } = useFinalizeCandidates(jobId);

   function toggleSelect(id: string) {
      setSelectedIds((prev) => {
         const next = new Set(prev);
         if (next.has(id)) {
            next.delete(id);
         } else {
            next.add(id);
            // If manually selected, remove from talent pool
            talentPoolIds.delete(id);
            setTalentPoolIds(new Set(talentPoolIds));
         }
         return next;
      });
   }

   function toggleTalentPool(id: string) {
      setTalentPoolIds((prev) => {
         const next = new Set(prev);
         if (next.has(id)) {
            next.delete(id);
         } else {
            next.add(id);
         }
         return next;
      });
   }

   function handleModeChange(newMode: "ai_recommended" | "manual") {
      setMode(newMode);
      if (newMode === "ai_recommended") {
         setSelectedIds(new Set(shortlist.map((c) => c.candidateId)));
         setTalentPoolIds(new Set());
      }
   }

   const rejectedIds = shortlist
      .map((c) => c.candidateId)
      .filter((id) => !selectedIds.has(id));

   async function handleSubmit() {
      if (selectedIds.size === 0) {
         toast({
            title: "No candidates selected",
            description: "Please select at least one candidate to proceed.",
            variant: "destructive",
         });
         return;
      }
      try {
         const res = await finalize({
            selectionType: mode,
            selectedCandidateIds: Array.from(selectedIds),
            rejectedCandidateIds: rejectedIds,
            talentPoolCandidateIds: Array.from(talentPoolIds),
         });
         toast({
            title: "Selection finalized!",
            description: `${selectedIds.size} accepted · ${rejectedIds.length} rejected · ${res.talentPoolEntriesCreated} added to talent pool`,
         });
         onOpenChange(false);
      } catch (err) {
         toast({
            title: "Failed to finalize",
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
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Finalize Selection
               </DialogTitle>
               <DialogDescription>
                  {jobTitle} — Review AI recommendations and make your final
                  decisions
               </DialogDescription>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
               <button
                  onClick={() => handleModeChange("ai_recommended")}
                  className={cn(
                     "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                     mode === "ai_recommended"
                        ? "bg-background shadow-sm text-primary"
                        : "text-muted-foreground hover:text-foreground",
                  )}
               >
                  <Bot className="h-4 w-4" />
                  Accept AI Recommendations
               </button>
               <button
                  onClick={() => handleModeChange("manual")}
                  className={cn(
                     "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                     mode === "manual"
                        ? "bg-background shadow-sm text-primary"
                        : "text-muted-foreground hover:text-foreground",
                  )}
               >
                  <ListChecks className="h-4 w-4" />
                  Manual Selection
               </button>
            </div>

            {mode === "ai_recommended" && (
               <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                     <Sparkles className="h-4 w-4 text-primary shrink-0" />
                     All {shortlist.length} AI-shortlisted candidates will be
                     marked as accepted and invited for interviews.
                  </p>
               </div>
            )}

            {/* Candidate list */}
            <div className="space-y-2">
               {shortlist.map((c) => {
                  const name = c.applicant?.profile
                     ? `${c.applicant.profile.firstName} ${c.applicant.profile.lastName}`
                     : `Candidate #${c.rank}`;
                  const email = c.applicant?.profile?.email ?? "";
                  const isSelected =
                     mode === "ai_recommended" ||
                     selectedIds.has(c.candidateId);
                  const isRejected = !isSelected;
                  const inTalentPool = talentPoolIds.has(c.candidateId);

                  return (
                     <div
                        key={c.candidateId}
                        className={cn(
                           "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                           isSelected
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-rose-50/50 border-rose-100",
                        )}
                     >
                        {mode === "manual" && (
                           <button
                              onClick={() => toggleSelect(c.candidateId)}
                              className={cn(
                                 "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                 isSelected
                                    ? "bg-primary border-primary"
                                    : "bg-background border-muted-foreground/30",
                              )}
                           >
                              {isSelected && (
                                 <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                              )}
                           </button>
                        )}
                        <div
                           className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              c.rank <= 3
                                 ? "bg-amber-400 text-white"
                                 : "bg-muted text-muted-foreground",
                           )}
                        >
                           #{c.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                 {name}
                              </span>
                              {email && (
                                 <span className="text-xs text-muted-foreground hidden sm:block truncate">
                                    {email}
                                 </span>
                              )}
                           </div>
                           {c.applicant?.profile?.headline && (
                              <p className="text-xs text-muted-foreground truncate">
                                 {c.applicant.profile.headline}
                              </p>
                           )}
                        </div>
                        <ScorePill score={c.matchScore} />
                        {isSelected ? (
                           <Badge
                              variant="outline"
                              className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0"
                           >
                              ✓ Selected
                           </Badge>
                        ) : (
                           <button
                              onClick={() => toggleTalentPool(c.candidateId)}
                              title={
                                 inTalentPool
                                    ? "Remove from talent pool"
                                    : "Add to talent pool"
                              }
                              className={cn(
                                 "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors shrink-0",
                                 inTalentPool
                                    ? "bg-violet-100 text-violet-700 border-violet-200"
                                    : "bg-background text-muted-foreground border-muted hover:bg-violet-50 hover:text-violet-600",
                              )}
                           >
                              <UserPlus className="h-3 w-3" />
                              {inTalentPool ? "In pool" : "Add to pool"}
                           </button>
                        )}
                     </div>
                  );
               })}
            </div>

            {/* Summary bar */}
            <div className="flex items-center gap-4 py-2 px-3 bg-muted/60 rounded-lg text-xs text-muted-foreground">
               <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {mode === "ai_recommended"
                     ? shortlist.length
                     : selectedIds.size}{" "}
                  accepted
               </span>
               <span className="flex items-center gap-1 text-rose-500 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {mode === "ai_recommended" ? 0 : rejectedIds.length} rejected
               </span>
               <span className="flex items-center gap-1 text-violet-600 font-medium">
                  <Star className="h-3.5 w-3.5" />
                  {talentPoolIds.size} → talent pool
               </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
               <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
               >
                  Cancel
               </Button>
               <Button
                  onClick={handleSubmit}
                  disabled={
                     isPending || (mode === "manual" && selectedIds.size === 0)
                  }
               >
                  {isPending ? (
                     <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                     <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Finalize Selection
               </Button>
            </div>
         </DialogContent>
      </Dialog>
   );
}

// ─── Send email dialog ───────────────────────────────────────────────────────
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
         let result;
         if (type === "invitation") {
            result = await sendInvitations({
               interviewDetails: interviewDetails.trim() || undefined,
            });
         } else {
            result = await sendRegret({ targetGroup });
         }
         toast({
            title: result.failed > 0 ? "Partially sent" : "Emails sent!",
            description: result.message,
            variant: result.failed > 0 ? "destructive" : "default",
         });
         if (result.sent > 0) {
            onOpenChange(false);
         }
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
               <DialogDescription>
                  {jobTitle}
                  {type === "invitation"
                     ? " — Notify accepted candidates about their interview"
                     : " — Notify rejected candidates with a professional regret letter"}
               </DialogDescription>
            </DialogHeader>

            {type === "invitation" && (
               <div className="space-y-3">
                  <div>
                     <label className="text-sm font-medium block mb-1.5">
                        Interview Details{" "}
                        <span className="text-muted-foreground font-normal text-xs">
                           (optional)
                        </span>
                     </label>
                     <Textarea
                        placeholder="e.g. The interview will be conducted via Google Meet on May 5th at 10:00 AM EAT. Please prepare a 5-minute self-introduction."
                        value={interviewDetails}
                        onChange={(e) => setInterviewDetails(e.target.value)}
                        rows={4}
                        className="resize-none text-sm"
                     />
                     <p className="text-xs text-muted-foreground mt-1.5">
                        Leave blank to send a general invitation. Candidates
                        will receive the configured interview template.
                     </p>
                  </div>
               </div>
            )}

            {type === "regret" && (
               <div className="space-y-3">
                  <div>
                     <label className="text-sm font-medium block mb-2">
                        Send to
                     </label>
                     <div className="space-y-2">
                        {(
                           [
                              {
                                 value: "all",
                                 label: "All rejected candidates",
                                 desc: "Everyone who was not selected (includes talent pool)",
                              },
                              {
                                 value: "talent_pool",
                                 label: "Talent pool only",
                                 desc: "Near-miss candidates added to your talent pool",
                              },
                              {
                                 value: "rejected",
                                 label: "Rejected only (excluding talent pool)",
                                 desc: "Candidates not selected and not in the talent pool",
                              },
                           ] as const
                        ).map((opt) => (
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
                                 <p className="text-sm font-medium">
                                    {opt.label}
                                 </p>
                                 <p className="text-xs text-muted-foreground mt-0.5">
                                    {opt.desc}
                                 </p>
                              </div>
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                     <p className="font-medium mb-0.5">Template note</p>
                     <p>
                        Regret letters will use your configured template in
                        Settings → Email. Talent pool candidates receive the
                        template that mentions they&apos;ve been added to your
                        pool.
                     </p>
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

// ─── Main FinalizationPanel ───────────────────────────────────────────────────
export function FinalizationPanel({
   jobId,
   jobTitle,
   shortlist,
   preSelectedIds,
   preRejectedIds,
   preTalentPoolIds,
   openDialogImmediately,
   onDialogClose,
}: FinalizationPanelProps) {
   const { data: state, isLoading } = useFinalizationState(jobId);
   const [showFinalizeDialog, setShowFinalizeDialog] = useState(
      openDialogImmediately ?? false,
   );
   const [emailDialog, setEmailDialog] = useState<
      "invitation" | "regret" | null
   >(null);

   // Sync when parent changes openDialogImmediately
   require("react").useEffect(() => {
      if (openDialogImmediately) setShowFinalizeDialog(true);
   }, [openDialogImmediately]);

   if (isLoading) {
      return <div className="h-12 rounded-lg border bg-muted animate-pulse" />;
   }

   const finalized = state?.finalized ?? false;
   const fs = state?.finalSelection;
   const log = state?.emailLog;

   return (
      <>
         <Card
            className={cn(
               "border-l-4 transition-colors",
               finalized ? "border-l-emerald-500" : "border-l-amber-400",
            )}
         >
            <CardContent className="p-4">
               <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Status column */}
                  <div className="flex-1 space-y-3">
                     <div className="flex items-center gap-2">
                        {finalized ? (
                           <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                           <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        )}
                        <div>
                           <p className="text-sm font-semibold">
                              {finalized
                                 ? "Selection Finalized"
                                 : "Awaiting Finalization"}
                           </p>
                           {finalized && fs && (
                              <p className="text-xs text-muted-foreground">
                                 {fs.selectionType === "ai_recommended"
                                    ? "AI Recommended"
                                    : "Manual Selection"}{" "}
                                 ·{" "}
                                 {format(
                                    new Date(fs.finalizedAt),
                                    "d MMM yyyy",
                                 )}
                              </p>
                           )}
                        </div>
                     </div>

                     {finalized && fs && (
                        <div className="flex flex-wrap gap-2">
                           <Badge
                              variant="outline"
                              className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                           >
                              <CheckCircle2 className="h-3 w-3" />
                              {fs.selectedCandidateIds.length} accepted
                           </Badge>
                           <Badge
                              variant="outline"
                              className="gap-1 bg-rose-50 text-rose-600 border-rose-200 text-xs"
                           >
                              <Users className="h-3 w-3" />
                              {fs.rejectedCandidateIds.length} rejected
                           </Badge>
                           {fs.talentPoolCandidateIds.length > 0 && (
                              <Badge
                                 variant="outline"
                                 className="gap-1 bg-violet-50 text-violet-700 border-violet-200 text-xs"
                              >
                                 <Star className="h-3 w-3" />
                                 {fs.talentPoolCandidateIds.length} in talent
                                 pool
                              </Badge>
                           )}
                        </div>
                     )}

                     {finalized && log && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                           {log.interviewInvitationsSent && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                 <MailOpen className="h-3.5 w-3.5" />
                                 {log.interviewInvitationCount ?? 0} invitations
                                 sent
                                 {log.interviewInvitationsSentAt && (
                                    <span className="text-muted-foreground">
                                       {" "}
                                       ·{" "}
                                       {format(
                                          new Date(
                                             log.interviewInvitationsSentAt,
                                          ),
                                          "d MMM",
                                       )}
                                    </span>
                                 )}
                              </span>
                           )}
                           {log.regretLettersSent && (
                              <span className="flex items-center gap-1 text-slate-500">
                                 <Mail className="h-3.5 w-3.5" />
                                 {log.regretLetterCount ?? 0} regret letters
                                 sent
                              </span>
                           )}
                        </div>
                     )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                     {!finalized ? (
                        <Button
                           size="sm"
                           onClick={() => setShowFinalizeDialog(true)}
                           className="gap-2"
                        >
                           <ListChecks className="h-4 w-4" />
                           Finalize Selection
                        </Button>
                     ) : (
                        <>
                           <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowFinalizeDialog(true)}
                              className="gap-2 text-xs"
                           >
                              <ListChecks className="h-3.5 w-3.5" />
                              Re-finalize
                           </Button>
                           {!log?.interviewInvitationsSent && (
                              <Button
                                 size="sm"
                                 className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-xs"
                                 onClick={() => setEmailDialog("invitation")}
                              >
                                 <MailOpen className="h-3.5 w-3.5" />
                                 Send Invitations
                              </Button>
                           )}
                           {log?.interviewInvitationsSent && (
                              <Button
                                 size="sm"
                                 variant="outline"
                                 className="gap-2 text-xs text-emerald-600 border-emerald-200"
                                 onClick={() => setEmailDialog("invitation")}
                              >
                                 <MailOpen className="h-3.5 w-3.5" />
                                 Re-send Invitations
                              </Button>
                           )}
                           {!log?.regretLettersSent &&
                              (fs?.rejectedCandidateIds?.length ?? 0) > 0 && (
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 text-xs"
                                    onClick={() => setEmailDialog("regret")}
                                 >
                                    <Mail className="h-3.5 w-3.5" />
                                    Send Regret Letters
                                 </Button>
                              )}
                           {log?.regretLettersSent && (
                              <Button
                                 size="sm"
                                 variant="outline"
                                 className="gap-2 text-xs text-muted-foreground"
                                 onClick={() => setEmailDialog("regret")}
                              >
                                 <Clock className="h-3.5 w-3.5" />
                                 Re-send Regret Letters
                              </Button>
                           )}
                        </>
                     )}
                  </div>
               </div>

               {!finalized && (
                  <p className="text-xs text-muted-foreground mt-3 pl-7">
                     Review the AI-screened candidates below, then finalize your
                     selection to accept candidates for interviews and handle
                     rejections.
                  </p>
               )}
            </CardContent>
         </Card>

         <FinalizeDialog
            open={showFinalizeDialog}
            onOpenChange={(v) => {
               setShowFinalizeDialog(v);
               if (!v && onDialogClose) onDialogClose();
            }}
            jobId={jobId}
            jobTitle={jobTitle}
            shortlist={shortlist}
            preSelectedIds={preSelectedIds}
            preRejectedIds={preRejectedIds}
            preTalentPoolIds={preTalentPoolIds}
         />

         {emailDialog && (
            <SendEmailDialog
               open={!!emailDialog}
               onOpenChange={(v) => {
                  if (!v) setEmailDialog(null);
               }}
               type={emailDialog}
               jobId={jobId}
               jobTitle={jobTitle}
            />
         )}
      </>
   );
}
