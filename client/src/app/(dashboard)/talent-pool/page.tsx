"use client";

import { useState, useMemo } from "react";
import {
   Users,
   Briefcase,
   Search,
   Star,
   MailOpen,
   Archive,
   CheckCircle2,
   UserCheck,
   UserX,
   Filter,
   X,
   StickyNote,
   Loader2,
   ChevronDown,
   ChevronUp,
   Mail,
   ExternalLink,
   MapPin,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { DataPagination } from "@/components/ui/data-pagination";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
   useTalentPool,
   useUpdateTalentPoolEntry,
   useRemoveTalentPoolEntry,
} from "@/services/talentPool.service";
import type { TalentPoolEntry } from "@/types";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<
   TalentPoolEntry["status"],
   { label: string; classes: string; icon: React.ElementType }
> = {
   active: {
      label: "Active",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
   },
   contacted: {
      label: "Contacted",
      classes: "bg-blue-50 text-blue-700 border-blue-200",
      icon: MailOpen,
   },
   hired: {
      label: "Hired",
      classes: "bg-violet-50 text-violet-700 border-violet-200",
      icon: UserCheck,
   },
   archived: {
      label: "Archived",
      classes: "bg-slate-100 text-slate-500 border-slate-200",
      icon: Archive,
   },
};

