"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Clock, Users, Trash2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Job } from "@/types";

const STATUS_MAP: Record<Job["status"], BadgeProps["variant"]> = {
   draft: "secondary",
   open: "success",
   closed: "outline",
};

const STATUS_BORDER: Record<Job["status"], string> = {
   draft: "border-l-slate-300 dark:border-l-slate-600",
   open: "border-l-emerald-500",
   closed: "border-l-slate-400",
};

interface JobCardProps {
   job: Job;
   onDelete?: (id: string) => void;
}

export function JobCard({ job, onDelete }: JobCardProps) {
   return (
      <Card
         className={cn(
            "group relative border-l-4 hover:shadow-lg transition-all hover:-translate-y-0.5",
            STATUS_BORDER[job.status],
         )}
      >
         <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
               <div className="flex-1 min-w-0">
                  <Link
                     href={`/jobs/${job._id}`}
                     className="group/title"
                  >
                     <CardTitle className="flex items-center gap-1.5 hover:text-primary transition-colors line-clamp-1 cursor-pointer">
                        {job.title}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover/title:opacity-100 group-hover/title:translate-y-0 group-hover/title:translate-x-0 transition-all shrink-0" />
                     </CardTitle>
                  </Link>
               </div>
               <div className="flex items-center gap-2 shrink-0">
                  <Badge
                     variant={STATUS_MAP[job.status]}
                     className="capitalize"
                  >
                     {job.status}
                  </Badge>
                  {onDelete && (
                     <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                           e.preventDefault();
                           onDelete(job._id);
                        }}
                     >
                        <Trash2 className="h-3.5 w-3.5" />
                     </Button>
                  )}
               </div>
            </div>
         </CardHeader>
         <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
               {job.description}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
               <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {job.location}
               </span>
               <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  {job.requiredExperience}y exp · {job.type}
               </span>
               <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 shrink-0" />
                  Top {job.shortlistSize}
               </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
               {job.requiredSkills.slice(0, 4).map((s) => (
                  <Badge
                     key={s}
                     variant="secondary"
                     className="text-xs font-medium"
                  >
                     {s}
                  </Badge>
               ))}
               {job.requiredSkills.length > 4 && (
                  <Badge
                     variant="outline"
                     className="text-xs"
                  >
                     +{job.requiredSkills.length - 4} more
                  </Badge>
               )}
            </div>
            <p className="text-sm text-muted-foreground/70">
               {formatDistanceToNow(new Date(job.createdAt), {
                  addSuffix: true,
               })}
            </p>
         </CardContent>
      </Card>
   );
}
