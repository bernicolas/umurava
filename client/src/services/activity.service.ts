import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityEventType =
   | "job_created"
   | "screening"
   | "finalized"
   | "email_invitation"
   | "email_regret";

export interface ActivityItem {
   id: string;
   type: ActivityEventType;
   title: string;
   description?: string;
   at: string;
   jobId?: string;
   jobTitle?: string;
   meta?: Record<string, unknown>;
}

export interface ActivityResponse {
   events: ActivityItem[];
   total: number;
}

export interface ComposeEmailPayload {
   jobId?: string;
   to: "selected" | "rejected" | "pool" | "all" | "custom";
   customTo?: string[];
   cc?: string[];
   subject: string;
   bodyHtml: string;
   sendMeCopy?: boolean;
}

export interface ComposeEmailResult {
   sent: number;
   failed: number;
   errors: string[];
   message: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Per-job activity timeline (used when jobId is known) */
export function useJobActivity(jobId: string | undefined) {
   return useQuery<ActivityResponse>({
      queryKey: ["job-activity", jobId],
      queryFn: async () => {
         const res = await api.get(`/jobs/${jobId}/screening/activity`);
         return res.data.data as ActivityResponse;
      },
      enabled: !!jobId,
      staleTime: 30_000,
   });
}

/** Global activity feed across all jobs — used in the layout-level panel */
export function useGlobalActivity(limit = 30) {
   return useQuery<ActivityResponse>({
      queryKey: ["global-activity", limit],
      queryFn: async () => {
         const res = await api.get(`/activity/global?limit=${limit}`);
         return res.data.data as ActivityResponse;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: true,
   });
}

export function useComposeJobEmail() {
   return useMutation<ComposeEmailResult, Error, ComposeEmailPayload>({
      mutationFn: async ({ jobId, ...payload }) => {
         const url = jobId
            ? `/jobs/${jobId}/screening/activity/compose`
            : `/activity/compose`;
         const res = await api.post(url, payload);
         return res.data.data as ComposeEmailResult;
      },
   });
}
