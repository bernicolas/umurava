"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

   import { InviteModal } from "./invite/inviteModel";
import {
   ShieldCheck,
   Users,
   Search,
   Loader2,
   Download,
   MoreVertical,
   UserCog,
   UserMinus,
   UserPlus,
} from "lucide-react";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataPagination } from "@/components/ui/data-pagination";
import { exportToCsv } from "@/lib/exportCsv";
import { useAppSelector } from "@/store/hooks";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types";
import Link from "next/link";

interface AdminUser {
   _id: string;
   name: string;
   email: string;
   role: "recruiter" | "admin";
   avatar?: string;
   createdAt: string;
}

interface UsersResponse {
   users: AdminUser[];
   total: number;
   page: number;
   limit: number;
   pages: number;
}

function useAdminUsers(page: number) {
   return useQuery({
      queryKey: ["admin-users", page],
      queryFn: async () => {
         const res = await api.get<ApiResponse<UsersResponse>>(
            `/admin/users?page=${page}&limit=20`,
         );
         return res.data.data!;
      },
   });
}

function useUpdateRole() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async ({ id, role }: { id: string; role: string }) => {
         const res = await api.patch<ApiResponse<AdminUser>>(
            `/admin/users/${id}/role`,
            { role },
         );
         return res.data.data!;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: ["admin-users"] });
      },
   });
}

const ROLE_STYLES: Record<string, string> = {
   admin: "bg-amber-100 text-amber-700 border-amber-200",
   recruiter: "bg-violet-100 text-violet-700 border-violet-200",
};

