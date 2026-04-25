"use client";

import {
   ChevronLeft,
   ChevronRight,
   ChevronsLeft,
   ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPaginationProps {
   page: number;
   pageSize: number;
   total: number;
   onPageChange: (page: number) => void;
   onPageSizeChange?: (size: number) => void;
   pageSizeOptions?: number[];
   className?: string;
}

export function DataPagination({
   page,
   pageSize,
   total,
   onPageChange,
   onPageSizeChange,
   pageSizeOptions = [10, 20, 50],
   className,
}: DataPaginationProps) {
   const totalPages = Math.max(1, Math.ceil(total / pageSize));
   const from = Math.min((page - 1) * pageSize + 1, total);
   const to = Math.min(page * pageSize, total);

   // Build page number window: always show first, last, current ±1, plus ellipsis
   const buildPages = () => {
      if (totalPages <= 7)
         return Array.from({ length: totalPages }, (_, i) => i + 1);
      const pages: (number | "…")[] = [];
      const addPage = (p: number) => {
         if (!pages.includes(p)) pages.push(p);
      };
      addPage(1);
      if (page - 2 > 2) pages.push("…");
      for (
         let p = Math.max(2, page - 1);
         p <= Math.min(totalPages - 1, page + 1);
         p++
      )
         addPage(p);
      if (page + 2 < totalPages - 1) pages.push("…");
      addPage(totalPages);
      return pages;
   };

   const pages = buildPages();

   return (
      <div
         className={cn(
            "flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-2 text-sm",
            className,
         )}
      >
         <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {total > 0 ? (
               <span>
                  {from}–{to} of{" "}
                  <span className="font-medium text-foreground">{total}</span>
               </span>
            ) : (
               <span>0 results</span>
            )}
            {onPageSizeChange && (
               <div className="flex items-center gap-1.5 ml-2">
                  <span>per page</span>
                  <select
                     value={pageSize}
                     onChange={(e) => {
                        onPageSizeChange(Number(e.target.value));
                        onPageChange(1);
                     }}
                     className="rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                     {pageSizeOptions.map((s) => (
                        <option
                           key={s}
                           value={s}
                        >
                           {s}
                        </option>
                     ))}
                  </select>
               </div>
            )}
         </div>

         {totalPages > 1 && (
            <div className="flex items-center gap-1">
               <PageBtn
                  onClick={() => onPageChange(1)}
                  disabled={page === 1}
                  title="First page"
               >
                  <ChevronsLeft className="h-3.5 w-3.5" />
               </PageBtn>
               <PageBtn
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  title="Previous page"
               >
                  <ChevronLeft className="h-3.5 w-3.5" />
               </PageBtn>

               {pages.map((p, i) =>
                  p === "…" ? (
                     <span
                        key={`ellipsis-${i}`}
                        className="px-1.5 text-muted-foreground text-xs"
                     >
                        …
                     </span>
                  ) : (
                     <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={cn(
                           "h-7 min-w-7 px-1.5 rounded-md text-xs font-medium transition-colors",
                           page === p
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-foreground",
                        )}
                     >
                        {p}
                     </button>
                  ),
               )}

               <PageBtn
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                  title="Next page"
               >
                  <ChevronRight className="h-3.5 w-3.5" />
               </PageBtn>
               <PageBtn
                  onClick={() => onPageChange(totalPages)}
                  disabled={page >= totalPages}
                  title="Last page"
               >
                  <ChevronsRight className="h-3.5 w-3.5" />
               </PageBtn>
            </div>
         )}
      </div>
   );
}

function PageBtn({
   onClick,
   disabled,
   children,
   title,
}: {
   onClick: () => void;
   disabled: boolean;
   children: React.ReactNode;
   title?: string;
}) {
   return (
      <button
         onClick={onClick}
         disabled={disabled}
         title={title}
         className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
         {children}
      </button>
   );
}
