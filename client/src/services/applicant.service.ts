import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
   ApiResponse,
   PaginatedData,
   Applicant,
   ApplicantDetail,
   TalentProfile,
} from "@/types";

const key = (jobId: string) => ["applicants", jobId] as const;

export function useApplicants(
   jobId: string,
   params?: { page?: number; limit?: number },
) {
   return useQuery({
      queryKey: [...key(jobId), params],
      queryFn: async () => {
         const res = await api.get<ApiResponse<PaginatedData<Applicant>>>(
            `/jobs/${jobId}/applicants`,
            { params },
         );
         return res.data.data!;
      },
      enabled: !!jobId,
   });
}

export function useAddPlatformApplicants(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (profiles: TalentProfile[]) => {
         const res = await api.post<ApiResponse<{ count: number }>>(
            `/jobs/${jobId}/applicants/platform`,
            { profiles },
         );
         return res.data.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key(jobId) }),
   });
}

export function useUploadExternalApplicants(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (file: File) => {
         const form = new FormData();
         form.append("file", file);
         const res = await api.post<ApiResponse<{ count: number }>>(
            `/jobs/${jobId}/applicants/upload`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } },
         );
         return res.data.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key(jobId) }),
   });
}

export function useDeleteApplicant(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (applicantId: string) =>
         api.delete(`/jobs/${jobId}/applicants/${applicantId}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: key(jobId) }),
   });
}

export function useUploadResumeApplicant(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (file: File) => {
         const form = new FormData();
         form.append("file", file);
         const res = await api.post<ApiResponse<{ count: number }>>(
            `/jobs/${jobId}/applicants/resume`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } },
         );
         return res.data.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key(jobId) }),
   });
}

export function useUploadResumeApplicants(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (files: File[]) => {
         const form = new FormData();
         files.forEach((file) => form.append("files", file)); // multiple files under "files"
         const res = await api.post<
            ApiResponse<{ count: number; applicants: unknown[] }>
         >(`/jobs/${jobId}/applicants/resume/bulk`, form, {
            headers: { "Content-Type": "multipart/form-data" },
         });
         return res.data.data!;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key(jobId) }),
   });
}

export function useApplicantDetail(applicantId: string) {
   return useQuery({
      queryKey: ["applicant-detail", applicantId],
      queryFn: async () => {
         const res = await api.get<ApiResponse<ApplicantDetail>>(
            `/applicants/${applicantId}`,
         );
         return res.data.data!;
      },
      enabled: !!applicantId,
   });
}
