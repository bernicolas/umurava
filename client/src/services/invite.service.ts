import { useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ApiResponse } from "@/types";

interface InviteResult {
   inviteLink: string;
   emailSent:  boolean;
   expiresAt:  string;
}

/**
 * Admin-only hook — sends an invite to a given email address.
 * Returns the invite link regardless of whether the email was delivered,
 * so the admin can copy it manually as a fallback.
 */
export function useSendInvite() {
   return useMutation({
      mutationFn: async (email: string): Promise<InviteResult> => {
         const res = await api.post<ApiResponse<InviteResult>>(
            "/admin/invite",
            { email },
         );
         return res.data.data!;
      },
   });
}

interface VerifyInviteResult {
   email: string;
   valid: boolean;
}

/**
 * Verifies an invite token on the register page.
 * Called once on page load with the token from the URL.
 */
export async function verifyInviteToken(
   code:  string,
   email: string,
): Promise<VerifyInviteResult> {
   const res = await api.get<ApiResponse<VerifyInviteResult>>(
      `/auth/verify-invite?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`,
   );
   return res.data.data!;
}

/**
 * Marks the invite token as used after successful registration.
 */
export async function markInviteUsed(code: string, email: string): Promise<void> {
   await api.post("/auth/mark-invite-used", { code, email });
}