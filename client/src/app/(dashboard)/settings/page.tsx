"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
   Sliders,
   MessageSquareText,
   ShieldCheck,
   RotateCcw,
   Save,
   Info,
   Zap,
   CheckCircle2,
   AlertTriangle,
   User,
   Loader2,
   BrainCircuit,
   Mail,
   Server,
   FlaskConical,
   RotateCw,
   Eye,
   EyeOff,
   ListOrdered,
   Layers,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   useGetSettings,
   useUpdateSettings,
   DEFAULT_SETTINGS,
} from "@/services/settings.service";
import {
   useEmailSettings,
   useUpdateEmailSettings,
   useTestEmailSettings,
   useEmailTemplateDefaults,
} from "@/services/emailSettings.service";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import type { ScoringWeights, ScreeningConfig } from "@/types";

const TrixEditor = dynamic(() => import("@/components/ui/TrixEditor"), {
   ssr: false,
   loading: () => (
      <div className="h-48 rounded-lg border border-input animate-pulse bg-muted" />
   ),
});

const WEIGHT_META: {
   key: keyof ScoringWeights;
   label: string;
   description: string;
   colorBar: string;
   colorBg: string;
   colorText: string;
}[] = [
   {
      key: "skills",
      label: "Skills Match",
      description:
         "How closely the candidate's technical skills align with the job requirements",
      colorBar: "bg-violet-500",
      colorBg: "bg-violet-50",
      colorText: "text-violet-700",
   },
   {
      key: "experience",
      label: "Relevant Experience",
      description:
         "Years and quality of prior work experience relevant to the role",
      colorBar: "bg-blue-500",
      colorBg: "bg-blue-50",
      colorText: "text-blue-700",
   },
   {
      key: "education",
      label: "Education",
      description: "Degree level and field of study relevance to the position",
      colorBar: "bg-emerald-500",
      colorBg: "bg-emerald-50",
      colorText: "text-emerald-700",
   },
   {
      key: "projects",
      label: "Projects & Certifications",
      description:
         "Portfolio work, open-source contributions, and industry certifications",
      colorBar: "bg-amber-500",
      colorBg: "bg-amber-50",
      colorText: "text-amber-700",
   },
   {
      key: "availability",
      label: "Availability",
      description:
         "Whether the candidate's availability fits the role's schedule and start date",
      colorBar: "bg-rose-500",
      colorBg: "bg-rose-50",
      colorText: "text-rose-700",
   },
];

const EXAMPLES = [
   "Only consider candidates based in Africa.",
   "Strongly prefer candidates with open-source GitHub contributions.",
   "Leadership and people management experience is a must.",
   "Candidates must hold at least one cloud certification (AWS, GCP, or Azure).",
   "Prefer candidates who can work fully remote with no relocation requirement.",
];

type Section = "weights" | "behavior" | "instructions" | "email" | "account";

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
   { id: "weights", label: "Scoring Weights", icon: Sliders },
   { id: "behavior", label: "Screening Behavior", icon: ShieldCheck },
   {
      id: "instructions",
      label: "Custom Instructions",
      icon: MessageSquareText,
   },
   { id: "email", label: "Email Settings", icon: Mail },
   { id: "account", label: "Account", icon: User },
];

function Toggle({
   checked,
   onChange,
}: {
   checked: boolean;
   onChange: () => void;
}) {
   return (
      <button
         role="switch"
         aria-checked={checked}
         onClick={onChange}
         className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            checked ? "bg-primary" : "bg-muted",
         )}
      >
         <span
            className={cn(
               "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md ring-0 transition-transform duration-200",
               checked ? "translate-x-5" : "translate-x-1",
            )}
         />
      </button>
   );
}

function WeightRow({
   meta,
   value,
   onChange,
}: {
   meta: (typeof WEIGHT_META)[number];
   value: number;
   onChange: (key: keyof ScoringWeights, val: string) => void;
}) {
   const pct = Math.max(0, Math.min(100, value));
   return (
      <div className="grid grid-cols-[1fr_auto] gap-4 items-start py-4 border-b last:border-0">
         <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
               <span
                  className={cn("h-2 w-2 rounded-full shrink-0", meta.colorBar)}
               />
               <span className="text-sm font-medium text-foreground">
                  {meta.label}
               </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
               {meta.description}
            </p>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
               <div
                  className={cn(
                     "h-full rounded-full transition-all duration-300",
                     meta.colorBar,
                  )}
                  style={{ width: `${pct}%` }}
               />
            </div>
         </div>
         <div className="flex items-center gap-1.5 pt-0.5">
            <input
               type="number"
               min={0}
               max={100}
               step={5}
               value={value}
               onChange={(e) => onChange(meta.key, e.target.value)}
               className="w-16 h-9 rounded-lg border border-input bg-background px-2 text-sm text-center font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-sm text-muted-foreground">%</span>
         </div>
      </div>
   );
}

