"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
   Trash2,
   Globe,
   Layers,
   Download,
   MoreVertical,
   ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataPagination } from "@/components/ui/data-pagination";
import { exportToCsv } from "@/lib/exportCsv";
import type { Applicant, PaginatedData } from "@/types";

interface ApplicantTableProps {
   data?: PaginatedData<Applicant>;  // ✅ Now matches your type
   isLoading?: boolean;
   onDelete?: (id: string) => void;
   isDeleting?: boolean;
   onPageChange?: (page: number) => void;
   onPageSizeChange?: (limit: number) => void;
   page: number;
   limit: number;
}

export function ApplicantTable({
   data,
   isLoading,
   onDelete,
   isDeleting,
   onPageChange,
   onPageSizeChange,
   page,
   limit,
}: ApplicantTableProps) {
   const router = useRouter();
   const [currentPage, setCurrentPage] = useState(page);
   const [currentLimit, setCurrentLimit] = useState(limit);

   // Sync with parent props
   useEffect(() => {
      setCurrentPage(page);
   }, [page]);

   useEffect(() => {
      setCurrentLimit(limit);
   }, [limit]);

   // ✅ Access data using your actual structure
   const applicants = data?.items ?? [];
   const total = data?.meta?.total ?? 0;
   const totalPages = data?.meta?.totalPages ?? 0;
   const currentPageFromMeta = data?.meta?.page ?? currentPage;
   const currentLimitFromMeta = data?.meta?.limit ?? currentLimit;

   function handlePageChange(newPage: number) {
      setCurrentPage(newPage);
      onPageChange?.(newPage);
   }

   function handlePageSizeChange(newLimit: number) {
      setCurrentLimit(newLimit);
      onPageSizeChange?.(newLimit);
      setCurrentPage(1); // Reset to first page when changing page size
   }

   function handleExport() {
      if (!applicants.length) return;
      
      exportToCsv(
         "applicants",
         applicants.map((a) => ({
            "First Name": a.profile.firstName,
            "Last Name": a.profile.lastName,
            Email: a.profile.email,
            Headline: a.profile.headline ?? "",
            Location: a.profile.location ?? "",
            Source: a.source,
            Added: new Date(a.createdAt).toLocaleDateString(),
         })),
      );
   }

   // Loading state
   if (isLoading) {
      return (
         <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
               <thead>
                  <tr className="border-b">
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Name
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hidden sm:table-cell">
                        Headline
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hidden md:table-cell">
                        Location
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Source
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hidden lg:table-cell">
                        Added
                     </th>
                     {onDelete && (
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                           Actions
                        </th>
                     )}
                  </tr>
               </thead>
               <tbody>
                  {Array.from({ length: currentLimit }).map((_, i) => (
                     <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-3.5">
                           <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                              <div className="space-y-1.5">
                                 <div className="h-3.5 w-28 bg-muted animate-pulse rounded" />
                                 <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                           <div className="h-3.5 w-40 bg-muted animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                           <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3.5">
                           <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                           <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
                        </td>
                        {onDelete && <td className="px-4 py-3.5" />}
                     </tr>
                  ))}
               </tbody>
             </table>
         </div>
      );
   }

   // Empty state
   if (!applicants.length && !isLoading) {
      return (
         <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground rounded-xl border border-dashed">
            <Layers className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No applicants yet</p>
            <p className="text-xs mt-1 max-w-xs">
               Add platform profiles or upload a spreadsheet using the tabs
               above.
            </p>
         </div>
      );
   }

   return (
      <div className="rounded-xl border overflow-hidden">
         {/* Toolbar */}
         <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-background">
            <p className="text-xs text-muted-foreground">
               {total} applicant{total !== 1 ? "s" : ""}
            </p>
            {applicants.length > 0 && (
               <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleExport}
               >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
               </Button>
            )}
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead>
                  <tr className="border-b">
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Name
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hidden sm:table-cell">
                        Headline
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hidden md:table-cell">
                        Location
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Source
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hidden lg:table-cell">
                        Added
                     </th>
                     {onDelete && (
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                           Actions
                        </th>
                     )}
                   </tr>
               </thead>
               <tbody>
                  {applicants.map((a) => {
                     const initials =
                        `${a.profile.firstName?.[0] ?? ""}${a.profile.lastName?.[0] ?? ""}`.toUpperCase();
                     return (
                        <tr
                           key={a._id}
                           className="group border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                           onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest("[data-action-menu]")) return;
                              router.push(`/applicants/${a._id}`);
                           }}
                        >
                           <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                 <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                    {initials}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="font-medium truncate flex items-center gap-1">
                                       {a.profile.firstName}{" "}
                                       {a.profile.lastName}
                                       <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                       {a.profile.email}
                                    </p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell max-w-48 truncate">
                              {a.profile.headline}
                           </td>
                           <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">
                              {a.profile.location}
                           </td>
                           <td className="px-4 py-3.5">
                              <Badge
                                 variant={
                                    a.source === "platform"
                                       ? "default"
                                       : "secondary"
                                 }
                                 className="gap-1"
                              >
                                 {a.source === "platform" ? (
                                    <Layers className="h-3 w-3" />
                                 ) : (
                                    <Globe className="h-3 w-3" />
                                 )}
                                 {a.source}
                              </Badge>
                           </td>
                           <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell text-sm">
                              {formatDistanceToNow(new Date(a.createdAt), {
                                 addSuffix: true,
                              })}
                           </td>
                           {onDelete && (
                              <td
                                 className="px-4 py-3 text-right"
                                 data-action-menu
                              >
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-auto">
                                          <MoreVertical className="h-4 w-4" />
                                       </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                       align="end"
                                       className="w-36"
                                    >
                                       <DropdownMenuItem
                                          disabled={isDeleting}
                                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                          onClick={() => onDelete(a._id)}
                                       >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Remove
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </td>
                           )}
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>

         {/* ✅ Pagination using meta data */}
         {totalPages > 1 && (
            <div className="border-t px-4 py-1">
               <DataPagination
                  page={currentPage}
                  pageSize={currentLimit}
                  total={total}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
               />
            </div>
         )}
      </div>
   );
}