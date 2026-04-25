"use client";

import {
   Sparkles,
   Loader2,
   ShieldCheck,
   Zap,
   MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetSettings } from "@/services/settings.service";
import { cn } from "@/lib/utils";

interface ScreeningTriggerProps {
   applicantCount: number;
   shortlistSize: number;
   isPending: boolean;
   hasResult: boolean;
   onTrigger: () => void;
   onShortlistSizeChange?: (size: number) => void;
   jobDefaultShortlistSize?: number;
}

export function ScreeningTrigger({
   applicantCount,
   shortlistSize,
   isPending,
   hasResult,
   onTrigger,
   onShortlistSizeChange,
   jobDefaultShortlistSize,
}: ScreeningTriggerProps) {
   const { data: settings } = useGetSettings();

   const minScore = settings?.minScoreThreshold ?? 0;
   const preferImmediate = settings?.preferImmediateAvailability ?? false;
   const hasCustomInstructions =
      (settings?.customInstructions?.trim().length ?? 0) > 0;
   const weights = settings?.scoringWeights;

   return (
      <Card className="border-primary/30 bg-linear-to-br from-primary/3 to-background">
         <CardContent className="pt-5 pb-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
               <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                     <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                     <p className="font-semibold text-sm">AI Screening</p>
                     <p className="text-xs text-muted-foreground">
                        {applicantCount} applicant{applicantCount !== 1 && "s"}{" "}
                        · Shortlist top {shortlistSize}
                     </p>
                  </div>
               </div>
               <Button
                  onClick={onTrigger}
                  disabled={isPending || applicantCount === 0}
                  className="w-full shrink-0"
               >
                  {isPending ? (
                     <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Screening…
                     </>
                  ) : (
                     <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {hasResult ? "Re-screen" : "Run Screening"}
                     </>
                  )}
               </Button>
            </div>

            {/* Shortlist size picker */}
            {onShortlistSizeChange && (
               <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                     <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                        Shortlist target
                     </p>
                     {jobDefaultShortlistSize !== undefined &&
                        shortlistSize !== jobDefaultShortlistSize && (
                           <button
                              onClick={() =>
                                 onShortlistSizeChange(jobDefaultShortlistSize)
                              }
                              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                           >
                              Reset to {jobDefaultShortlistSize}
                           </button>
                        )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                     {([5, 10, 15, 20, 30, 50] as const).map((size) => (
                        <button
                           key={size}
                           onClick={() => onShortlistSizeChange(size)}
                           className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
                              shortlistSize === size
                                 ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                 : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
                           )}
                        >
                           Top {size}
                        </button>
                     ))}
                  </div>
               </div>
            )}

            {/* Active settings preview */}
            {settings && (
               <div className="border-t pt-3 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                     Active settings
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                     {weights && (
                        <>
                           <Badge className="text-xs bg-violet-100 text-violet-700 border border-violet-200 font-mono">
                              Skills {weights.skills}%
                           </Badge>
                           <Badge className="text-xs bg-blue-100 text-blue-700 border border-blue-200 font-mono">
                              Exp {weights.experience}%
                           </Badge>
                           <Badge className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 font-mono">
                              Edu {weights.education}%
                           </Badge>
                           <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200 font-mono">
                              Projects {weights.projects}%
                           </Badge>
                        </>
                     )}
                     {minScore > 0 && (
                        <Badge
                           className={cn(
                              "text-xs border font-medium flex items-center gap-1",
                              "bg-rose-100 text-rose-700 border-rose-200",
                           )}
                        >
                           <ShieldCheck className="h-2.5 w-2.5" />
                           Min {minScore}%
                        </Badge>
                     )}
                     {preferImmediate && (
                        <Badge className="text-xs bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                           <Zap className="h-2.5 w-2.5" />
                           Prefer immediate
                        </Badge>
                     )}
                     {hasCustomInstructions && (
                        <Badge className="text-xs bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                           <MessageSquareText className="h-2.5 w-2.5" />
                           Custom rules active
                        </Badge>
                     )}
                  </div>
               </div>
            )}
         </CardContent>
      </Card>
   );
}
