"use client";

/**
 * ActivityEmailPanel — ERPNext-style document-level activity chatter.
 * Email compose opens as a large centered modal (like ERPNext / Gmail).
 */

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
   Briefcase,
   Sparkles,
   Trophy,
   MailOpen,
   Mail,
   ChevronDown,
   ChevronUp,
   Send,
   X,
   Loader2,
   Clock,
   MessageSquare,
   Inbox,
   RefreshCw,
   User2,
   Zap,
   Plus,
   Paperclip,
} from "lucide-react";
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
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
   useJobActivity,
   useGlobalActivity,
   useComposeJobEmail,
   type ActivityItem,
   type ActivityEventType,
} from "@/services/activity.service";
import { useJobs } from "@/services/job.service";

// ── Dynamic Trix ──────────────────────────────────────────────────────────────
const TrixEditor = dynamic(() => import("@/components/ui/TrixEditor"), {
   ssr: false,
   loading: () => (
      <div className="h-36 rounded-md border border-border bg-muted animate-pulse" />
   ),
});

// ─── Event config ─────────────────────────────────────────────────────────────

type EventCfg = {
   icon: React.ElementType;
   iconCls: string;
   chipCls: string;
   dotCls: string;
};

const EVENT_CFG: Record<ActivityEventType, EventCfg> = {
   job_created: {
      icon: Briefcase,
      iconCls: "text-blue-600 dark:text-blue-400",
      chipCls:
         "bg-blue-50 dark:bg-blue-950/50 ring-blue-200 dark:ring-blue-800",
      dotCls: "bg-blue-500",
   },
   screening: {
      icon: Sparkles,
      iconCls: "text-violet-600 dark:text-violet-400",
      chipCls:
         "bg-violet-50 dark:bg-violet-950/50 ring-violet-200 dark:ring-violet-800",
      dotCls: "bg-violet-500",
   },
   finalized: {
      icon: Trophy,
      iconCls: "text-amber-600 dark:text-amber-400",
      chipCls:
         "bg-amber-50 dark:bg-amber-950/50 ring-amber-200 dark:ring-amber-800",
      dotCls: "bg-amber-500",
   },
   email_invitation: {
      icon: MailOpen,
      iconCls: "text-emerald-600 dark:text-emerald-400",
      chipCls:
         "bg-emerald-50 dark:bg-emerald-950/50 ring-emerald-200 dark:ring-emerald-800",
      dotCls: "bg-emerald-500",
   },
   email_regret: {
      icon: Mail,
      iconCls: "text-slate-500 dark:text-slate-400",
      chipCls:
         "bg-slate-100 dark:bg-slate-800/60 ring-slate-200 dark:ring-slate-700",
      dotCls: "bg-slate-400",
   },
};

const RECIPIENT_GROUPS: { value: string; label: string; desc: string }[] = [
   {
      value: "selected",
      label: "Selected Candidates",
      desc: "Finalized selections",
   },
   { value: "rejected", label: "Rejected Candidates", desc: "Not selected" },
   { value: "pool", label: "Talent Pool", desc: "Kept for future roles" },
   {
      value: "all",
      label: "All Shortlisted",
      desc: "Everyone on the shortlist",
   },
   {
      value: "custom",
      label: "Custom Recipients",
      desc: "Type email addresses manually",
   },
];

// ─── Tag input for email addresses ────────────────────────────────────────────

function EmailTagInput({
   tags,
   onChange,
   placeholder = "Add email address…",
   autoFocus = false,
}: {
   tags: string[];
   onChange: (tags: string[]) => void;
   placeholder?: string;
   autoFocus?: boolean;
}) {
   const [input, setInput] = useState("");
   const inputRef = useRef<HTMLInputElement>(null);

   function commit(val: string) {
      const cleaned = val.trim().toLowerCase();
      if (!cleaned || tags.includes(cleaned)) {
         setInput("");
         return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
         return;
      }
      onChange([...tags, cleaned]);
      setInput("");
   }

   function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter" || e.key === ",") {
         e.preventDefault();
         commit(input);
      } else if (e.key === "Backspace" && !input && tags.length > 0) {
         onChange(tags.slice(0, -1));
      }
   }

   return (
      <div
         className="flex flex-wrap gap-1.5 min-h-9 items-center px-3 py-1.5 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-ring cursor-text transition-shadow"
         onClick={() => inputRef.current?.focus()}
      >
         {tags.map((tag) => (
            <span
               key={tag}
               className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium"
            >
               {tag}
               <button
                  type="button"
                  onClick={(e) => {
                     e.stopPropagation();
                     onChange(tags.filter((t) => t !== tag));
                  }}
                  className="hover:text-destructive transition-colors"
               >
                  <X className="h-3 w-3" />
               </button>
            </span>
         ))}
         <input
            ref={inputRef}
            autoFocus={autoFocus}
            className="flex-1 min-w-32 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => commit(input)}
            placeholder={tags.length === 0 ? placeholder : ""}
         />
      </div>
   );
}

