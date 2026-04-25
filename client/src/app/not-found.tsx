"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

function UmuravaLogo({ className }: { className?: string }) {
   return (
      <svg
         viewBox="0 0 52 36"
         fill="none"
         className={className}
      >
         <path
            d="M28 6 A 13 13 0 1 1 28 30"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
         />
         <path
            d="M24 30 A 13 13 0 1 1 24 6"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
         />
      </svg>
   );
}

export default function NotFound() {
   const router = useRouter();

   return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
         {/* Background decoration */}
         <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-150 w-150 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
         </div>

         <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
            {/* Logo */}
            <Link
               href="/"
               className="mb-8 flex items-center gap-2 text-primary"
            >
               <UmuravaLogo className="h-7 w-auto" />
               <span className="font-bold text-base tracking-tight text-foreground">
                  Umurava HR
               </span>
            </Link>

            {/* 404 illustration */}
            <div className="relative mb-8 select-none">
               {/* Giant dimmed number */}
               <div
                  className="text-[11rem] sm:text-[13rem] font-black leading-none tracking-tighter"
                  style={{
                     background:
                        "linear-gradient(180deg, hsl(var(--primary)/0.15) 0%, hsl(var(--primary)/0.05) 100%)",
                     WebkitBackgroundClip: "text",
                     WebkitTextFillColor: "transparent",
                     backgroundClip: "text",
                  }}
               >
                  404
               </div>

               {/* Floating search icon in the middle zero */}
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-lg backdrop-blur-sm">
                     <Search className="h-7 w-7 text-primary" />
                  </div>
               </div>
            </div>

            {/* Text */}
            <h1 className="text-2xl font-bold tracking-tight mb-2">
               Page not found
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
               Looks like this URL doesn&apos;t exist or has been moved. Check
               the address and try again.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
               <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="gap-2"
               >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
               </Button>
               <Button
                  asChild
                  className="gap-2"
               >
                  <Link href="/dashboard">
                     <Home className="h-4 w-4" />
                     Back to Dashboard
                  </Link>
               </Button>
            </div>

            {/* Bottom hint */}
            <p className="mt-8 text-xs text-muted-foreground">
               Need help?{" "}
               <Link
                  href="/login"
                  className="text-primary hover:underline"
               >
                  Return to sign in
               </Link>
            </p>
         </div>
      </div>
   );
}
