"use client";

import { useState } from "react";
import { Copy, Check, Mail, Loader2, UserPlus } from "lucide-react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSendInvite } from "@/services/invite.service";

interface InviteModalProps {
   open:      boolean;
   onClose:   () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
   const { toast }      = useToast();
   const sendInvite     = useSendInvite();
   const [email, setEmail]       = useState("");
   const [result, setResult]     = useState<{ inviteLink: string; emailSent: boolean } | null>(null);
   const [copied, setCopied]     = useState(false);
   const [emailError, setEmailError] = useState("");

   function validateEmail(v: string) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
   }

   async function handleSend() {
      setEmailError("");
      if (!email.trim() || !validateEmail(email)) {
         setEmailError("Please enter a valid email address");
         return;
      }

      try {
         const data = await sendInvite.mutateAsync(email.trim().toLowerCase());
         setResult(data);
         if (data.emailSent) {
            toast({ title: "Invite sent!", description: `Email delivered to ${email}` });
         } else {
            toast({
               title: "Invite created",
               description: "Email could not be sent — copy the link below to share manually.",
               variant: "destructive",
            });
         }
      } catch (err: unknown) {
         const msg = (err as any)?.response?.data?.message ?? "Failed to create invite";
         toast({ title: "Error", description: msg, variant: "destructive" });
      }
   }

   async function handleCopy() {
      if (!result) return;
      await navigator.clipboard.writeText(result.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Invite link copied to clipboard" });
   }

   function handleClose() {
      setEmail("");
      setResult(null);
      setCopied(false);
      setEmailError("");
      onClose();
   }

   return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Invite Recruiter
               </DialogTitle>
               <DialogDescription>
                  Send a one-time invite link. The recipient has 48 hours to register.
               </DialogDescription>
            </DialogHeader>

            {!result ? (
               <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                     <Label htmlFor="invite-email">Email address</Label>
                     <Input
                        id="invite-email"
                        type="email"
                        placeholder="recruiter@company.com"
                        value={email}
                        onChange={(e) => {
                           setEmail(e.target.value);
                           setEmailError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        disabled={sendInvite.isPending}
                        autoFocus
                     />
                     {emailError && (
                        <p className="text-xs text-destructive">{emailError}</p>
                     )}
                  </div>

                  <div className="flex gap-2 justify-end">
                     <Button variant="outline" onClick={handleClose} disabled={sendInvite.isPending}>
                        Cancel
                     </Button>
                     <Button onClick={handleSend} disabled={sendInvite.isPending} className="gap-1.5">
                        {sendInvite.isPending ? (
                           <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                        ) : (
                           <><Mail className="h-4 w-4" /> Send Invite</>
                        )}
                     </Button>
                  </div>
               </div>
            ) : (
               <div className="space-y-4 pt-2">
                  {/* Status */}
                  <div className={`flex items-start gap-2.5 rounded-lg p-3 text-sm ${
                     result.emailSent
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                     <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                     <span>
                        {result.emailSent
                           ? `Invite email sent to ${email}`
                           : `Email could not be delivered — share the link below manually`}
                     </span>
                  </div>

                  {/* Copy link */}
                  <div className="space-y-1.5">
                     <Label>Invite link</Label>
                     <div className="flex gap-2">
                        <Input
                           value={result.inviteLink}
                           readOnly
                           className="text-xs font-mono bg-muted"
                        />
                        <Button
                           variant="outline"
                           size="icon"
                           onClick={handleCopy}
                           className="shrink-0"
                        >
                           {copied
                              ? <Check className="h-4 w-4 text-emerald-600" />
                              : <Copy className="h-4 w-4" />}
                        </Button>
                     </div>
                     <p className="text-xs text-muted-foreground">
                        Valid for 48 hours · single use only
                     </p>
                  </div>

                  <div className="flex gap-2 justify-end">
                     <Button variant="outline" onClick={() => { setResult(null); setEmail(""); }}>
                        Invite another
                     </Button>
                     <Button onClick={handleClose}>Done</Button>
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>
   );
}