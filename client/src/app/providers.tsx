"use client";

import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { store } from "@/store";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Render Toaster only on the client to avoid hydration mismatch from
// Radix Toast emitting a role="region" node during SSR.
function ClientOnlyToaster() {
   const [mounted, setMounted] = useState(false);
   useEffect(() => setMounted(true), []);
   if (!mounted) return null;
   return <Toaster />;
}

export function Providers({ children }: { children: React.ReactNode }) {
   return (
      <Provider store={store}>
         <QueryClientProvider client={queryClient}>
            {children}
            <ClientOnlyToaster />
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
         </QueryClientProvider>
      </Provider>
   );
}
