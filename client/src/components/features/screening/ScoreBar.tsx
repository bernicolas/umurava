import { cn } from "@/lib/utils";

interface ScoreBarProps {
   score: number;
   size?: "sm" | "md";
}

function scoreColor(score: number) {
   if (score >= 80) return "bg-emerald-500";
   if (score >= 60) return "bg-amber-500";
   return "bg-destructive";
}

function scoreTextColor(score: number) {
   if (score >= 80) return "text-emerald-600";
   if (score >= 60) return "text-amber-600";
   return "text-destructive";
}

export function ScoreBar({ score, size = "md" }: ScoreBarProps) {
   return (
      <div className="flex items-center gap-2">
         <div
            className={cn(
               "relative overflow-hidden rounded-full bg-secondary",
               size === "sm" ? "h-1.5 w-20" : "h-2.5 w-32",
            )}
         >
            <div
               className={cn(
                  "h-full rounded-full transition-all duration-500",
                  scoreColor(score),
               )}
               style={{ width: `${score}%` }}
            />
         </div>
         <span
            className={cn(
               "font-bold tabular-nums",
               size === "sm" ? "text-xs" : "text-sm",
               scoreTextColor(score),
            )}
         >
            {score}
            <span
               className={cn(
                  "font-normal opacity-60",
                  size === "sm" ? "text-xs" : "text-xs",
               )}
            >
               %
            </span>
         </span>
      </div>
   );
}
