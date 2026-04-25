import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
   ApiResponse,
   ScreeningResult,
   ScreeningHistoryEntry,
   ShortlistWithJob,
   CombinedShortlistResult,
} from "@/types";

// ─── Query keys ───────────────────────────────────────────────────────────────

const key = (jobId: string) => ["screening", jobId] as const;
const historyKey = (jobId: string) => ["screening-history", jobId] as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch the latest screening result for a job.
 * Polls every 2s while screeningStatus === "running".
 */
export function useScreeningResult(jobId: string, isRunning = false) {
   return useQuery({
      queryKey: key(jobId),
      queryFn: async () => {
         const res = await api.get<ApiResponse<ScreeningResult>>(
            `/jobs/${jobId}/screening/result`,
         );
         return res.data.data!;
      },
      enabled: !!jobId,
      retry: false,
      // Poll while screening is running, stop when done
      refetchInterval: isRunning ? 2000 : false,
      // Keep previous data while refetching to avoid UI flicker
      placeholderData: (prev) => prev,
   });
}

// ─── Get screening history ───────────────────────────────────────────────────

export function useScreeningHistory(jobId: string) {
   return useQuery({
      queryKey: historyKey(jobId),
      queryFn: async () => {
         const res = await api.get<ApiResponse<ScreeningHistoryEntry[]>>(
            `/jobs/${jobId}/screening/history`,
         );
         return res.data.data ?? [];
      },
      enabled: !!jobId,
      retry: false,
   });
}

// ─── Trigger screening ───────────────────────────────────────────────────────

/**
 * Trigger a screening run.
 * The server returns 202 immediately and runs the job in the background.
 * The mutation resolves once the 202 is received — NOT when screening finishes.
 * Use useScreeningResult(jobId, isRunning=true) to poll for completion.
 */
// export function useTriggerScreening(jobId: string) {
//    const qc = useQueryClient();
//    return useMutation({
//       mutationFn: async () => {
//          const res = await api.post<ApiResponse<{
//             status: string;
//             totalApplicants: number;
//             totalBatches: number
//          }>>(`/jobs/${jobId}/screening/trigger`);
//          return res.data.data!;
//       },
//       onSuccess: () => {
//          // Invalidate all related queries
//          qc.invalidateQueries({ queryKey: key(jobId) });
//          qc.invalidateQueries({ queryKey: historyKey(jobId) });
//          qc.invalidateQueries({ queryKey: ["jobs", jobId] });
//          qc.invalidateQueries({ queryKey: ["all-shortlists"] });
//       },
//    });
// }

// ─── Get specific history run details ────────────────────────────────────────

export function useHistoryRunDetail(jobId: string, historyId: string | null) {
   return useQuery({
      queryKey: ["screening-history-detail", jobId, historyId],
      queryFn: async () => {
         if (!historyId) return null;
         const res = await api.get<ApiResponse<ScreeningHistoryEntry>>(
            `/jobs/${jobId}/screening/history/${historyId}`,
         );
         return res.data.data ?? null;
      },
      enabled: !!jobId && !!historyId,
      retry: false,
   });
}

// ─── Combine multiple history runs ───────────────────────────────────────────

/**
 * Combine multiple history runs into an averaged shortlist.
 * POST /jobs/:jobId/screening/combine  { runIds: string[] }
 */
export function useCombineHistory(jobId: string) {
   return useMutation({
      mutationFn: async (payload: {
         runIds: string[];
         strategy?: "average" | "max" | "min";
      }) => {
         const res = await api.post<ApiResponse<CombinedShortlistResult>>(
            `/jobs/${jobId}/screening/combine`,
            payload,
         );
         return res.data.data!;
      },
   });
}

// ─── Get all shortlists across jobs ──────────────────────────────────────────

export function useAllShortlists() {
   return useQuery({
      queryKey: ["all-shortlists"],
      queryFn: async () => {
         const res =
            await api.get<ApiResponse<ShortlistWithJob[]>>("/screening/all");
         return res.data.data ?? [];
      },
   });
}

// ─── Helper: Check if screening is currently running ─────────────────────────

export function useIsScreeningRunning(jobId: string): boolean {
   const { data } = useScreeningResult(jobId);
   // Check both the result status and the job status from the query
   return data?.status === "running";
}

export function useTriggerScreening(jobId: string, applicantCount: number) {
   const qc = useQueryClient();

   // Automatically use the paginated endpoint for large applicant pools
   const endpoint =
      applicantCount > 30
         ? `/jobs/${jobId}/screening/trigger-paginated`
         : `/jobs/${jobId}/screening/trigger`;

   return useMutation({
      mutationFn: async (payload: { shortlistSize?: number } | void) => {
         const res = await api.post<
            ApiResponse<{ status: string; totalApplicants: number }>
         >(endpoint, payload ?? {});
         return res.data.data!;
      },
      onSuccess: () => {
         // Invalidate job so screeningStatus === "running" is reflected immediately
         qc.invalidateQueries({ queryKey: ["jobs", jobId] });
      },
   });
}