export default function AdminPage() {
   const [inviteOpen, setInviteOpen] = useState(false);
   const router = useRouter();
   const user = useAppSelector((s) => s.auth.user);
   const [page, setPage] = useState(1);
   const [search, setSearch] = useState("");

   // Client-side role guard
   useEffect(() => {
      if (user && user.role !== "admin") {
         router.replace("/unauthorized");
      }
   }, [user, router]);

   const { data, isLoading, isError } = useAdminUsers(page);
   const updateRole = useUpdateRole();

   if (!user || user.role !== "admin") return null;

   const filtered = data?.users.filter(
      (u) =>
         !search ||
         u.name.toLowerCase().includes(search.toLowerCase()) ||
         u.email.toLowerCase().includes(search.toLowerCase()),
   );

   function toggleRole(u: AdminUser) {
      const newRole = u.role === "admin" ? "recruiter" : "admin";
      updateRole.mutate({ id: u._id, role: newRole });
   }

   return (
      <div className="flex flex-col min-h-screen">
         <Header title="Admin Panel" />

         <main className="flex-1 p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <Card>
                  <CardContent className="pt-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-violet-600" />
                     </div>
                     <div>
                        <p className="text-2xl font-bold text-foreground">
                           {isLoading ? "—" : (data?.total ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                           Total Users
                        </p>
                     </div>
                  </CardContent>
               </Card>
               <Card>
                  <CardContent className="pt-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-5 w-5 text-amber-600" />
                     </div>
                     <div>
                        <p className="text-2xl font-bold text-foreground">
                           {isLoading
                              ? "—"
                              : (data?.users.filter((u) => u.role === "admin")
                                   .length ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Admins</p>
                     </div>
                  </CardContent>
               </Card>
               <Card>
                  <CardContent className="pt-5 flex items-center gap-4">
                     <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-emerald-600" />
                     </div>
                     <div>
                        <p className="text-2xl font-bold text-foreground">
                           {isLoading
                              ? "—"
                              : (data?.users.filter(
                                   (u) => u.role === "recruiter",
                                ).length ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                           Recruiters
                        </p>
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* User table */}
            <Card className="overflow-hidden p-0">
               {/* Toolbar — fused to top of table */}
               <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 border-b">
                  <p className="text-sm font-semibold text-foreground flex-1">
                     User Management
                  </p>
                  <div className="flex items-center gap-2">
                     <div className="relative w-full sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                           placeholder="Search users..."
                           className="pl-9 h-8 text-xs"
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                        />
                     </div>
                   
                       <>
   <Button
      variant="default"
      size="sm"
      className="h-8 gap-1.5 text-xs shrink-0"
      onClick={() => setInviteOpen(true)}
   >
      <UserPlus className="h-3.5 w-3.5" />
      Invite Recruiter
   </Button>
 
   <InviteModal
      open={inviteOpen}
      onClose={() => setInviteOpen(false)}
   />
</>
                     
                  </div>
               </div>
               <div>
                  {isLoading ? (
                     <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                     </div>
                  ) : isError ? (
                     <p className="text-center py-12 text-sm text-destructive">
                        Failed to load users.
                     </p>
                  ) : (
                     <>
                        <div className="overflow-x-auto">
                           <table className="w-full text-sm">
                              <thead>
                                 <tr className="border-b">
                                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                                       User
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hidden sm:table-cell">
                                       Email
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                                       Role
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 hidden md:table-cell">
                                       Joined
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 text-right">
                                       Actions
                                    </th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {(filtered ?? []).map((u) => (
                                    <tr
                                       key={u._id}
                                       className="border-b last:border-0 hover:bg-muted/20 transition-colors group"
                                    >
                                       <td className="px-6 py-3.5">
                                          <div className="flex items-center gap-3">
                                             <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                                                {u.name.charAt(0).toUpperCase()}
                                             </div>
                                             <span className="font-medium text-foreground truncate max-w-40">
                                                {u.name}
                                             </span>
                                          </div>
                                       </td>
                                       <td className="px-4 py-3.5 text-muted-foreground text-xs truncate max-w-48 hidden sm:table-cell">
                                          {u.email}
                                       </td>
                                       <td className="px-4 py-3.5">
                                          <Badge
                                             className={cn(
                                                "capitalize border font-medium text-xs",
                                                ROLE_STYLES[u.role] ??
                                                   "bg-secondary text-secondary-foreground",
                                             )}
                                          >
                                             {u.role}
                                          </Badge>
                                       </td>
                                       <td className="px-4 py-3.5 text-muted-foreground text-xs hidden md:table-cell">
                                          {new Date(
                                             u.createdAt,
                                          ).toLocaleDateString("en-US", {
                                             month: "short",
                                             day: "numeric",
                                             year: "numeric",
                                          })}
                                       </td>
                                       <td className="px-4 py-3">
                                          <div className="flex items-center justify-end gap-1.5">
                                             {u._id === user.id ? (
                                                <span className="text-xs text-muted-foreground italic px-2">
                                                   You
                                                </span>
                                             ) : (
                                                <>
                                                   <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="h-7 px-3 text-xs font-medium"
                                                      disabled={
                                                         updateRole.isPending &&
                                                         updateRole.variables
                                                            ?.id === u._id
                                                      }
                                                      onClick={() =>
                                                         toggleRole(u)
                                                      }
                                                   >
                                                      {updateRole.isPending &&
                                                      updateRole.variables
                                                         ?.id === u._id ? (
                                                         <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : u.role === "admin" ? (
                                                         "Demote"
                                                      ) : (
                                                         "Promote"
                                                      )}
                                                   </Button>
                                                   <DropdownMenu>
                                                      <DropdownMenuTrigger
                                                         asChild
                                                      >
                                                         <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                                            <MoreVertical className="h-4 w-4" />
                                                         </button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent
                                                         align="end"
                                                         className="w-44"
                                                      >
                                                         <DropdownMenuLabel>
                                                            {u.name}
                                                         </DropdownMenuLabel>
                                                         <DropdownMenuSeparator />
                                                         <DropdownMenuItem
                                                            disabled={
                                                               updateRole.isPending
                                                            }
                                                            onClick={() =>
                                                               toggleRole(u)
                                                            }
                                                         >
                                                            {u.role ===
                                                            "admin" ? (
                                                               <>
                                                                  <UserMinus className="h-3.5 w-3.5" />{" "}
                                                                  Demote to
                                                                  Recruiter
                                                               </>
                                                            ) : (
                                                               <>
                                                                  <UserCog className="h-3.5 w-3.5" />{" "}
                                                                  Promote to
                                                                  Admin
                                                               </>
                                                            )}
                                                         </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                   </DropdownMenu>
                                                </>
                                             )}
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>

                        {/* Pagination */}
                        {data && data.pages > 1 && (
                           <div className="border-t px-4 py-1">
                              <DataPagination
                                 page={page}
                                 pageSize={data.limit}
                                 total={data.total}
                                 onPageChange={setPage}
                              />
                           </div>
                        )}
                     </>
                  )}
               </div>
            </Card>
         </main>
      </div>
   );
}

