"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { GoogleAuthButton } from "@/components/ui/google-auth-button";
import { useLogin } from "@/services/auth.service";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
   email: z.string().email("Invalid email"),
   password: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

const OAUTH_ERRORS: Record<string, string> = {
   no_account:
      "No account found with that Google email. Please contact an admin to get access.",
   oauth_failed: "Google sign-in failed. Please try again.",
   oauth_cancelled: "Google sign-in was cancelled.",
};

export default function LoginPage() {
   return (
      <Suspense>
         <LoginForm />
      </Suspense>
   );
}

function LoginForm() {
   const router = useRouter();
   const searchParams = useSearchParams();
   const { toast } = useToast();
   const login = useLogin();

   const oauthError = searchParams.get("error");
   const oauthErrorMsg = oauthError
      ? (OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again.")
      : null;

   const {
      register,
      handleSubmit,
      formState: { errors },
   } = useForm<FormValues>({ resolver: zodResolver(schema) });

   const onSubmit = async (data: FormValues) => {
      try {
         await login.mutateAsync(data);
         router.push("/dashboard");
      } catch (err: unknown) {
         const msg =
            (err as { response?: { data?: { message?: string } } })?.response
               ?.data?.message ?? "Invalid credentials";
         toast({
            title: "Login failed",
            description: msg,
            variant: "destructive",
         });
      }
   };

   return (
      <div className="w-full">
         <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
               Sign in to your Umurava HR account
            </p>
         </div>

         {oauthErrorMsg && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
               <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-destructive mt-0.5" />
               <p className="text-sm text-destructive leading-snug">
                  {oauthErrorMsg}
               </p>
            </div>
         )}

         <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
         >
            <div className="space-y-2">
               <Label htmlFor="email">Email address</Label>
               <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...register("email")}
               />
               {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                     <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                     {errors.email.message}
                  </p>
               )}
            </div>

            <div className="space-y-2">
               <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
               </div>
               <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
               />
               {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                     <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                     {errors.password.message}
                  </p>
               )}
            </div>

            <Button
               type="submit"
               className="w-full mt-2"
               size="lg"
               disabled={login.isPending}
            >
               {login.isPending ? (
                  <>
                     <Loader2 className="h-4 w-4 animate-spin" />
                     Signing in…
                  </>
               ) : (
                  "Sign in"
               )}
            </Button>
         </form>

         <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
         </div>

         <div className="mt-4">
            <GoogleAuthButton label="Sign in with Google" />
         </div>

         <p className="mt-5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account? contact the Umurava admin to register
            you
         </p>
      </div>
   );
}