// ─── ERPNext-style compose dialog ─────────────────────────────────────────────

function ComposeDialog({
   open,
   onClose,
   defaultJobId,
}: {
   open: boolean;
   onClose: () => void;
   defaultJobId?: string;
}) {
   const { toast } = useToast();
   const [jobId, setJobId] = useState(defaultJobId ?? "");
   const [toGroup, setToGroup] = useState<string>("selected");
   const [customToTags, setCustomToTags] = useState<string[]>([]);
   const [ccTags, setCcTags] = useState<string[]>([]);
   const [showCc, setShowCc] = useState(false);
   const [subject, setSubject] = useState("");
   const [bodyHtml, setBodyHtml] = useState("");
   const [sendMeCopy, setSendMeCopy] = useState(false);

   // Keep jobId in sync if prop changes
   useEffect(() => {
      if (defaultJobId) setJobId(defaultJobId);
   }, [defaultJobId]);

   const { data: jobsData } = useJobs({ limit: 100 });
   const jobs = jobsData?.items ?? [];

   const { mutateAsync: sendEmail, isPending } = useComposeJobEmail();

   const isCustom = toGroup === "custom";

   async function handleSend() {
      if (!jobId && toGroup !== "custom") {
         toast({ title: "Please select a job", variant: "destructive" });
         return;
      }
      if (isCustom && customToTags.length === 0) {
         toast({
            title: "Add at least one recipient email",
            variant: "destructive",
         });
         return;
      }
      if (!subject.trim()) {
         toast({ title: "Subject is required", variant: "destructive" });
         return;
      }
      if (!bodyHtml.trim()) {
         toast({ title: "Message body is required", variant: "destructive" });
         return;
      }
      try {
         const result = await sendEmail({
            jobId: jobId || undefined,
            to: toGroup as "selected" | "rejected" | "pool" | "all" | "custom",
            customTo: isCustom ? customToTags : undefined,
            cc: ccTags.length ? ccTags : undefined,
            subject,
            bodyHtml,
            sendMeCopy,
         });
         toast({ title: "Email sent!", description: result.message });
         onClose();
      } catch (err) {
         toast({
            title: "Failed to send",
            description: (err as Error).message,
            variant: "destructive",
         });
      }
   }

   function handleDiscard() {
      setSubject("");
      setBodyHtml("");
      setCcTags([]);
      setCustomToTags([]);
      setSendMeCopy(false);
      onClose();
   }

   const selectedGroup = RECIPIENT_GROUPS.find((g) => g.value === toGroup);

   return (
      <DialogPrimitive.Root
         open={open}
         onOpenChange={(v) => !v && handleDiscard()}
      >
         <DialogPrimitive.Portal>
            {/* Backdrop */}
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

            {/* Dialog panel */}
            <DialogPrimitive.Content
               className={cn(
                  "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
                  "w-[90vw] max-w-2xl max-h-[90vh] flex flex-col",
                  "bg-background border border-border rounded-xl shadow-2xl",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
               )}
            >
               {/* ── Header ─────────────────────────────── */}
               <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                  <div className="flex items-center gap-2.5">
                     <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                     </div>
                     <div>
                        <h2 className="text-base font-semibold leading-tight">
                           New Email
                        </h2>
                        {jobId && jobs.find((j) => j._id === jobId) && (
                           <p className="text-xs text-muted-foreground">
                              {jobs.find((j) => j._id === jobId)?.title}
                           </p>
                        )}
                     </div>
                  </div>
                  <button
                     onClick={handleDiscard}
                     className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                     <X className="h-4.5 w-4.5" />
                  </button>
               </div>

               {/* ── Scrollable body ─────────────────────── */}
               <div className="flex-1 overflow-y-auto">
                  <div className="px-6 py-5 space-y-4">
                     {/* Job selector — only shown when no default jobId */}
                     {!defaultJobId && (
                        <div className="flex items-start gap-3">
                           <span className="w-16 pt-2 text-xs font-semibold text-muted-foreground shrink-0 text-right">
                              Job
                           </span>
                           <div className="flex-1">
                              <Select
                                 value={jobId}
                                 onValueChange={setJobId}
                              >
                                 <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select job position…" />
                                 </SelectTrigger>
                                 <SelectContent>
                                    {jobs.map((j) => (
                                       <SelectItem
                                          key={j._id}
                                          value={j._id}
                                       >
                                          {j.title}
                                       </SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                           </div>
                        </div>
                     )}

                     {/* To field */}
                     <div className="flex items-start gap-3">
                        <span className="w-16 pt-2 text-xs font-semibold text-muted-foreground shrink-0 text-right">
                           To
                        </span>
                        <div className="flex-1 space-y-2">
                           <Select
                              value={toGroup}
                              onValueChange={setToGroup}
                           >
                              <SelectTrigger className="h-9">
                                 <SelectValue>
                                    {selectedGroup && (
                                       <span className="flex items-center gap-2">
                                          <span>{selectedGroup.label}</span>
                                          <span className="text-muted-foreground text-xs">
                                             — {selectedGroup.desc}
                                          </span>
                                       </span>
                                    )}
                                 </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                 {RECIPIENT_GROUPS.map((g) => (
                                    <SelectItem
                                       key={g.value}
                                       value={g.value}
                                    >
                                       <div>
                                          <p className="font-medium">
                                             {g.label}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                             {g.desc}
                                          </p>
                                       </div>
                                    </SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                           {/* Manual email tags for custom mode */}
                           {isCustom && (
                              <EmailTagInput
                                 tags={customToTags}
                                 onChange={setCustomToTags}
                                 placeholder="Type email and press Enter…"
                                 autoFocus
                              />
                           )}
                        </div>
                        {/* + CC toggle */}
                        {!showCc && (
                           <button
                              onClick={() => setShowCc(true)}
                              className="mt-1.5 text-xs font-medium text-primary hover:underline shrink-0 flex items-center gap-1"
                           >
                              <Plus className="h-3 w-3" />
                              CC
                           </button>
                        )}
                     </div>

                     {/* CC field */}
                     {showCc && (
                        <div className="flex items-start gap-3">
                           <span className="w-16 pt-2 text-xs font-semibold text-muted-foreground shrink-0 text-right">
                              CC
                           </span>
                           <div className="flex-1">
                              <EmailTagInput
                                 tags={ccTags}
                                 onChange={setCcTags}
                                 placeholder="Add CC email address…"
                                 autoFocus
                              />
                           </div>
                           <button
                              onClick={() => {
                                 setShowCc(false);
                                 setCcTags([]);
                              }}
                              className="mt-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                           >
                              <X className="h-3.5 w-3.5" />
                           </button>
                        </div>
                     )}

                     {/* Divider */}
                     <div className="border-t border-dashed" />

                     {/* Subject */}
                     <div className="flex items-center gap-3">
                        <span className="w-16 text-xs font-semibold text-muted-foreground shrink-0 text-right">
                           Subject <span className="text-destructive">*</span>
                        </span>
                        <Input
                           className="flex-1 h-9 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-sm font-medium bg-transparent"
                           placeholder="Email subject…"
                           value={subject}
                           onChange={(e) => setSubject(e.target.value)}
                        />
                     </div>

                     {/* Divider */}
                     <div className="border-t border-dashed" />

                     {/* Message */}
                     <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                           Message
                        </p>
                        <div className="trix-wrapper">
                           <TrixEditor
                              value={bodyHtml}
                              onChange={setBodyHtml}
                           />
                        </div>
                     </div>
                  </div>
               </div>

               {/* ── Footer ──────────────────────────────── */}
               <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 shrink-0 gap-4">
                  <div className="flex items-center gap-4">
                     <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                           type="checkbox"
                           checked={sendMeCopy}
                           onChange={(e) => setSendMeCopy(e.target.checked)}
                           className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">
                           Send me a copy
                        </span>
                     </label>
                     <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>Attach file</span>
                     </button>
                  </div>
                  <div className="flex items-center gap-2.5">
                     <Button
                        variant="outline"
                        onClick={handleDiscard}
                        disabled={isPending}
                     >
                        Discard
                     </Button>
                     <Button
                        className="gap-2 min-w-28"
                        onClick={handleSend}
                        disabled={isPending}
                     >
                        {isPending ? (
                           <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending…
                           </>
                        ) : (
                           <>
                              <Send className="h-4 w-4" />
                              Send Email
                           </>
                        )}
                     </Button>
                  </div>
               </div>
            </DialogPrimitive.Content>
         </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
   );
}

// ─── Timeline event row ───────────────────────────────────────────────────────

function EventRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
   const cfg = EVENT_CFG[item.type];
   const Icon = cfg.icon;
   const date = new Date(item.at);

   return (
      <div className="flex gap-3 group">
         <div className="flex flex-col items-center shrink-0">
            <div
               className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center ring-1 ring-inset shrink-0 mt-0.5 transition-transform group-hover:scale-110",
                  cfg.chipCls,
               )}
            >
               <Icon className={cn("h-4 w-4", cfg.iconCls)} />
            </div>
            {!isLast && (
               <div className="w-px flex-1 bg-border/50 mt-1 min-h-5" />
            )}
         </div>
         <div className={cn("pb-5 pt-0.5 flex-1 min-w-0", isLast && "pb-1")}>
            <div className="flex items-start justify-between gap-2">
               <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                     {item.title}
                  </p>
                  {item.jobTitle && (
                     <p
                        className={cn(
                           "text-xs font-medium mt-0.5 truncate",
                           cfg.iconCls,
                        )}
                     >
                        {item.jobTitle}
                     </p>
                  )}
                  {item.description && (
                     <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {item.description}
                     </p>
                  )}
               </div>
               <div className="shrink-0 text-right">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                     {formatDistanceToNow(date, { addSuffix: true })}
                  </span>
                  <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                     {format(date, "MMM d, HH:mm")}
                  </p>
               </div>
            </div>
            {item.meta && Object.keys(item.meta).length > 0 && (
               <div className="flex flex-wrap gap-1 mt-2">
                  {item.type === "screening" && (
                     <>
                        {item.meta.shortlistSize != null && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                              <Sparkles className="h-2.5 w-2.5" />
                              {String(item.meta.shortlistSize)} recommended
                           </span>
                        )}
                        {item.meta.topScore != null && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                              <Zap className="h-2.5 w-2.5 text-amber-500" />
                              Top {String(item.meta.topScore)}%
                           </span>
                        )}
                        {item.meta.totalApplicants != null && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                              <User2 className="h-2.5 w-2.5" />
                              {String(item.meta.totalApplicants)} screened
                           </span>
                        )}
                     </>
                  )}
                  {item.type === "finalized" && (
                     <>
                        {(item.meta.selectedCount as number) > 0 && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <Trophy className="h-2.5 w-2.5" />
                              {String(item.meta.selectedCount)} selected
                           </span>
                        )}
                        {(item.meta.rejectedCount as number) > 0 && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                              <X className="h-2.5 w-2.5" />
                              {String(item.meta.rejectedCount)} rejected
                           </span>
                        )}
                        {(item.meta.poolCount as number) > 0 && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                              <User2 className="h-2.5 w-2.5" />
                              {String(item.meta.poolCount)} in pool
                           </span>
                        )}
                     </>
                  )}
               </div>
            )}
         </div>
      </div>
   );
}

