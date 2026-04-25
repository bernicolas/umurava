import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
   ApiResponse,
   EmailSettings,
   EmailTemplateDefaults,
} from "@/types";

export function useEmailSettings() {
   return useQuery({
      queryKey: ["email-settings"],
      queryFn: async (): Promise<EmailSettings | null> => {
         const res =
            await api.get<ApiResponse<EmailSettings | null>>("/email-settings");
         return res.data.data ?? null;
      },
      staleTime: 60_000,
   });
}

export function useUpdateEmailSettings() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (
         data: Partial<EmailSettings> & { smtpPass?: string },
      ): Promise<EmailSettings> => {
         const res = await api.put<ApiResponse<EmailSettings>>(
            "/email-settings",
            data,
         );
         return res.data.data!;
      },
      onSuccess: (data) => {
         qc.setQueryData(["email-settings"], data);
      },
   });
}

export function useTestEmailSettings() {
   return useMutation({
      mutationFn: async ({
         to,
      }: {
         to: string;
      }): Promise<{ message: string }> => {
         const res = await api.post<ApiResponse<{ message: string }>>(
            "/email-settings/test",
            { to },
         );
         return res.data.data!;
      },
   });
}

export function useEmailTemplateDefaults() {
   return useQuery({
      queryKey: ["email-template-defaults"],
      queryFn: async (): Promise<EmailTemplateDefaults> => {
         const res = await api.get<ApiResponse<EmailTemplateDefaults>>(
            "/email-settings/defaults",
         );
         return res.data.data!;
      },
      staleTime: Infinity, // Defaults never change at runtime
   });
}
