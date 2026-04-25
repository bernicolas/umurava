import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
   ApiResponse,
   FinalizationState,
   FinalSelection,
   SendEmailResult,
   InterviewRound,
} from "@/types";

export function useFinalizationState(jobId: string | null) {
   return useQuery({
      queryKey: ["finalization", jobId],
      enabled: !!jobId,
      queryFn: async (): Promise<FinalizationState> => {
         const res = await api.get<ApiResponse<FinalizationState>>(
            `/jobs/${jobId}/screening/finalization`,
         );
         return res.data.data!;
      },
      staleTime: 30_000,
   });
}

export function useFinalizeCandidates(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (payload: {
         selectionType: "ai_recommended" | "manual";
         selectedCandidateIds: string[];
         rejectedCandidateIds: string[];
         talentPoolCandidateIds: string[];
      }) => {
         const res = await api.post<
            ApiResponse<{
               finalSelection: FinalSelection;
               talentPoolEntriesCreated: number;
            }>
         >(`/jobs/${jobId}/screening/finalize`, payload);
         return res.data.data!;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: ["finalization", jobId] });
         qc.invalidateQueries({ queryKey: ["talent-pool"] });
         qc.invalidateQueries({ queryKey: ["shortlists"] });
      },
   });
}

export function useSendInterviewInvitations(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (payload: {
         interviewDetails?: string;
         customSubject?: string;
         customBody?: string;
      }) => {
         const res = await api.post<ApiResponse<SendEmailResult>>(
            `/jobs/${jobId}/screening/send-invitations`,
            payload,
         );
         return res.data.data!;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: ["finalization", jobId] });
         qc.invalidateQueries({ queryKey: ["shortlists"] });
      },
   });
}

export function useSendRegretLetters(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (payload: {
         targetGroup: "rejected" | "talent_pool" | "all";
         customSubject?: string;
         customBody?: string;
      }) => {
         const res = await api.post<ApiResponse<SendEmailResult>>(
            `/jobs/${jobId}/screening/send-regret-letters`,
            payload,
         );
         return res.data.data!;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: ["finalization", jobId] });
         qc.invalidateQueries({ queryKey: ["talent-pool"] });
         qc.invalidateQueries({ queryKey: ["shortlists"] });
      },
   });
}

export function useSaveInterviewRounds(jobId: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (rounds: InterviewRound[]) => {
         const res = await api.put<ApiResponse<FinalSelection>>(
            `/jobs/${jobId}/screening/interview-rounds`,
            { rounds },
         );
         return res.data.data!;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: ["finalization", jobId] });
      },
   });
}
