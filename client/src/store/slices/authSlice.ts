import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface User {
   id: string;
   name: string;
   email: string;
   role: "candidate" | "recruiter" | "admin";
}

interface AuthState {
   token: string | null;
   user: User | null;
}

function loadFromStorage(): AuthState {
   if (typeof window === "undefined") return { token: null, user: null };
   try {
      const raw = localStorage.getItem("auth");
      return raw ? (JSON.parse(raw) as AuthState) : { token: null, user: null };
   } catch {
      return { token: null, user: null };
   }
}

const authSlice = createSlice({
   name: "auth",
   initialState: loadFromStorage,
   reducers: {
      setCredentials(
         state,
         action: PayloadAction<{ token: string; user: User }>,
      ) {
         state.token = action.payload.token;
         state.user = action.payload.user;
         localStorage.setItem(
            "auth",
            JSON.stringify({ token: state.token, user: state.user }),
         );
      },
      logout(state) {
         state.token = null;
         state.user = null;
         localStorage.removeItem("auth");
      },
   },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
