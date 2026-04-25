"use client";

import Link from "next/link";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
   return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
         <div className="text-center space-y-6 max-w-md">
            <div className="flex justify-center">
               <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <ShieldOff className="h-10 w-10 text-destructive" />
               </div>
            </div>

            <div className="space-y-2">
               <h1 className="text-2xl font-bold text-foreground">
                  Access Denied
               </h1>
               <p className="text-muted-foreground text-sm leading-relaxed">
                  You don&apos;t have permission to view this page. Please
                  contact your administrator if you believe this is a mistake.
               </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
               <Link href="/dashboard">
                  <Button
                     variant="default"
                     className="gap-2"
                  >
                     <ArrowLeft className="h-4 w-4" />
                     Back to Dashboard
                  </Button>
               </Link>
               <Link href="/login">
                  <Button variant="outline">
                     Sign in with another account
                  </Button>
               </Link>
            </div>
         </div>
      </div>
   );
}
