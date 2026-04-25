"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ChatbotDrawer } from "@/components/features/chat/ChatbotDrawer";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
   children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
   const [chatOpen, setChatOpen] = useState(false);

   return (
      <div
         className="flex h-screen overflow-hidden"
         suppressHydrationWarning
      >
         <Sidebar />
         <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto min-h-0">{children}</div>
         </div>

         {/* Chatbot FAB */}
         <button
            onClick={() => setChatOpen((v) => !v)}
            className={cn(
               "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg",
               "bg-primary text-primary-foreground",
               "flex items-center justify-center",
               "transition-all hover:scale-105 hover:shadow-xl active:scale-95",
               chatOpen
                  ? "ring-4 ring-primary/40 scale-95"
                  : "ring-4 ring-primary/20",
            )}
            title={chatOpen ? "Close HR Assistant" : "Open HR Assistant"}
            aria-label={chatOpen ? "Close HR Assistant" : "Open HR Assistant"}
         >
            <span className="transition-all duration-300">
               {chatOpen ? (
                  <X className="h-6 w-6" />
               ) : (
                  <Bot className="h-6 w-6" />
               )}
            </span>
         </button>

         <ChatbotDrawer
            open={chatOpen}
            onOpenChange={setChatOpen}
         />
      </div>
   );
}
