import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ApiResponse, PaginatedData, Job, JobFormData } from "@/types";

const KEY = "jobs";

export interface DashboardStats {
   totalApplicants: number;
   totalRuns: number;
   avgMatchScore: number;
   trend: { month: string; applications: number; screened: number }[];
}

export function useDashboardStats() {
   return useQuery({
      queryKey: ["dashboard-stats"],
      queryFn: async () => {
         const res = await api.get<ApiResponse<DashboardStats>>("/jobs/stats");
         return res.data.data!;
      },
      staleTime: 60_000,
   });
}

export function useJobs(params?: {
   page?: number;
   limit?: number;
   status?: string;
}) {
   return useQuery({
      queryKey: [KEY, params],
      queryFn: async () => {
         const res = await api.get<ApiResponse<PaginatedData<Job>>>("/jobs", {
            params,
         });
         return res.data.data!;
      },
   });
}

export function useJob(id: string) {
   return useQuery({
      queryKey: [KEY, id],
      queryFn: async () => {
         const res = await api.get<ApiResponse<Job>>(`/jobs/${id}`);
         return res.data.data!;
      },
      enabled: !!id,
   });
}

export function useCreateJob() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (data: JobFormData) => {
         const res = await api.post<ApiResponse<Job>>("/jobs", data);
         return res.data.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
   });
}

export function useUpdateJob(id: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (
         data: Partial<JobFormData> & { status?: Job["status"] },
      ) => {
         const res = await api.put<ApiResponse<Job>>(`/jobs/${id}`, data);
         return res.data.data!;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: [KEY] });
         qc.invalidateQueries({ queryKey: [KEY, id] });
      },
   });
}

export function useDeleteJob() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (id: string) => api.delete(`/jobs/${id}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
   });
}

export function useCloseJob() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (id: string) => {
         const res = await api.patch<ApiResponse<Job>>(`/jobs/${id}/close`);
         return res.data.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
   });
}

export function usePublishJob() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (id: string) => {
         const res = await api.patch<ApiResponse<Job>>(`/jobs/${id}/publish`);
         return res.data.data!;
      },
      onSuccess: (data) => {
         qc.invalidateQueries({ queryKey: [KEY] });
         qc.invalidateQueries({ queryKey: [KEY, data._id] });
      },
   });
}