function ScorePill({ score }: { score: number }) {
   return (
      <span
         className={cn(
            "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
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

// ─── Inline notes editor ──────────────────────────────────────────────────────
function NotesEditor({
   entryId,
   initialNotes,
}: {
   entryId: string;
   initialNotes?: string;
}) {
   const [editing, setEditing] = useState(false);
   const [value, setValue] = useState(initialNotes ?? "");
   const { mutateAsync, isPending } = useUpdateTalentPoolEntry();
   const { toast } = useToast();

   async function save() {
      try {
         await mutateAsync({ id: entryId, notes: value });
         setEditing(false);
         toast({ title: "Notes saved" });
      } catch {
         toast({ title: "Failed to save notes", variant: "destructive" });
      }
   }

   if (!editing) {
      return (
         <button
            onClick={() => setEditing(true)}
            className="flex items-start gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
         >
            <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0 group-hover:text-primary" />
            <span className="text-left">
               {value || (
                  <span className="italic text-muted-foreground/60">
                     Add notes…
                  </span>
               )}
            </span>
         </button>
      );
   }

   return (
      <div className="space-y-1.5">
         <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            placeholder="Add notes about this candidate…"
            className="text-xs resize-none"
            autoFocus
         />
         <div className="flex gap-1.5">
            <Button
               size="sm"
               className="h-6 text-xs px-2"
               onClick={save}
               disabled={isPending}
            >
               {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
               ) : (
                  "Save"
               )}
            </Button>
            <Button
               size="sm"
               variant="ghost"
               className="h-6 text-xs px-2"
               onClick={() => {
                  setValue(initialNotes ?? "");
                  setEditing(false);
               }}
            >
               Cancel
            </Button>
         </div>
      </div>
   );
}

// ─── Talent pool row ──────────────────────────────────────────────────────────
function TalentPoolRow({
   entry,
   isExpanded,
   onToggle,
}: {
   entry: TalentPoolEntry;
   isExpanded: boolean;
   onToggle: () => void;
}) {
   const { mutateAsync: updateEntry } = useUpdateTalentPoolEntry();
   const { mutateAsync: removeEntry, isPending: removing } =
      useRemoveTalentPoolEntry();
   const { toast } = useToast();
   const profile = entry.applicant?.profile;
   const fullName = profile
      ? `${profile.firstName} ${profile.lastName}`
      : entry.applicantId;
   const meta = STATUS_META[entry.status];
   const StatusIcon = meta.icon;

   async function handleStatusChange(status: string) {
      try {
         await updateEntry({ id: entry._id, status });
      } catch {
         toast({
            title: "Failed to update status",
            variant: "destructive",
         });
      }
   }

   async function handleRemove() {
      if (!confirm(`Remove ${fullName} from the talent pool?`)) return;
      try {
         await removeEntry(entry._id);
         toast({ title: "Removed from talent pool" });
      } catch {
         toast({ title: "Failed to remove", variant: "destructive" });
      }
   }

   return (
      <div className="border-b last:border-b-0 transition-colors">
         {/* Main row */}
         <div
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
            onClick={onToggle}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onToggle()}
         >
            {/* Avatar placeholder */}
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
               {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : "?"}
            </div>

            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{fullName}</span>
                  {profile?.location && (
                     <span className="hidden sm:flex items-center gap-0.5 text-xs text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" />
                        {profile.location}
                     </span>
                  )}
               </div>
               {profile?.headline && (
                  <p className="text-xs text-muted-foreground truncate">
                     {profile.headline}
                  </p>
               )}
            </div>

            {/* Job */}
            <div className="hidden md:flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted/60 text-muted-foreground max-w-[160px] truncate shrink-0">
               <Briefcase className="h-3 w-3 shrink-0" />
               <span className="truncate">{entry.jobTitle}</span>
            </div>

            <ScorePill score={entry.matchScore} />

            {/* Status badge */}
            <Badge
               variant="outline"
               className={cn("text-xs shrink-0 hidden sm:flex", meta.classes)}
            >
               <StatusIcon className="h-3 w-3 mr-1" />
               {meta.label}
            </Badge>

            {/* Regret letter indicator */}
            {entry.regretLetterSent && (
               <span title="Regret letter sent">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
               </span>
            )}

            <div className="text-muted-foreground shrink-0 ml-1">
               {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
               ) : (
                  <ChevronDown className="h-4 w-4" />
               )}
            </div>
         </div>

         {/* Expanded detail */}
         {isExpanded && (
            <div className="px-4 py-4 bg-muted/10 border-t space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left: candidate info */}
                  <div className="space-y-2">
                     {profile?.email && (
                        <a
                           href={`mailto:${profile.email}`}
                           className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                           <Mail className="h-3.5 w-3.5" />
                           {profile.email}
                        </a>
                     )}
                     {profile?.skills && profile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                           {profile.skills.slice(0, 6).map((s) => (
                              <Badge
                                 key={s.name}
                                 variant="secondary"
                                 className="text-xs"
                              >
                                 {s.name}
                              </Badge>
                           ))}
                        </div>
                     )}
                     <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>
                           Added{" "}
                           {formatDistanceToNow(new Date(entry.addedAt), {
                              addSuffix: true,
                           })}
                        </p>
                        {entry.reason && (
                           <p className="italic">{entry.reason}</p>
                        )}
                        {entry.regretLetterSent && entry.regretLetterSentAt && (
                           <p className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              Regret letter sent{" "}
                              {format(
                                 new Date(entry.regretLetterSentAt),
                                 "d MMM yyyy",
                              )}
                           </p>
                        )}
                     </div>
                  </div>

                  {/* Right: notes + actions */}
                  <div className="space-y-3">
                     <NotesEditor
                        entryId={entry._id}
                        initialNotes={entry.notes}
                     />

                     <div className="flex flex-wrap items-center gap-2">
                        {/* Status changer */}
                        <Select
                           value={entry.status}
                           onValueChange={handleStatusChange}
                        >
                           <SelectTrigger className="h-7 w-36 text-xs">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              {Object.entries(STATUS_META).map(
                                 ([val, { label }]) => (
                                    <SelectItem
                                       key={val}
                                       value={val}
                                    >
                                       {label}
                                    </SelectItem>
                                 ),
                              )}
                           </SelectContent>
                        </Select>

                        {entry.applicantId && (
                           <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                           >
                              <Link href={`/applicants/${entry.applicantId}`}>
                                 <ExternalLink className="h-3 w-3" />
                                 Full Profile
                              </Link>
                           </Button>
                        )}

                        <Button
                           variant="ghost"
                           size="sm"
                           className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
                           onClick={handleRemove}
                           disabled={removing}
                        >
                           {removing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                           ) : (
                              <UserX className="h-3 w-3" />
                           )}
                           Remove
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TalentPoolPage() {
   const [page, setPage] = useState(1);
   const [status, setStatus] = useState<string>("all");
   const [search, setSearch] = useState("");
   const [expandedId, setExpandedId] = useState<string | null>(null);

   const { data, isLoading } = useTalentPool({
      page,
      limit: 20,
      status: status === "all" ? undefined : status,
   });

   const entries = data?.items ?? [];
   const meta = data?.meta;

   // Client-side search (name/email)
   const filtered = useMemo(() => {
      if (!search.trim()) return entries;
      const q = search.toLowerCase();
      return entries.filter((e) => {
         const name = e.applicant?.profile
            ? `${e.applicant.profile.firstName} ${e.applicant.profile.lastName}`.toLowerCase()
            : "";
         const email = e.applicant?.profile?.email?.toLowerCase() ?? "";
         return (
            name.includes(q) ||
            email.includes(q) ||
            e.jobTitle.toLowerCase().includes(q)
         );
      });
   }, [entries, search]);

   const statusCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      entries.forEach((e) => {
         counts[e.status] = (counts[e.status] ?? 0) + 1;
      });
      return counts;
   }, [entries]);

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <Header title="Talent Pool" />
         <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Stats row */}
            {!isLoading && (meta?.total ?? 0) > 0 && (
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                     {
                        label: "Total in Pool",
                        value: meta?.total ?? 0,
                        icon: Users,
                        classes: "bg-primary/10 text-primary",
                     },
                     {
                        label: "Active",
                        value: statusCounts["active"] ?? 0,
                        icon: CheckCircle2,
                        classes: "bg-emerald-100 text-emerald-600",
                     },
                     {
                        label: "Contacted",
                        value: statusCounts["contacted"] ?? 0,
                        icon: MailOpen,
                        classes: "bg-blue-100 text-blue-600",
                     },
                     {
                        label: "Hired",
                        value: statusCounts["hired"] ?? 0,
                        icon: UserCheck,
                        classes: "bg-violet-100 text-violet-600",
                     },
                  ].map(({ label, value, icon: Icon, classes }) => (
                     <Card key={label}>
                        <CardContent className="p-4">
                           <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 {label}
                              </p>
                              <div
                                 className={cn(
                                    "h-7 w-7 rounded-lg flex items-center justify-center",
                                    classes,
                                 )}
                              >
                                 <Icon className="h-3.5 w-3.5" />
                              </div>
                           </div>
                           <p className="text-2xl font-bold">{value}</p>
                        </CardContent>
                     </Card>
                  ))}
               </div>
            )}

            {/* Filters */}
            {!isLoading && (meta?.total ?? 0) > 0 && (
               <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3">
                  <Select
                     value={status}
                     onValueChange={(v) => {
                        setStatus(v);
                        setPage(1);
                     }}
                  >
                     <SelectTrigger className="h-9 w-40 text-sm">
                        <div className="flex items-center gap-1.5">
                           <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                           <SelectValue placeholder="All statuses" />
                        </div>
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {Object.entries(STATUS_META).map(([val, { label }]) => (
                           <SelectItem
                              key={val}
                              value={val}
                           >
                              {label}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>

                  <div className="relative flex-1 min-w-[180px]">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                     <Input
                        className="h-9 pl-9 pr-8 text-sm"
                        placeholder="Search name, email, job…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                     />
                     {search && (
                        <button
                           onClick={() => setSearch("")}
                           className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                           <X className="h-3 w-3" />
                        </button>
                     )}
                  </div>
               </div>
            )}

            {/* Content */}
            {isLoading ? (
               <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                     <div
                        key={i}
                        className="h-16 rounded-lg border bg-muted animate-pulse"
                     />
                  ))}
               </div>
            ) : (meta?.total ?? 0) === 0 ? (
               <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                     <div className="h-16 w-16 rounded-2xl bg-violet-100 flex items-center justify-center">
                        <Star className="h-8 w-8 text-violet-500" />
                     </div>
                     <div>
                        <p className="font-semibold">Talent pool is empty</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                           When you finalize candidates on the Shortlists page
                           and mark near-miss candidates for the talent pool,
                           they will appear here.
                        </p>
                     </div>
                     <Button
                        asChild
                        size="sm"
                        variant="outline"
                     >
                        <Link href="/shortlists">
                           <Users className="h-4 w-4 mr-1.5" />
                           Go to Shortlists
                        </Link>
                     </Button>
                  </CardContent>
               </Card>
            ) : filtered.length === 0 ? (
               <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                     <Search className="h-8 w-8 text-muted-foreground" />
                     <p className="font-medium">No matching candidates</p>
                     <button
                        className="text-sm text-primary hover:underline"
                        onClick={() => {
                           setSearch("");
                           setStatus("all");
                        }}
                     >
                        Clear filters
                     </button>
                  </CardContent>
               </Card>
            ) : (
               <Card className="overflow-hidden">
                  {/* Table header */}
                  <div className="hidden md:grid grid-cols-[2.5rem_1fr_10rem_6rem_8rem_1rem] gap-3 items-center px-4 py-2.5 bg-muted/30 border-b">
                     <div />
                     <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Candidate
                     </p>
                     <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Job Applied For
                     </p>
                     <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Score
                     </p>
                     <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Status
                     </p>
                     <div />
                  </div>

                  <div>
                     {filtered.map((entry) => (
                        <TalentPoolRow
                           key={entry._id}
                           entry={entry}
                           isExpanded={expandedId === entry._id}
                           onToggle={() =>
                              setExpandedId(
                                 expandedId === entry._id ? null : entry._id,
                              )
                           }
                        />
                     ))}
                  </div>

                  {meta && meta.totalPages > 1 && (
                     <div className="border-t bg-muted/30 px-4 py-2">
                        <DataPagination
                           page={page}
                           pageSize={20}
                           total={meta.total}
                           onPageChange={setPage}
                           onPageSizeChange={() => {}}
                           pageSizeOptions={[20]}
                        />
                     </div>
                  )}
               </Card>
            )}
         </main>
      </div>
   );
}
