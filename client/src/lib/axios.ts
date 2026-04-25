import axios from "axios";
import { store } from "@/store";
import { logout } from "@/store/slices/authSlice";

const api = axios.create({
   baseURL: process.env.NEXT_PUBLIC_API_URL,
   headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
   const token = store.getState().auth.token;
   if (token) config.headers.Authorization = `Bearer ${token}`;
   return config;
});

api.interceptors.response.use(
   (res) => res,
   (err) => {
      if (err.response?.status === 401) store.dispatch(logout());
      return Promise.reject(err);
   },
);

export default api;
