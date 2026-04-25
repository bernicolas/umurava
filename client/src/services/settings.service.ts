import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ApiResponse, ScreeningConfig } from "@/types";

const DEFAULT_SETTINGS: ScreeningConfig = {
   scoringWeights: {
      skills: 35,
      experience: 30,
      education: 15,
      projects: 15,
      availability: 5,
   },
   minScoreThreshold: 0,
   customInstructions: "",
   preferImmediateAvailability: false,
   autoTalentPool: true,
   autoTalentPoolCount: 3,
   defaultShortlistSize: 10,
   defaultCombineStrategy: "average",
};

export function useGetSettings() {
   return useQuery({
      queryKey: ["settings"],
      queryFn: async (): Promise<ScreeningConfig> => {
         const res = await api.get<ApiResponse<ScreeningConfig>>("/settings");
         return res.data.data ?? DEFAULT_SETTINGS;
      },
      staleTime: 30_000,
   });
}

export function useUpdateSettings() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (data: ScreeningConfig): Promise<ScreeningConfig> => {
         const res = await api.put<ApiResponse<ScreeningConfig>>(
            "/settings",
            data,
         );
         return res.data.data!;
      },
      onSuccess: (data) => {
         qc.setQueryData(["settings"], data);
      },
   });
}

export { DEFAULT_SETTINGS };
