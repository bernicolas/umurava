import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ApiResponse, PaginatedData, TalentPoolEntry } from "@/types";

export function useTalentPool(params?: {
   page?: number;
   limit?: number;
   jobId?: string;
   status?: string;
}) {
   const qp = new URLSearchParams();
   if (params?.page) qp.set("page", String(params.page));
   if (params?.limit) qp.set("limit", String(params.limit));
   if (params?.jobId) qp.set("jobId", params.jobId);
   if (params?.status) qp.set("status", params.status);

   const queryString = qp.toString();

   return useQuery({
      queryKey: ["talent-pool", params],
      queryFn: async (): Promise<PaginatedData<TalentPoolEntry>> => {
         const res = await api.get<ApiResponse<PaginatedData<TalentPoolEntry>>>(
            `/talent-pool${queryString ? `?${queryString}` : ""}`,
         );
         return (
            res.data.data ?? {
               items: [],
               meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
            }
         );
      },
      staleTime: 60_000,
   });
}

export function useUpdateTalentPoolEntry() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async ({
         id,
         notes,
         status,
      }: {
         id: string;
         notes?: string;
         status?: string;
      }): Promise<TalentPoolEntry> => {
         const res = await api.patch<ApiResponse<TalentPoolEntry>>(
            `/talent-pool/${id}`,
            { notes, status },
         );
         return res.data.data!;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: ["talent-pool"] });
      },
   });
}

export function useRemoveTalentPoolEntry() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (id: string): Promise<void> => {
         await api.delete(`/talent-pool/${id}`);
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: ["talent-pool"] });
      },
   });
}
