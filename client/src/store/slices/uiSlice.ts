import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
   sidebarOpen: boolean;
}

const uiSlice = createSlice({
   name: "ui",
   initialState: { sidebarOpen: false } as UIState,
   reducers: {
      toggleSidebar(state) {
         state.sidebarOpen = !state.sidebarOpen;
      },
      setSidebar(state, action: PayloadAction<boolean>) {
         state.sidebarOpen = action.payload;
      },
   },
});

export const { toggleSidebar, setSidebar } = uiSlice.actions;
export default uiSlice.reducer;
