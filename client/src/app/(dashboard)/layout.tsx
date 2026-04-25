"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { DashboardShell } from "@/components/layout/DashboardShell";

const ALLOWED_ROLES = ["candidate", "recruiter", "admin"] as const;

/** Pages only accessible to admins */
const ADMIN_ONLY_PATHS = ["/admin"];
const RECRUITER_ONLY_PATHS = [
   "/applicants",
   "/screening",
   "/shortlists",
   "/talent-pool",
];

export default function DashboardLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const router = useRouter();
   const pathname = usePathname();
   const { token, user } = useAppSelector((s) => s.auth);

   useEffect(() => {
      if (!token || !user) {
         router.replace("/login");
         return;
      }
      // If user role is not in the allowed list, redirect to unauthorized
      if (
         !ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])
      ) {
         router.replace("/unauthorized");
         return;
      }
      // Admin-only pages: redirect non-admins
      const isAdminPage = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
      if (isAdminPage && user.role !== "admin") {
         router.replace("/unauthorized");
      }

      // recruiter-only pages: redirect candidates
      const isRecruiterPage = RECRUITER_ONLY_PATHS.some((p) =>
         pathname.includes(p),
      );
      if (isRecruiterPage && user.role == "candidate") {
         router.replace("/unauthorized");
      }
   }, [token, user, router, pathname]);

   if (!token || !user) return null;
   if (!ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number]))
      return null;

   return <DashboardShell>{children}</DashboardShell>;
}