export default function SettingsPage() {
   const user = useAppSelector((s) => s.auth.user);
   const { data: saved, isLoading } = useGetSettings();
   const { mutate: save, isPending } = useUpdateSettings();
   const { toast } = useToast();

   const [active, setActive] = useState<Section>("weights");
   const [weights, setWeights] = useState<ScoringWeights>(
      DEFAULT_SETTINGS.scoringWeights,
   );
   const [minScore, setMinScore] = useState(DEFAULT_SETTINGS.minScoreThreshold);
   const [instructions, setInstructions] = useState(
      DEFAULT_SETTINGS.customInstructions,
   );
   const [preferImmediate, setPreferImmediate] = useState(
      DEFAULT_SETTINGS.preferImmediateAvailability,
   );
   const [autoTalentPool, setAutoTalentPool] = useState(
      DEFAULT_SETTINGS.autoTalentPool,
   );
   const [autoTalentPoolCount, setAutoTalentPoolCount] = useState(
      DEFAULT_SETTINGS.autoTalentPoolCount,
   );
   const [defaultShortlistSize, setDefaultShortlistSize] = useState<
      5 | 10 | 15 | 20 | 30 | 50
   >(DEFAULT_SETTINGS.defaultShortlistSize);
   const [defaultCombineStrategy, setDefaultCombineStrategy] = useState<
      "average" | "max" | "min"
   >(DEFAULT_SETTINGS.defaultCombineStrategy);
   const [isDirty, setIsDirty] = useState(false);

   // ── Email settings state ──────────────────────────────────────────────────
   const { data: emailSaved, isLoading: emailLoading } = useEmailSettings();
   const { data: emailDefaults } = useEmailTemplateDefaults();
   const { mutateAsync: saveEmail, isPending: savingEmail } =
      useUpdateEmailSettings();
   const { mutateAsync: testEmail, isPending: testingEmail } =
      useTestEmailSettings();

   const [smtpHost, setSmtpHost] = useState("");
   const [smtpPort, setSmtpPort] = useState("587");
   const [smtpSecure, setSmtpSecure] = useState(false);
   const [smtpUser, setSmtpUser] = useState("");
   const [smtpPass, setSmtpPass] = useState(""); // only sent when non-empty
   const [showPass, setShowPass] = useState(false);
   const [fromEmail, setFromEmail] = useState("");
   const [fromName, setFromName] = useState("");
   const [replyTo, setReplyTo] = useState("");
   const [interviewSubject, setInterviewSubject] = useState("");
   const [interviewBody, setInterviewBody] = useState("");
   const [regretSubject, setRegretSubject] = useState("");
   const [regretBody, setRegretBody] = useState("");
   const [emailDirty, setEmailDirty] = useState(false);
   const [testEmailOpen, setTestEmailOpen] = useState(false);
   const [testEmailTo, setTestEmailTo] = useState("");

   // Populate email form when data loads
   useEffect(() => {
      if (emailSaved) {
         setSmtpHost(emailSaved.smtpHost ?? "");
         setSmtpPort(String(emailSaved.smtpPort ?? 587));
         setSmtpSecure(emailSaved.smtpSecure ?? false);
         setSmtpUser(emailSaved.smtpUser ?? "");
         setFromEmail(emailSaved.fromEmail ?? "");
         setFromName(emailSaved.fromName ?? "");
         setReplyTo(emailSaved.replyTo ?? "");
         setInterviewSubject(emailSaved.interviewSubject ?? "");
         setInterviewBody(emailSaved.interviewBody ?? "");
         setRegretSubject(emailSaved.regretSubject ?? "");
         setRegretBody(emailSaved.regretBody ?? "");
         setEmailDirty(false);
      } else if (emailDefaults && !emailSaved) {
         // Pre-fill templates with defaults
         setInterviewSubject(emailDefaults.interview.subject);
         setInterviewBody(emailDefaults.interview.body);
         setRegretSubject(emailDefaults.regret.subject);
         setRegretBody(emailDefaults.regret.body);
      }
   }, [emailSaved, emailDefaults]);

   async function handleSaveEmail() {
      try {
         await saveEmail({
            smtpHost,
            smtpPort: Number(smtpPort),
            smtpSecure,
            smtpUser,
            ...(smtpPass.trim() ? { smtpPass } : {}),
            fromEmail,
            fromName,
            replyTo: replyTo.trim() || undefined,
            interviewSubject,
            interviewBody,
            regretSubject,
            regretBody,
         });
         setSmtpPass(""); // Clear password after saving
         setEmailDirty(false);
         toast({ title: "Email settings saved" });
      } catch (err) {
         toast({
            title: "Failed to save email settings",
            description: (err as Error).message,
            variant: "destructive",
         });
      }
   }

   async function handleTestEmail() {
      try {
         const result = await testEmail({ to: testEmailTo.trim() });
         toast({ title: "Test email sent!", description: result.message });
         setTestEmailOpen(false);
         setTestEmailTo("");
      } catch (err) {
         toast({
            title: "Test failed",
            description: (err as Error).message,
            variant: "destructive",
         });
      }
   }

   function resetEmailTemplates() {
      if (!emailDefaults) return;
      setInterviewSubject(emailDefaults.interview.subject);
      setInterviewBody(emailDefaults.interview.body);
      setRegretSubject(emailDefaults.regret.subject);
      setRegretBody(emailDefaults.regret.body);
      setEmailDirty(true);
   }

   useEffect(() => {
      if (saved) {
         setWeights(saved.scoringWeights);
         setMinScore(saved.minScoreThreshold);
         setInstructions(saved.customInstructions);
         setPreferImmediate(saved.preferImmediateAvailability);
         setAutoTalentPool(
            saved.autoTalentPool ?? DEFAULT_SETTINGS.autoTalentPool,
         );
         setAutoTalentPoolCount(
            saved.autoTalentPoolCount ?? DEFAULT_SETTINGS.autoTalentPoolCount,
         );
         setDefaultShortlistSize(
            saved.defaultShortlistSize ?? DEFAULT_SETTINGS.defaultShortlistSize,
         );
         setDefaultCombineStrategy(
            saved.defaultCombineStrategy ??
               DEFAULT_SETTINGS.defaultCombineStrategy,
         );
         setIsDirty(false);
      }
   }, [saved]);

   const total = Object.values(weights).reduce(
      (s, v) => s + (Number(v) || 0),
      0,
   );
   const totalOk = Math.round(total) === 100;

   function updateWeight(key: keyof ScoringWeights, raw: string) {
      const val = Math.max(0, Math.min(100, Number(raw) || 0));
      setWeights((prev) => ({ ...prev, [key]: val }));
      setIsDirty(true);
   }

   function handleReset() {
      setWeights(DEFAULT_SETTINGS.scoringWeights);
      setMinScore(DEFAULT_SETTINGS.minScoreThreshold);
      setInstructions(DEFAULT_SETTINGS.customInstructions);
      setPreferImmediate(DEFAULT_SETTINGS.preferImmediateAvailability);
      setAutoTalentPool(DEFAULT_SETTINGS.autoTalentPool);
      setAutoTalentPoolCount(DEFAULT_SETTINGS.autoTalentPoolCount);
      setDefaultShortlistSize(DEFAULT_SETTINGS.defaultShortlistSize);
      setDefaultCombineStrategy(DEFAULT_SETTINGS.defaultCombineStrategy);
      setIsDirty(true);
   }

   function handleSave() {
      if (!totalOk) {
         toast({
            title: "Weights do not add up",
            description: `Current total is ${total}%. Adjust so they sum to exactly 100%.`,
            variant: "destructive",
         });
         return;
      }

      const payload: ScreeningConfig = {
         scoringWeights: weights,
         minScoreThreshold: minScore,
         customInstructions: instructions.trim(),
         preferImmediateAvailability: preferImmediate,
         autoTalentPool,
         autoTalentPoolCount,
         defaultShortlistSize,
         defaultCombineStrategy,
      };

      save(payload, {
         onSuccess: () => {
            setIsDirty(false);
            toast({
               title: "Settings saved",
               description:
                  "AI preferences will apply to all future screenings.",
            });
         },
         onError: (err: unknown) => {
            const msg =
               err instanceof Error ? err.message : "Failed to save settings";
            toast({
               title: "Save failed",
               description: msg,
               variant: "destructive",
            });
         },
      });
   }

   return (
      <div className="flex flex-col min-h-screen">
         <Header title="Settings" />

         <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside className="hidden md:flex w-52 shrink-0 flex-col border-r bg-muted/20 overflow-y-auto">
               <div className="p-4 space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-3 pb-2">
                     Configuration
                  </p>
                  {NAV.map(({ id, label, icon: Icon }) => (
                     <button
                        key={id}
                        onClick={() => setActive(id)}
                        className={cn(
                           "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                           active === id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                     >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                     </button>
                  ))}
               </div>
            </aside>

            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
               <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-background/95 backdrop-blur-sm shrink-0">
                  <div className="min-w-0">
                     {active === "email" ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                           <Mail className="h-3.5 w-3.5 text-primary" />
                           SMTP credentials are encrypted at rest
                        </p>
                     ) : isDirty ? (
                        <p
                           className={cn(
                              "text-xs font-medium flex items-center gap-1.5",
                              totalOk ? "text-amber-600" : "text-red-600",
                           )}
                        >
                           {totalOk ? (
                              <>
                                 <AlertTriangle className="h-3.5 w-3.5" />{" "}
                                 Unsaved changes
                              </>
                           ) : (
                              <>
                                 <AlertTriangle className="h-3.5 w-3.5" />{" "}
                                 Weights sum to {total}% — must equal 100%
                              </>
                           )}
                        </p>
                     ) : (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                           <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                           All changes saved
                        </p>
                     )}
                  </div>
                  {active !== "email" && (
                     <div className="flex items-center gap-2 shrink-0">
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={handleReset}
                           disabled={isPending}
                        >
                           <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                           Reset defaults
                        </Button>
                        <Button
                           size="sm"
                           onClick={handleSave}
                           disabled={isPending || !isDirty || !totalOk}
                        >
                           {isPending ? (
                              <>
                                 <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                 Saving…
                              </>
                           ) : (
                              <>
                                 <Save className="h-3.5 w-3.5 mr-1.5" />
                                 Save settings
                              </>
                           )}
                        </Button>
                     </div>
                  )}
               </div>

               <div className="flex-1 overflow-y-auto p-6">
                  {active === "weights" && (
                     <div className="space-y-6">
                        <div>
                           <h2 className="text-base font-semibold text-foreground">
                              Scoring Weights
                           </h2>
                           <p className="text-sm text-muted-foreground mt-1">
                              Control how much each dimension contributes to the
                              final match score. Values must sum to exactly
                              100%.
                           </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           <div className="lg:col-span-2">
                              <Card>
                                 <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-semibold">
                                       Evaluation Criteria
                                    </CardTitle>
                                    <Badge
                                       className={cn(
                                          "text-xs font-mono tabular-nums",
                                          totalOk
                                             ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                             : "bg-red-100 text-red-700 border border-red-200",
                                       )}
                                    >
                                       {totalOk ? (
                                          <>
                                             <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                                             Total: {total}%
                                          </>
                                       ) : (
                                          <>
                                             <AlertTriangle className="h-3 w-3 mr-1 inline" />
                                             {total}% / 100%
                                          </>
                                       )}
                                    </Badge>
                                 </CardHeader>
                                 <CardContent className="pt-0">
                                    {isLoading ? (
                                       <div className="space-y-6 py-2">
                                          {WEIGHT_META.map((m) => (
                                             <div
                                                key={m.key}
                                                className="h-16 rounded-lg bg-muted/40 animate-pulse"
                                             />
                                          ))}
                                       </div>
                                    ) : (
                                       WEIGHT_META.map((meta) => (
                                          <WeightRow
                                             key={meta.key}
                                             meta={meta}
                                             value={weights[meta.key] ?? 0}
                                             onChange={updateWeight}
                                          />
                                       ))
                                    )}
                                 </CardContent>
                              </Card>
                           </div>

                           <div className="space-y-4">
                              <Card>
                                 <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold">
                                       Distribution
                                    </CardTitle>
                                 </CardHeader>
                                 <CardContent className="space-y-3">
                                    <div className="h-4 w-full rounded-full overflow-hidden flex gap-px bg-muted">
                                       {WEIGHT_META.map((meta) => {
                                          const pct = weights[meta.key] ?? 0;
                                          if (pct <= 0) return null;
                                          return (
                                             <div
                                                key={meta.key}
                                                className={cn(
                                                   "h-full transition-all duration-300",
                                                   meta.colorBar,
                                                )}
                                                style={{ width: `${pct}%` }}
                                                title={`${meta.label}: ${pct}%`}
                                             />
                                          );
                                       })}
                                    </div>
                                    <div className="space-y-2 pt-1">
                                       {WEIGHT_META.map((meta) => (
                                          <div
                                             key={meta.key}
                                             className="flex items-center justify-between"
                                          >
                                             <div className="flex items-center gap-2">
                                                <span
                                                   className={cn(
                                                      "h-2.5 w-2.5 rounded-sm shrink-0",
                                                      meta.colorBar,
                                                   )}
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                   {meta.label}
                                                </span>
                                             </div>
                                             <span
                                                className={cn(
                                                   "text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded",
                                                   meta.colorBg,
                                                   meta.colorText,
                                                )}
                                             >
                                                {weights[meta.key] ?? 0}%
                                             </span>
                                          </div>
                                       ))}
                                    </div>
                                 </CardContent>
                              </Card>

                              <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 space-y-2">
                                 <div className="flex items-center gap-2">
                                    <BrainCircuit className="h-4 w-4 text-primary" />
                                    <p className="text-xs font-semibold text-foreground">
                                       How weights work
                                    </p>
                                 </div>
                                 <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside marker:text-primary/40">
                                    <li>
                                       Weights are embedded verbatim in the
                                       Gemini prompt.
                                    </li>
                                    <li>
                                       The AI scores each criterion
                                       proportionally.
                                    </li>
                                    <li>
                                       Adjusting weights shifts what the AI
                                       prioritises.
                                    </li>
                                 </ul>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {active === "behavior" && (
                     <div className="space-y-6">
                        <div>
                           <h2 className="text-base font-semibold text-foreground">
                              Screening Behavior
                           </h2>
                           <p className="text-sm text-muted-foreground mt-1">
                              Fine-tune how the AI filters and prioritises
                              candidates during each run.
                           </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           <div className="lg:col-span-2 space-y-4">
                              <Card>
                                 <CardHeader>
                                    <div className="flex items-center gap-3">
                                       <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                          <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                                       </div>
                                       <div>
                                          <CardTitle className="text-sm font-semibold">
                                             Minimum Match Score
                                          </CardTitle>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                             Candidates below this threshold are
                                             excluded from the shortlist.
                                          </p>
                                       </div>
                                    </div>
                                 </CardHeader>
                                 <CardContent className="space-y-4">
                                    <div className="flex items-end gap-6">
                                       <div
                                          className={cn(
                                             "flex items-end gap-1 tabular-nums transition-colors",
                                             minScore === 0
                                                ? "text-muted-foreground"
                                                : "text-primary",
                                          )}
                                       >
                                          <span className="text-5xl font-bold leading-none">
                                             {minScore}
                                          </span>
                                          <span className="text-xl font-medium mb-1">
                                             %
                                          </span>
                                       </div>
                                       <div className="flex-1 pb-1 space-y-1">
                                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                                             <div
                                                className="h-full bg-primary rounded-full transition-all duration-200"
                                                style={{
                                                   width: `${(minScore / 80) * 100}%`,
                                                }}
                                             />
                                          </div>
                                          <div className="flex justify-between text-xs text-muted-foreground">
                                             <span>No filter</span>
                                             <span>Moderate</span>
                                             <span>Strict</span>
                                          </div>
                                       </div>
                                    </div>

                                    <input
                                       type="range"
                                       min={0}
                                       max={80}
                                       step={5}
                                       value={minScore}
                                       onChange={(e) => {
                                          setMinScore(Number(e.target.value));
                                          setIsDirty(true);
                                       }}
                                       className="w-full accent-primary"
                                    />

                                    <div className="flex flex-wrap gap-2">
                                       {[0, 30, 50, 65, 75].map((v) => (
                                          <button
                                             key={v}
                                             onClick={() => {
                                                setMinScore(v);
                                                setIsDirty(true);
                                             }}
                                             className={cn(
                                                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                                minScore === v
                                                   ? "bg-primary text-primary-foreground border-primary"
                                                   : "border-input text-muted-foreground hover:bg-muted",
                                             )}
                                          >
                                             {v === 0 ? "Off" : `${v}%`}
                                          </button>
                                       ))}
                                    </div>

                                    {minScore > 0 && (
                                       <div className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/15 rounded-lg p-3">
                                          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                          <span className="text-foreground/80">
                                             Candidates scoring below{" "}
                                             <strong>{minScore}%</strong> are
                                             excluded. This is sent to the AI as
                                             an instruction <em>and</em>{" "}
                                             enforced server-side as a hard
                                             filter.
                                          </span>
                                       </div>
                                    )}
                                 </CardContent>
                              </Card>

                              <Card>
                                 <CardContent className="pt-5">
                                    <div className="flex items-start justify-between gap-6">
                                       <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                             <p className="text-sm font-semibold">
                                                Prefer Immediate Availability
                                             </p>
                                             {preferImmediate && (
                                                <Badge className="text-xs bg-primary/10 text-primary border border-primary/20">
                                                   Active
                                                </Badge>
                                             )}
                                          </div>
                                          <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                                             Instructs the AI to deprioritise
                                             candidates marked as "Not
                                             Available" unless they are
                                             overwhelmingly superior in all
                                             other areas.
                                          </p>
                                       </div>
                                       <Toggle
                                          checked={preferImmediate}
                                          onChange={() => {
                                             setPreferImmediate((v) => !v);
                                             setIsDirty(true);
                                          }}
                                       />
                                    </div>
                                 </CardContent>
                              </Card>

                              <Card>
                                 <CardContent className="pt-5 space-y-4">
                                    <div className="flex items-start justify-between gap-6">
                                       <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                             <p className="text-sm font-semibold">
                                                Auto-Add Near-Misses to Talent
                                                Pool
                                             </p>
                                             {autoTalentPool && (
                                                <Badge className="text-xs bg-violet-100 text-violet-700 border border-violet-200">
                                                   Active
                                                </Badge>
                                             )}
                                          </div>
                                          <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                                             Automatically adds the top
                                             candidates who narrowly missed the
                                             cut to your Talent Pool for future
                                             openings.
                                          </p>
                                       </div>
                                       <Toggle
                                          checked={autoTalentPool}
                                          onChange={() => {
                                             setAutoTalentPool((v) => !v);
                                             setIsDirty(true);
                                          }}
                                       />
                                    </div>
                                    {autoTalentPool && (
                                       <div className="space-y-2 border-t pt-4">
                                          <label className="text-xs font-medium text-muted-foreground">
                                             Number of near-miss candidates to
                                             auto-add
                                          </label>
                                          <div className="flex items-center gap-3">
                                             <input
                                                type="range"
                                                min={0}
                                                max={10}
                                                value={autoTalentPoolCount}
                                                onChange={(e) => {
                                                   setAutoTalentPoolCount(
                                                      Number(e.target.value),
                                                   );
                                                   setIsDirty(true);
                                                }}
                                                className="flex-1 accent-violet-500"
                                             />
                                             <span className="text-sm font-semibold w-8 text-center tabular-nums">
                                                {autoTalentPoolCount}
                                             </span>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                             {[1, 2, 3, 5, 10].map((v) => (
                                                <button
                                                   key={v}
                                                   onClick={() => {
                                                      setAutoTalentPoolCount(v);
                                                      setIsDirty(true);
                                                   }}
                                                   className={cn(
                                                      "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                                      autoTalentPoolCount === v
                                                         ? "bg-violet-600 text-white border-violet-600"
                                                         : "border-input text-muted-foreground hover:bg-muted",
                                                   )}
                                                >
                                                   {v}
                                                </button>
                                             ))}
                                          </div>
                                       </div>
                                    )}
                                 </CardContent>
                              </Card>

                              {/* ── Default Shortlist Size ──────────────────── */}
                              <Card>
                                 <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                       <ListOrdered className="h-4 w-4 text-primary" />
                                       <CardTitle className="text-sm font-semibold">
                                          Default Shortlist Size
                                       </CardTitle>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                       Pre-fills the Shortlist Size field when
                                       creating a new job.
                                    </p>
                                 </CardHeader>
                                 <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                       {([5, 10, 15, 20, 30, 50] as const).map(
                                          (v) => (
                                             <button
                                                key={v}
                                                onClick={() => {
                                                   setDefaultShortlistSize(v);
                                                   setIsDirty(true);
                                                }}
                                                className={cn(
                                                   "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                                                   defaultShortlistSize === v
                                                      ? "bg-violet-600 text-white border-violet-600"
                                                      : "border-input text-muted-foreground hover:bg-muted",
                                                )}
                                             >
                                                {v}
                                             </button>
                                          ),
                                       )}
                                    </div>
                                 </CardContent>
                              </Card>

                              {/* ── Default Combine Strategy ────────────────── */}
                              <Card>
                                 <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                       <Layers className="h-4 w-4 text-primary" />
                                       <CardTitle className="text-sm font-semibold">
                                          Default Combine Strategy
                                       </CardTitle>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                       How scores are merged when combining
                                       multiple screening runs.
                                    </p>
                                 </CardHeader>
                                 <CardContent>
                                    <div className="grid grid-cols-3 gap-2">
                                       {(
                                          [
                                             {
                                                value: "average",
                                                label: "Average",
                                                hint: "Mean across runs",
                                             },
                                             {
                                                value: "max",
                                                label: "Best Score",
                                                hint: "Highest run wins",
                                             },
                                             {
                                                value: "min",
                                                label: "Conservative",
                                                hint: "Lowest run wins",
                                             },
                                          ] as const
                                       ).map(({ value, label, hint }) => (
                                          <button
                                             key={value}
                                             onClick={() => {
                                                setDefaultCombineStrategy(
                                                   value,
                                                );
                                                setIsDirty(true);
                                             }}
                                             className={cn(
                                                "flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border text-center transition-colors",
                                                defaultCombineStrategy === value
                                                   ? "bg-violet-600 text-white border-violet-600"
                                                   : "border-input hover:bg-muted",
                                             )}
                                          >
                                             <span className="text-sm font-semibold">
                                                {label}
                                             </span>
                                             <span
                                                className={cn(
                                                   "text-[10px]",
                                                   defaultCombineStrategy ===
                                                      value
                                                      ? "text-white/80"
                                                      : "text-muted-foreground",
                                                )}
                                             >
                                                {hint}
                                             </span>
                                          </button>
                                       ))}
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>

                           <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 space-y-3 h-fit">
                              <div className="flex items-center gap-2">
                                 <Info className="h-4 w-4 text-primary" />
                                 <p className="text-xs font-semibold text-foreground">
                                    Dual enforcement
                                 </p>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                 The minimum score threshold is injected into
                                 the Gemini prompt <strong>and</strong> enforced
                                 server-side after the AI responds. Even if the
                                 AI ignores the instruction, the filter still
                                 applies.
                              </p>
                           </div>
                        </div>
                     </div>
                  )}

                  {active === "instructions" && (
                     <div className="space-y-6">
                        <div>
                           <h2 className="text-base font-semibold text-foreground">
                              Custom AI Instructions
                           </h2>
                           <p className="text-sm text-muted-foreground mt-1">
                              Free-text directives injected verbatim into every
                              Gemini prompt, marked as highest priority.
                           </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           <div className="lg:col-span-2 space-y-4">
                              <Card>
                                 <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                       <Zap className="h-4 w-4 text-primary" />
                                       <CardTitle className="text-sm font-semibold">
                                          Instructions
                                       </CardTitle>
                                    </div>
                                 </CardHeader>
                                 <CardContent className="space-y-3">
                                    <Textarea
                                       placeholder={`e.g. "${EXAMPLES[0]}"`}
                                       value={instructions}
                                       onChange={(e) => {
                                          setInstructions(e.target.value);
                                          setIsDirty(true);
                                       }}
                                       rows={8}
                                       maxLength={1500}
                                       className="resize-none text-sm font-mono leading-relaxed"
                                    />
                                    <div className="flex items-center justify-between">
                                       <p className="text-xs text-muted-foreground">
                                          One instruction per line is
                                          recommended.
                                       </p>
                                       <span
                                          className={cn(
                                             "text-xs tabular-nums",
                                             instructions.length > 1300
                                                ? "text-red-500 font-medium"
                                                : "text-muted-foreground",
                                          )}
                                       >
                                          {instructions.length} / 1500
                                       </span>
                                    </div>
                                 </CardContent>
                              </Card>

                              <Card>
                                 <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold">
                                       Quick examples
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                       Click any example to append it.
                                    </p>
                                 </CardHeader>
                                 <CardContent>
                                    <div className="space-y-2">
                                       {EXAMPLES.map((ex) => (
                                          <button
                                             key={ex}
                                             onClick={() => {
                                                setInstructions((prev) =>
                                                   prev.trim()
                                                      ? `${prev.trimEnd()}\n${ex}`
                                                      : ex,
                                                );
                                                setIsDirty(true);
                                             }}
                                             className="w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/40 hover:bg-primary/[0.02] transition-colors group"
                                          >
                                             <span className="text-primary/50 group-hover:text-primary text-sm font-bold shrink-0 mt-px">
                                                +
                                             </span>
                                             <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                                {ex}
                                             </span>
                                          </button>
                                       ))}
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>

                           <div className="space-y-4 h-fit">
                              <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 space-y-3">
                                 <div className="flex items-center gap-2">
                                    <BrainCircuit className="h-4 w-4 text-primary" />
                                    <p className="text-xs font-semibold text-foreground">
                                       How instructions work
                                    </p>
                                 </div>
                                 <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside marker:text-primary/40 leading-relaxed">
                                    <li>
                                       Added verbatim to every Gemini screening
                                       prompt.
                                    </li>
                                    <li>
                                       Marked as highest priority in the prompt.
                                    </li>
                                    <li>Specific to your account only.</li>
                                    <li>
                                       Keep instructions concise and actionable.
                                    </li>
                                 </ul>
                              </div>

                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                                 <p className="text-xs font-semibold text-amber-800">
                                    Tips for best results
                                 </p>
                                 <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside leading-relaxed">
                                    <li>
                                       Be specific ("must have 3+ years React"
                                       not "be experienced").
                                    </li>
                                    <li>
                                       Use "must", "strongly prefer", or
                                       "deprioritise".
                                    </li>
                                    <li>
                                       Avoid contradicting the scoring weights.
                                    </li>
                                 </ul>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {active === "email" && (
                     <div className="space-y-6">
                        <div>
                           <h2 className="text-base font-semibold text-foreground">
                              Email Settings
                           </h2>
                           <p className="text-sm text-muted-foreground mt-1">
                              Configure your SMTP server and email templates for
                              interview invitations and regret letters. Your
                              password is encrypted at rest and never returned
                              by the API.
                           </p>
                        </div>

                        {emailLoading ? (
                           <div className="flex items-center justify-center py-20">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="lg:col-span-2 space-y-5">
                                 {/* SMTP Config */}
                                 <Card>
                                    <CardHeader className="pb-3">
                                       <div className="flex items-center gap-2">
                                          <Server className="h-4 w-4 text-primary" />
                                          <CardTitle className="text-sm font-semibold">
                                             SMTP Configuration
                                          </CardTitle>
                                       </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                          <div className="sm:col-span-2 space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                SMTP Host{" "}
                                                <span className="text-destructive">
                                                   *
                                                </span>
                                             </label>
                                             <Input
                                                value={smtpHost}
                                                onChange={(e) => {
                                                   setSmtpHost(e.target.value);
                                                   setEmailDirty(true);
                                                }}
                                                placeholder="smtp.gmail.com"
                                                autoComplete="off"
                                             />
                                          </div>
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                Port{" "}
                                                <span className="text-destructive">
                                                   *
                                                </span>
                                             </label>
                                             <Input
                                                type="number"
                                                value={smtpPort}
                                                onChange={(e) => {
                                                   setSmtpPort(e.target.value);
                                                   setEmailDirty(true);
                                                }}
                                                placeholder="587"
                                                autoComplete="off"
                                             />
                                          </div>
                                       </div>

                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                SMTP Username{" "}
                                                <span className="text-destructive">
                                                   *
                                                </span>
                                             </label>
                                             <Input
                                                value={smtpUser}
                                                onChange={(e) => {
                                                   setSmtpUser(e.target.value);
                                                   setEmailDirty(true);
                                                }}
                                                placeholder="user@example.com"
                                                autoComplete="username"
                                             />
                                          </div>
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                SMTP Password{" "}
                                                {emailSaved?.smtpPassSet ? (
                                                   <span className="text-emerald-600 font-medium">
                                                      (set — leave blank to
                                                      keep)
                                                   </span>
                                                ) : (
                                                   <span className="text-destructive">
                                                      *
                                                   </span>
                                                )}
                                             </label>
                                             <div className="relative">
                                                <Input
                                                   type={
                                                      showPass
                                                         ? "text"
                                                         : "password"
                                                   }
                                                   value={smtpPass}
                                                   onChange={(e) => {
                                                      setSmtpPass(
                                                         e.target.value,
                                                      );
                                                      setEmailDirty(true);
                                                   }}
                                                   placeholder={
                                                      emailSaved?.smtpPassSet
                                                         ? "••••••••"
                                                         : "Enter SMTP password"
                                                   }
                                                   autoComplete="new-password"
                                                   className="pr-9"
                                                />
                                                <button
                                                   type="button"
                                                   className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                   onClick={() =>
                                                      setShowPass((v) => !v)
                                                   }
                                                   aria-label={
                                                      showPass
                                                         ? "Hide password"
                                                         : "Show password"
                                                   }
                                                >
                                                   {showPass ? (
                                                      <EyeOff className="h-4 w-4" />
                                                   ) : (
                                                      <Eye className="h-4 w-4" />
                                                   )}
                                                </button>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="flex items-center gap-3">
                                          <Toggle
                                             checked={smtpSecure}
                                             onChange={() => {
                                                setSmtpSecure((v) => !v);
                                                setEmailDirty(true);
                                             }}
                                          />
                                          <div>
                                             <p className="text-sm font-medium">
                                                Use TLS/SSL
                                             </p>
                                             <p className="text-xs text-muted-foreground">
                                                Enable for port 465 (SMTPS).
                                                STARTTLS (port 587) does not
                                                require this.
                                             </p>
                                          </div>
                                       </div>
                                    </CardContent>
                                 </Card>

                                 {/* Sender info */}
                                 <Card>
                                    <CardHeader className="pb-3">
                                       <div className="flex items-center gap-2">
                                          <Mail className="h-4 w-4 text-primary" />
                                          <CardTitle className="text-sm font-semibold">
                                             Sender Information
                                          </CardTitle>
                                       </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                From Email{" "}
                                                <span className="text-destructive">
                                                   *
                                                </span>
                                             </label>
                                             <Input
                                                type="email"
                                                value={fromEmail}
                                                onChange={(e) => {
                                                   setFromEmail(e.target.value);
                                                   setEmailDirty(true);
                                                }}
                                                placeholder="hr@yourcompany.com"
                                                autoComplete="off"
                                             />
                                          </div>
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                From Name{" "}
                                                <span className="text-destructive">
                                                   *
                                                </span>
                                             </label>
                                             <Input
                                                value={fromName}
                                                onChange={(e) => {
                                                   setFromName(e.target.value);
                                                   setEmailDirty(true);
                                                }}
                                                placeholder="HR Team"
                                                autoComplete="off"
                                             />
                                          </div>
                                       </div>
                                       <div className="space-y-1.5">
                                          <label className="text-xs font-medium text-muted-foreground">
                                             Reply-To{" "}
                                             <span className="text-muted-foreground/60">
                                                (optional)
                                             </span>
                                          </label>
                                          <Input
                                             type="email"
                                             value={replyTo}
                                             onChange={(e) => {
                                                setReplyTo(e.target.value);
                                                setEmailDirty(true);
                                             }}
                                             placeholder="replies@yourcompany.com"
                                             autoComplete="off"
                                          />
                                       </div>
                                    </CardContent>
                                 </Card>

                                 {/* Email templates */}
                                 <Card>
                                    <CardHeader className="pb-3">
                                       <div className="flex items-center justify-between">
                                          <CardTitle className="text-sm font-semibold">
                                             Email Templates
                                          </CardTitle>
                                          <Button
                                             variant="ghost"
                                             size="sm"
                                             className="h-7 text-xs gap-1"
                                             onClick={resetEmailTemplates}
                                             disabled={!emailDefaults}
                                          >
                                             <RotateCw className="h-3 w-3" />
                                             Reset to defaults
                                          </Button>
                                       </div>
                                       <p className="text-xs text-muted-foreground">
                                          Use{" "}
                                          <code className="bg-muted rounded px-1">
                                             {"{{firstName}}"}
                                          </code>
                                          ,{" "}
                                          <code className="bg-muted rounded px-1">
                                             {"{{lastName}}"}
                                          </code>
                                          ,{" "}
                                          <code className="bg-muted rounded px-1">
                                             {"{{jobTitle}}"}
                                          </code>
                                          ,{" "}
                                          <code className="bg-muted rounded px-1">
                                             {"{{recruiterName}}"}
                                          </code>
                                          ,{" "}
                                          <code className="bg-muted rounded px-1">
                                             {"{{interviewDetails}}"}
                                          </code>{" "}
                                          as placeholders.
                                       </p>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                       {/* Interview invitation */}
                                       <div className="space-y-3">
                                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                             Interview Invitation
                                          </p>
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                Subject
                                             </label>
                                             <Input
                                                value={interviewSubject}
                                                onChange={(e) => {
                                                   setInterviewSubject(
                                                      e.target.value,
                                                   );
                                                   setEmailDirty(true);
                                                }}
                                             />
                                          </div>
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                Body
                                             </label>
                                             <TrixEditor
                                                value={interviewBody}
                                                onChange={(html) => {
                                                   setInterviewBody(html);
                                                   setEmailDirty(true);
                                                }}
                                                placeholder="Write your interview invitation email…"
                                             />
                                          </div>
                                       </div>

                                       <div className="border-t" />

                                       {/* Regret letter */}
                                       <div className="space-y-3">
                                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                             Regret Letter
                                          </p>
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                Subject
                                             </label>
                                             <Input
                                                value={regretSubject}
                                                onChange={(e) => {
                                                   setRegretSubject(
                                                      e.target.value,
                                                   );
                                                   setEmailDirty(true);
                                                }}
                                             />
                                          </div>
                                          <div className="space-y-1.5">
                                             <label className="text-xs font-medium text-muted-foreground">
                                                Body
                                             </label>
                                             <TrixEditor
                                                value={regretBody}
                                                onChange={(html) => {
                                                   setRegretBody(html);
                                                   setEmailDirty(true);
                                                }}
                                                placeholder="Write your regret letter email…"
                                             />
                                          </div>
                                       </div>
                                    </CardContent>
                                 </Card>

                                 {/* Actions */}
                                 <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                       onClick={handleSaveEmail}
                                       disabled={savingEmail || !emailDirty}
                                    >
                                       {savingEmail ? (
                                          <>
                                             <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                             Saving…
                                          </>
                                       ) : (
                                          <>
                                             <Save className="h-3.5 w-3.5 mr-1.5" />
                                             Save email settings
                                          </>
                                       )}
                                    </Button>
                                    <Button
                                       variant="outline"
                                       onClick={() => setTestEmailOpen(true)}
                                       disabled={
                                          testingEmail || !emailSaved?.smtpHost
                                       }
                                       title={
                                          !emailSaved?.smtpHost
                                             ? "Save settings first before testing"
                                             : "Send a test email to your account"
                                       }
                                    >
                                       {testingEmail ? (
                                          <>
                                             <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                             Sending…
                                          </>
                                       ) : (
                                          <>
                                             <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                                             Send test email
                                          </>
                                       )}
                                    </Button>
                                 </div>
                              </div>

                              {/* Test email dialog */}
                              <Dialog
                                 open={testEmailOpen}
                                 onOpenChange={(open) => {
                                    setTestEmailOpen(open);
                                    if (!open) setTestEmailTo("");
                                 }}
                              >
                                 <DialogContent className="sm:max-w-sm">
                                    <DialogHeader>
                                       <DialogTitle>
                                          Send Test Email
                                       </DialogTitle>
                                    </DialogHeader>
                                    <p className="text-sm text-muted-foreground">
                                       Enter the recipient email address for the
                                       test email.
                                    </p>
                                    <Input
                                       type="email"
                                       placeholder="recipient@example.com"
                                       value={testEmailTo}
                                       onChange={(e) =>
                                          setTestEmailTo(e.target.value)
                                       }
                                       onKeyDown={(e) => {
                                          if (
                                             e.key === "Enter" &&
                                             testEmailTo.trim() &&
                                             !testingEmail
                                          )
                                             handleTestEmail();
                                       }}
                                       autoFocus
                                    />
                                    <div className="flex justify-end gap-2 pt-1">
                                       <Button
                                          variant="outline"
                                          onClick={() =>
                                             setTestEmailOpen(false)
                                          }
                                       >
                                          Cancel
                                       </Button>
                                       <Button
                                          onClick={handleTestEmail}
                                          disabled={
                                             !testEmailTo.trim() || testingEmail
                                          }
                                       >
                                          {testingEmail ? (
                                             <>
                                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                Sending…
                                             </>
                                          ) : (
                                             <>
                                                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                                                Send
                                             </>
                                          )}
                                       </Button>
                                    </div>
                                 </DialogContent>
                              </Dialog>

                              {/* Sidebar info */}
                              <div className="space-y-4">
                                 <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                       <Info className="h-4 w-4 text-primary" />
                                       <p className="text-xs font-semibold text-foreground">
                                          How it works
                                       </p>
                                    </div>
                                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside marker:text-primary/40 leading-relaxed">
                                       <li>
                                          Settings are saved per recruiter —
                                          each team member can configure their
                                          own sender.
                                       </li>
                                       <li>
                                          Emails are sent from the Shortlists
                                          page after you finalize candidates.
                                       </li>
                                       <li>
                                          Interview invitations go to selected
                                          candidates; regret letters go to
                                          rejected ones.
                                       </li>
                                       <li>
                                          Talent pool candidates also receive
                                          regret letters if requested.
                                       </li>
                                    </ul>
                                 </div>

                                 <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2.5">
                                    <p className="text-xs font-semibold text-amber-800">
                                       Security notice
                                    </p>
                                    <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside leading-relaxed">
                                       <li>
                                          Your SMTP password is encrypted with
                                          AES-256-GCM before being stored.
                                       </li>
                                       <li>
                                          The password is <strong>never</strong>{" "}
                                          returned in any API response.
                                       </li>
                                       <li>
                                          Leave the password field blank when
                                          saving to keep the existing password.
                                       </li>
                                       <li>
                                          Use an app-specific password where
                                          possible (e.g. Gmail).
                                       </li>
                                    </ul>
                                 </div>

                                 <div className="rounded-xl border p-4 space-y-2.5">
                                    <p className="text-xs font-semibold text-foreground">
                                       Common provider ports
                                    </p>
                                    <table className="w-full text-xs">
                                       <thead>
                                          <tr className="text-left text-muted-foreground">
                                             <th className="pb-1 font-medium">
                                                Protocol
                                             </th>
                                             <th className="pb-1 font-medium">
                                                Port
                                             </th>
                                             <th className="pb-1 font-medium">
                                                TLS
                                             </th>
                                          </tr>
                                       </thead>
                                       <tbody className="space-y-0.5 text-muted-foreground">
                                          {[
                                             ["STARTTLS", "587", "Off"],
                                             ["SMTPS", "465", "On"],
                                             ["Plain (dev)", "25", "Off"],
                                          ].map(([proto, port, tls]) => (
                                             <tr key={proto}>
                                                <td className="py-0.5">
                                                   {proto}
                                                </td>
                                                <td className="py-0.5 tabular-nums">
                                                   {port}
                                                </td>
                                                <td className="py-0.5">
                                                   {tls}
                                                </td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  {active === "account" && (
                     <div className="space-y-6">
                        <div>
                           <h2 className="text-base font-semibold text-foreground">
                              Account
                           </h2>
                           <p className="text-sm text-muted-foreground mt-1">
                              Your profile and role on this platform.
                           </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           <Card className="lg:col-span-2">
                              <CardContent className="pt-6">
                                 <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
                                       {user?.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                       <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-base font-semibold text-foreground">
                                             {user?.name}
                                          </p>
                                          <Badge
                                             className={cn(
                                                "capitalize text-xs border",
                                                user?.role === "admin"
                                                   ? "bg-amber-100 text-amber-700 border-amber-200"
                                                   : user?.role === "recruiter"
                                                     ? "bg-primary/10 text-primary border-primary/20"
                                                     : "bg-secondary text-secondary-foreground",
                                             )}
                                          >
                                             {user?.role}
                                          </Badge>
                                       </div>
                                       <p className="text-sm text-muted-foreground">
                                          {user?.email}
                                       </p>
                                    </div>
                                 </div>

                                 <div className="mt-6 pt-5 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-0.5">
                                       <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                          Role
                                       </p>
                                       <p className="text-sm font-medium text-foreground capitalize">
                                          {user?.role}
                                       </p>
                                    </div>
                                    <div className="space-y-0.5">
                                       <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                          Settings scope
                                       </p>
                                       <p className="text-sm font-medium text-foreground">
                                          Per-account (private)
                                       </p>
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>

                           <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 space-y-2 h-fit">
                              <div className="flex items-center gap-2">
                                 <Info className="h-4 w-4 text-primary" />
                                 <p className="text-xs font-semibold text-foreground">
                                    Settings scope
                                 </p>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                 All AI screening settings are saved per
                                 recruiter. Different team members can configure
                                 their own scoring weights and instructions
                                 independently.
                              </p>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}
