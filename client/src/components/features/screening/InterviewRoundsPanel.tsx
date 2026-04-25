"use client";

import { useState, useEffect } from "react";
import {
   Phone,
   Code2,
   Heart,
   Users,
   Trophy,
   HelpCircle,
   Plus,
   Trash2,
   Loader2,
   CalendarDays,
   MapPin,
   FileText,
   ChevronDown,
   ChevronUp,
   CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSaveInterviewRounds } from "@/services/finalSelection.service";
import type { InterviewRound } from "@/types";

const ROUND_TYPES: {
   value: InterviewRound["type"];
   label: string;
   icon: React.ElementType;
   color: string;
}[] = [
   {
      value: "phone",
      label: "Phone Screen",
      icon: Phone,
      color: "text-sky-500",
   },
   {
      value: "technical",
      label: "Technical",
      icon: Code2,
      color: "text-violet-500",
   },
   {
      value: "cultural",
      label: "Culture Fit",
      icon: Heart,
      color: "text-pink-500",
   },
   {
      value: "panel",
      label: "Panel Interview",
      icon: Users,
      color: "text-amber-500",
   },
   {
      value: "final",
      label: "Final Round",
      icon: Trophy,
      color: "text-emerald-500",
   },
   {
      value: "other",
      label: "Other",
      icon: HelpCircle,
      color: "text-muted-foreground",
   },
];

const ROUND_TYPE_MAP = Object.fromEntries(ROUND_TYPES.map((r) => [r.value, r]));

function emptyRound(num: number): InterviewRound {
   return {
      roundNumber: num,
      title: "",
      type: "phone",
   };
}

interface InterviewRoundsPanelProps {
   jobId: string;
   existingRounds?: InterviewRound[];
}

