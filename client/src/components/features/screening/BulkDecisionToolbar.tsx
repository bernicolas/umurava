"use client";

import {
   Sparkles,
   CheckCircle2,
   XCircle,
   RotateCcw,
   ChevronDown,
   BadgeCheck,
   Star,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

interface Counts {
   selected: number;
   rejected: number;
   pool: number;
   total: number;
}

interface BulkDecisionToolbarProps {
   counts: Counts;
   totalRecommended: number;
   onAcceptTop: (n: number) => void;
   onAcceptAllRecommended: () => void;
   onRejectAll: () => void;
   onClearAll: () => void;
   onFinalize: () => void;
   disableFinalize?: boolean;
}

export function BulkDecisionToolbar({
   counts,
   totalRecommended,
   onAcceptTop,
   onAcceptAllRecommended,
   onRejectAll,
   onClearAll,
   onFinalize,
   disableFinalize,
}: BulkDecisionToolbarProps) {
   const anyDecision = counts.selected + counts.rejected + counts.pool > 0;

   return (
      <div className="rounded-xl border bg-card shadow-sm px-4 py-3 flex flex-col gap-3">
         {/* Tally bar */}
         <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
               <span className="font-medium text-foreground">
                  {counts.total}
               </span>{" "}
               candidates reviewed
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-sm">
               <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
               <span className="font-semibold text-emerald-600">
                  {counts.selected}
               </span>
               <span className="text-muted-foreground">selected</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
               <XCircle className="h-3.5 w-3.5 text-rose-400" />
               <span className="font-semibold text-rose-500">
                  {counts.rejected}
               </span>
               <span className="text-muted-foreground">rejected</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
               <Star className="h-3.5 w-3.5 text-violet-400" />
               <span className="font-semibold text-violet-600">
                  {counts.pool}
               </span>
               <span className="text-muted-foreground">in pool</span>
            </div>
         </div>

         {/* Actions row */}
         <div className="flex flex-wrap items-center gap-2">
            {/* AI Recommend dropdown */}
            <DropdownMenu.Root>
               <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium px-3 py-2 transition-colors">
                     <Sparkles className="h-3.5 w-3.5" />
                     AI Recommendations
                     <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>
               </DropdownMenu.Trigger>
               <DropdownMenu.Portal>
                  <DropdownMenu.Content
                     className="z-50 min-w-[200px] rounded-lg border border-border bg-card text-card-foreground p-1 shadow-lg text-sm"
                     sideOffset={4}
                  >
                     <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-muted focus:outline-none"
                        onSelect={() => onAcceptTop(3)}
                     >
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Accept AI Top 3
                     </DropdownMenu.Item>
                     <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-muted focus:outline-none"
                        onSelect={() => onAcceptTop(5)}
                     >
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Accept AI Top 5
                     </DropdownMenu.Item>
                     <DropdownMenu.Separator className="my-1 h-px bg-border" />
                     <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-muted focus:outline-none"
                        onSelect={onAcceptAllRecommended}
                     >
                        <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                        Accept All AI Recommendations ({totalRecommended})
                     </DropdownMenu.Item>
                  </DropdownMenu.Content>
               </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Reject all non-selected */}
            <button
               onClick={onRejectAll}
               className="flex items-center gap-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium px-3 py-2 transition-colors"
            >
               <XCircle className="h-3.5 w-3.5" />
               Reject Unselected
            </button>

            {/* Clear all */}
            {anyDecision && (
               <button
                  onClick={onClearAll}
                  className="flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground border border-input hover:bg-muted text-xs font-medium px-3 py-2 transition-colors"
               >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear All
               </button>
            )}

            {/* Progress bar */}
            {counts.total > 0 && (
               <div className="hidden sm:flex items-center gap-2 ml-2 flex-1 min-w-0">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex">
                     <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{
                           width: `${(counts.selected / counts.total) * 100}%`,
                        }}
                     />
                     <div
                        className="h-full bg-violet-400 transition-all"
                        style={{
                           width: `${(counts.pool / counts.total) * 100}%`,
                        }}
                     />
                     <div
                        className="h-full bg-rose-400 transition-all"
                        style={{
                           width: `${(counts.rejected / counts.total) * 100}%`,
                        }}
                     />
                  </div>
               </div>
            )}

            {/* Finalize CTA */}
            <button
               onClick={onFinalize}
               disabled={disableFinalize}
               className={cn(
                  "ml-auto flex items-center gap-1.5 rounded-lg text-xs font-semibold px-4 py-2 transition-colors border",
                  counts.selected > 0
                     ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                     : "bg-muted text-muted-foreground border-border cursor-not-allowed",
               )}
            >
               <CheckCircle2 className="h-3.5 w-3.5" />
               Finalize{" "}
               {counts.selected > 0
                  ? `(${counts.selected} selected)`
                  : "Selection"}
            </button>
         </div>
      </div>
   );
}
