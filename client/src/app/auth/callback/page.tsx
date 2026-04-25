"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";

function CallbackInner() {
   const router = useRouter();
   const params = useSearchParams();
   const dispatch = useAppDispatch();
   const ran = useRef(false);

   useEffect(() => {
      if (ran.current) return;
      ran.current = true;

      const token = params.get("token");
      const userRaw = params.get("user");
      const error = params.get("error");

      if (error || !token || !userRaw) {
         router.replace(
            `/login?error=${encodeURIComponent(error ?? "oauth_failed")}`,
         );
         return;
      }

      try {
         const user = JSON.parse(decodeURIComponent(userRaw));
         dispatch(setCredentials({ token, user }));
         router.replace("/dashboard");
      } catch {
         router.replace("/login?error=oauth_failed");
      }
   }, [dispatch, params, router]);

   const hasError = params.get("error");

   if (hasError) {
      return (
         <div className="flex flex-col items-center justify-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
               Authentication failed. Redirecting…
            </p>
         </div>
      );
   }

   return (
      <div className="flex flex-col items-center justify-center gap-4">
         <div className="relative">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
         </div>
         <div className="text-center">
            <p className="text-sm font-medium">Signing you in…</p>
            <p className="text-xs text-muted-foreground mt-1">Just a moment</p>
         </div>
      </div>
   );
}

export default function AuthCallbackPage() {
   return (
      <div className="min-h-screen flex items-center justify-center bg-background">
         <Suspense
            fallback={
               <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading…</p>
               </div>
            }
         >
            <CallbackInner />
         </Suspense>
      </div>
   );
}
