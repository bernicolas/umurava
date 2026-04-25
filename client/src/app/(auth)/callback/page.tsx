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
         const user = JSON.parse(userRaw);
         dispatch(setCredentials({ token, user }));
         router.replace("/dashboard");
      } catch {
         router.replace("/login?error=oauth_failed");
      }
   }, [dispatch, params, router]);

   const hasError = params.get("error");

   if (hasError) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 py-10">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
               Authentication failed. Redirecting…
            </p>
         </div>
      );
   }

   return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
   );
}

export default function AuthCallbackPage() {
   return (
      <Suspense
         fallback={
            <div className="flex flex-col items-center justify-center gap-3 py-10">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
               <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
         }
      >
         <CallbackInner />
      </Suspense>
   );
}