export function InterviewRoundsPanel({
   jobId,
   existingRounds,
}: InterviewRoundsPanelProps) {
   const { toast } = useToast();
   const { mutateAsync: saveRounds, isPending } = useSaveInterviewRounds(jobId);
   const [rounds, setRounds] = useState<InterviewRound[]>(
      existingRounds && existingRounds.length > 0
         ? existingRounds
         : [emptyRound(1)],
   );
   const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
   const [dirty, setDirty] = useState(false);

   useEffect(() => {
      if (existingRounds && existingRounds.length > 0) {
         setRounds(existingRounds);
         setDirty(false);
      }
   }, [JSON.stringify(existingRounds)]);

   function update<K extends keyof InterviewRound>(
      idx: number,
      key: K,
      value: InterviewRound[K],
   ) {
      setRounds((prev) =>
         prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
      );
      setDirty(true);
   }

   function addRound() {
      setRounds((prev) => [...prev, emptyRound(prev.length + 1)]);
      setExpandedIdx(rounds.length);
      setDirty(true);
   }

   function removeRound(idx: number) {
      setRounds((prev) => {
         const next = prev
            .filter((_, i) => i !== idx)
            .map((r, i) => ({
               ...r,
               roundNumber: i + 1,
            }));
         return next;
      });
      setDirty(true);
   }

   async function handleSave() {
      const invalid = rounds.findIndex((r) => !r.title.trim());
      if (invalid !== -1) {
         toast({
            title: "Title required",
            description: `Round ${invalid + 1} needs a title.`,
            variant: "destructive",
         });
         return;
      }
      try {
         await saveRounds(rounds);
         setDirty(false);
         toast({ title: "Interview rounds saved" });
      } catch (e: unknown) {
         const msg = e instanceof Error ? e.message : "Save failed";
         toast({
            title: "Failed to save",
            description: msg,
            variant: "destructive",
         });
      }
   }

   return (
      <Card>
         <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
               <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Interview Rounds
               </CardTitle>
               <div className="flex items-center gap-2">
                  {dirty && (
                     <Badge
                        variant="outline"
                        className="text-xs text-amber-600 border-amber-200 bg-amber-50"
                     >
                        Unsaved changes
                     </Badge>
                  )}
                  <Button
                     size="sm"
                     variant="outline"
                     onClick={handleSave}
                     disabled={isPending || !dirty}
                     className="h-7 gap-1.5 text-xs"
                  >
                     {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                     ) : (
                        <CheckCircle2 className="h-3 w-3" />
                     )}
                     Save
                  </Button>
               </div>
            </div>
         </CardHeader>
         <CardContent className="space-y-2.5 pt-0">
            {/* Timeline */}
            <div className="relative space-y-2">
               {rounds.length > 1 && (
                  <div
                     className="absolute left-4 top-8 bottom-8 w-px bg-border"
                     aria-hidden="true"
                  />
               )}
               {rounds.map((round, idx) => {
                  const meta = ROUND_TYPE_MAP[round.type];
                  const Icon = meta.icon;
                  const isExpanded = expandedIdx === idx;

                  return (
                     <div
                        key={idx}
                        className="relative flex gap-3"
                     >
                        {/* Step dot */}
                        <div
                           className={cn(
                              "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-background transition-colors",
                              isExpanded ? "border-primary" : "border-border",
                           )}
                        >
                           <Icon className={cn("h-4 w-4", meta.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 rounded-lg border bg-card overflow-hidden">
                           {/* Row header */}
                           <button
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                 setExpandedIdx(isExpanded ? null : idx)
                              }
                           >
                              <Badge
                                 variant="outline"
                                 className="text-xs shrink-0 h-5"
                              >
                                 {idx + 1}
                              </Badge>
                              <span
                                 className={cn(
                                    "flex-1 text-sm font-medium truncate",
                                    !round.title &&
                                       "text-muted-foreground italic",
                                 )}
                              >
                                 {round.title || "Untitled round"}
                              </span>
                              <Badge
                                 variant="secondary"
                                 className="text-xs gap-1 shrink-0"
                              >
                                 <Icon
                                    className={cn("h-2.5 w-2.5", meta.color)}
                                 />
                                 {meta.label}
                              </Badge>
                              {round.scheduledDate && (
                                 <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                                    {new Date(
                                       round.scheduledDate,
                                    ).toLocaleDateString()}
                                 </span>
                              )}
                              {isExpanded ? (
                                 <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                 <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                           </button>

                           {/* Expanded editor */}
                           {isExpanded && (
                              <div className="border-t bg-muted/20 p-3 space-y-3">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Title */}
                                    <div className="sm:col-span-2">
                                       <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                          Round Title{" "}
                                          <span className="text-rose-500">
                                             *
                                          </span>
                                       </label>
                                       <Input
                                          value={round.title}
                                          onChange={(e) =>
                                             update(
                                                idx,
                                                "title",
                                                e.target.value,
                                             )
                                          }
                                          placeholder="e.g. Technical Interview with Engineering Team"
                                          className="h-8 text-sm"
                                       />
                                    </div>

                                    {/* Type */}
                                    <div>
                                       <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                          Type
                                       </label>
                                       <Select
                                          value={round.type}
                                          onValueChange={(v) =>
                                             update(
                                                idx,
                                                "type",
                                                v as InterviewRound["type"],
                                             )
                                          }
                                       >
                                          <SelectTrigger className="h-8 text-sm">
                                             <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                             {ROUND_TYPES.map((t) => (
                                                <SelectItem
                                                   key={t.value}
                                                   value={t.value}
                                                >
                                                   <div className="flex items-center gap-2">
                                                      <t.icon
                                                         className={cn(
                                                            "h-3 w-3",
                                                            t.color,
                                                         )}
                                                      />
                                                      {t.label}
                                                   </div>
                                                </SelectItem>
                                             ))}
                                          </SelectContent>
                                       </Select>
                                    </div>

                                    {/* Scheduled date */}
                                    <div>
                                       <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                                          <CalendarDays className="h-3 w-3" />{" "}
                                          Scheduled Date
                                       </label>
                                       <Input
                                          type="datetime-local"
                                          value={round.scheduledDate ?? ""}
                                          onChange={(e) =>
                                             update(
                                                idx,
                                                "scheduledDate",
                                                e.target.value || undefined,
                                             )
                                          }
                                          className="h-8 text-sm"
                                       />
                                    </div>

                                    {/* Location */}
                                    <div>
                                       <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />{" "}
                                          Location / Link
                                       </label>
                                       <Input
                                          value={round.location ?? ""}
                                          onChange={(e) =>
                                             update(
                                                idx,
                                                "location",
                                                e.target.value || undefined,
                                             )
                                          }
                                          placeholder="Office / Zoom link…"
                                          className="h-8 text-sm"
                                       />
                                    </div>

                                    {/* Interviewers */}
                                    <div>
                                       <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                          <Users className="h-3 w-3" />{" "}
                                          Interviewers (comma-separated)
                                       </label>
                                       <Input
                                          value={(
                                             round.interviewers ?? []
                                          ).join(", ")}
                                          onChange={(e) =>
                                             update(
                                                idx,
                                                "interviewers",
                                                e.target.value
                                                   ? e.target.value
                                                        .split(",")
                                                        .map((s) => s.trim())
                                                        .filter(Boolean)
                                                   : undefined,
                                             )
                                          }
                                          placeholder="Alice, Bob…"
                                          className="h-8 text-sm"
                                       />
                                    </div>

                                    {/* Notes */}
                                    <div className="sm:col-span-2">
                                       <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                          <FileText className="h-3 w-3" /> Notes
                                       </label>
                                       <Input
                                          value={round.notes ?? ""}
                                          onChange={(e) =>
                                             update(
                                                idx,
                                                "notes",
                                                e.target.value || undefined,
                                             )
                                          }
                                          placeholder="Optional notes for interviewers…"
                                          className="h-8 text-sm"
                                       />
                                    </div>
                                 </div>

                                 {rounds.length > 1 && (
                                    <button
                                       onClick={() => removeRound(idx)}
                                       className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 transition-colors"
                                    >
                                       <Trash2 className="h-3 w-3" /> Remove
                                       this round
                                    </button>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>
                  );
               })}
            </div>

            {/* Add round + save */}
            <div className="flex items-center gap-2 pt-1">
               <button
                  onClick={addRound}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
               >
                  <Plus className="h-3.5 w-3.5" /> Add Interview Round
               </button>
            </div>
         </CardContent>
      </Card>
   );
}
