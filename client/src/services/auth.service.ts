import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials, logout } from "@/store/slices/authSlice";
import type { ApiResponse, AuthResponse } from "@/types";

export function useLogin() {
   const dispatch = useAppDispatch();
   const qc = useQueryClient();

   return useMutation({
      mutationFn: async (data: { email: string; password: string }) => {
         const res = await api.post<ApiResponse<AuthResponse>>(
            "/auth/login",
            data,
         );
         return res.data.data!;
      },
      onSuccess: (data) => {
         dispatch(setCredentials({ token: data.token, user: data.user }));
         qc.clear();
      },
   });
}

export function useRegister() {
   const dispatch = useAppDispatch();

   return useMutation({
      mutationFn: async (data: {
         name: string;
         email: string;
         password: string;
         role?: string;
      }) => {
         const res = await api.post<ApiResponse<AuthResponse>>(
            "/auth/register",
            data,
         );
         return res.data.data!;
      },
      onSuccess: (data) => {
         dispatch(setCredentials({ token: data.token, user: data.user }));
      },
   });
}

export function useLogout() {
   const dispatch = useAppDispatch();
   const qc = useQueryClient();

   return () => {
      dispatch(logout());
      qc.clear();
   };
}
