"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useRegister } from "@/services/auth.service";
import { verifyInviteToken, markInviteUsed } from "@/services/invite.service";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
   name:     z.string().min(2, "At least 2 characters"),
   password: z.string().min(8, "At least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

type VerifyState = "checking" | "valid" | "invalid";

export default function RegisterPage() {
   const searchParams = useSearchParams();
   const router       = useRouter();
   const { toast }    = useToast();
   const register_    = useRegister();

   const code  = searchParams.get("code")  ?? "";
   const email = searchParams.get("email") ?? "";

   const [verifyState, setVerifyState] = useState<VerifyState>("checking");
   const [errorMsg,    setErrorMsg]    = useState("");

   // Validate the invite token on page load
   useEffect(() => {
      if (!code || !email) {
         setVerifyState("invalid");
         setErrorMsg("This registration link is invalid or incomplete.");
         return;
      }

      verifyInviteToken(code, email)
         .then(() => setVerifyState("valid"))
         .catch((err: unknown) => {
            const msg =
               (err as any)?.response?.data?.message ??
               "This invite link is invalid or has expired.";
            setVerifyState("invalid");
            setErrorMsg(msg);
         });
   }, [code, email]);

   const {
      register,
      handleSubmit,
      formState: { errors },
   } = useForm<FormValues>({ resolver: zodResolver(schema) });

   const onSubmit = async (data: FormValues) => {
      try {
         await register_.mutateAsync({
            name:     data.name,
            email,
            password: data.password,
            role:     "recruiter",
         });

         // Mark invite as consumed so it can't be reused
         await markInviteUsed(code, email).catch(() => {
            // Non-fatal — token will expire naturally
         });

         toast({ title: "Welcome!", description: "Your account has been created." });
         router.push("/dashboard");
      } catch (err: unknown) {
         const msg =
            (err as any)?.response?.data?.message ?? "Registration failed";
         toast({ title: "Error", description: msg, variant: "destructive" });
      }
   };

   // ── Loading state ─────────────────────────────────────────────────────────
   if (verifyState === "checking") {
      return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validating your invite…</p>
         </div>
      );
   }

   // ── Invalid / expired invite ──────────────────────────────────────────────
   if (verifyState === "invalid") {
      return (
         <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
               <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <div>
               <p className="font-semibold text-foreground">Invalid Invite</p>
               <p className="text-sm text-muted-foreground mt-1 max-w-xs">{errorMsg}</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/login")}>
               Back to login
            </Button>
         </div>
      );
   }

   // ── Valid invite — show registration form ─────────────────────────────────
   return (
      <div className="w-full">
         <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
               Complete your registration
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
               You've been invited to join as a recruiter
            </p>
         </div>

         <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email — pre-filled and locked from the invite link */}
            <div className="space-y-1.5">
               <Label htmlFor="email">Email (verified)</Label>
               <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
               />
            </div>

            <div className="space-y-1.5">
               <Label htmlFor="name">Full name</Label>
               <Input id="name" placeholder="Jane Smith" {...register("name")} />
               {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
               )}
            </div>

            <div className="space-y-1.5">
               <Label htmlFor="password">Password</Label>
               <PasswordInput id="password" {...register("password")} />
               {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
               )}
            </div>

            <Button
               type="submit"
               className="w-full"
               disabled={register_.isPending}
            >
               {register_.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
               )}
               Create account
            </Button>
         </form>
      </div>
   );
}