function Timeline({ events }: { events: ActivityItem[] }) {
   const ref = useRef<HTMLDivElement>(null);
   useEffect(() => {
      if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
   }, [events.length]);

   if (!events.length) {
      return (
         <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
               <Inbox className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div className="text-center">
               <p className="text-sm font-medium text-muted-foreground">
                  No activity yet
               </p>
               <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Events will appear as this record is updated.
               </p>
            </div>
         </div>
      );
   }

   return (
      <div
         ref={ref}
         className="max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border"
         style={{ scrollbarWidth: "thin" }}
      >
         <div className="space-y-0">
            {events.map((item, idx) => (
               <EventRow
                  key={item.id}
                  item={item}
                  isLast={idx === events.length - 1}
               />
            ))}
         </div>
      </div>
   );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface ActivityEmailPanelProps {
   jobId?: string;
}

export function ActivityEmailPanel({ jobId }: ActivityEmailPanelProps = {}) {
   const [isOpen, setIsOpen] = useState(false);
   const [composeOpen, setComposeOpen] = useState(false);

   const jobQuery = useJobActivity(jobId);
   const globalQuery = useGlobalActivity(40);
   const { data, isLoading, refetch, isFetching } = jobId
      ? jobQuery
      : globalQuery;

   const events = data?.events ?? [];
   const total = data?.total ?? 0;
   const latest = events.length > 0 ? events[events.length - 1] : null;

   return (
      <>
         {/* ── Compose dialog (portal, outside panel DOM) ─── */}
         <ComposeDialog
            open={composeOpen}
            onClose={() => setComposeOpen(false)}
            defaultJobId={jobId}
         />

         {/* ── Panel bar ──────────────────────────────────── */}
         <div
            className={cn(
               "border-t bg-background transition-shadow",
               isOpen && "shadow-[0_-6px_40px_-10px_rgba(0,0,0,0.12)]",
            )}
         >
            {/* Header */}
            <div
               className={cn(
                  "flex items-center gap-3 px-6 h-12 cursor-pointer select-none group",
                  "hover:bg-muted/30 transition-colors",
                  isOpen && "bg-muted/20 border-b border-border/60",
               )}
               onClick={() => setIsOpen((v) => !v)}
            >
               {/* Left: icon + label + count + latest preview */}
               <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                     className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                        isOpen
                           ? "bg-primary text-primary-foreground"
                           : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                     )}
                  >
                     <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                     Activity &amp; Email
                  </span>
                  {total > 0 && (
                     <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] font-bold tabular-nums rounded-full"
                     >
                        {total}
                     </Badge>
                  )}
                  {(isLoading || isFetching) && (
                     <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  )}
                  {!isOpen &&
                     latest &&
                     (() => {
                        const cfg = EVENT_CFG[latest.type];
                        return (
                           <div className="hidden sm:flex items-center gap-2 ml-1 min-w-0">
                              <span
                                 className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0 animate-pulse",
                                    cfg.dotCls,
                                 )}
                              />
                              <span className="text-xs text-muted-foreground truncate">
                                 <span className="font-medium text-foreground/70">
                                    {latest.title}
                                 </span>
                                 {latest.jobTitle && (
                                    <span className="text-muted-foreground/60">
                                       {" "}
                                       — {latest.jobTitle}
                                    </span>
                                 )}
                                 <span className="text-muted-foreground/50">
                                    {" "}
                                    ·{" "}
                                    {formatDistanceToNow(new Date(latest.at), {
                                       addSuffix: true,
                                    })}
                                 </span>
                              </span>
                           </div>
                        );
                     })()}
               </div>

               {/* Right: actions */}
               <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
               >
                  <button
                     className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                     title="Refresh"
                     onClick={() => refetch()}
                  >
                     <RefreshCw
                        className={cn(
                           "h-3.5 w-3.5",
                           isFetching && "animate-spin",
                        )}
                     />
                  </button>
                  <Button
                     size="sm"
                     className="h-8 gap-2 px-4 font-medium text-sm"
                     onClick={() => setComposeOpen(true)}
                  >
                     <Mail className="h-3.5 w-3.5" />
                     New Email
                  </Button>
                  <div className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                     {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                     ) : (
                        <ChevronUp className="h-4 w-4" />
                     )}
                  </div>
               </div>
            </div>

            {/* Expandable timeline body */}
            <div
               className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-in-out",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
               )}
            >
               <div className="overflow-hidden">
                  <div className="px-6 py-6">
                     <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                           Timeline
                        </span>
                        {total > 0 && (
                           <span className="text-xs text-muted-foreground/60">
                              {total} events
                           </span>
                        )}
                     </div>
                     <Timeline events={events} />
                  </div>
               </div>
            </div>
         </div>
      </>
   );
}
