"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
   Bot,
   Send,
   Plus,
   Trash2,
   X,
   MessageSquare,
   Loader2,
   ArrowLeft,
   AlertCircle,
   Clock,
   Copy,
   CheckCheck,
   BarChart2,
   FileText,
   TrendingUp,
   Zap,
   History,
   WifiOff,
   Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
   useChatSessions,
   useChatSession,
   useCreateChatSession,
   useSendChatMessage,
   useDeleteChatSession,
} from "@/services/chat.service";
import type { ChatMessage, ChatSessionSummary } from "@/types";

interface QuickPrompt {
   Icon: LucideIcon;
   label: string;
   desc: string;
   text: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
   {
      Icon: BarChart2,
      label: "Screening scores",
      desc: "Ideal thresholds for shortlisting",
      text: "What is the ideal match score threshold for shortlisting candidates?",
   },
   {
      Icon: FileText,
      label: "Job description",
      desc: "Write compelling job postings",
      text: "How do I write a compelling job description that attracts top talent?",
   },
   {
      Icon: TrendingUp,
      label: "HR metrics",
      desc: "TTH, TTFH, offer acceptance rate",
      text: "Explain TTH, TTFH, and offer acceptance rate metrics.",
   },
   {
      Icon: Zap,
      label: "AI screening",
      desc: "How candidates are scored",
      text: "How does the AI screening work in this platform?",
   },
];

function MarkdownText({ text }: { text: string }) {
   const lines = text.split("\n");
   return (
      <div className="space-y-1 text-sm">
         {lines.map((line, i) => {
            if (/^###\s/.test(line))
               return (
                  <p
                     key={i}
                     className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-2"
                  >
                     {line.slice(4)}
                  </p>
               );
            if (/^##\s/.test(line))
               return (
                  <p
                     key={i}
                     className="font-semibold pt-1"
                  >
                     {line.slice(3)}
                  </p>
               );
            if (/^#\s/.test(line))
               return (
                  <p
                     key={i}
                     className="font-bold text-base pt-1"
                  >
                     {line.slice(2)}
                  </p>
               );
            if (/^[-*•]\s/.test(line))
               return (
                  <div
                     key={i}
                     className="flex gap-2 items-start"
                  >
                     <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-foreground/40" />
                     <InlineMd text={line.slice(2)} />
                  </div>
               );
            const num = line.match(/^(\d+)\.\s(.+)/);
            if (num)
               return (
                  <div
                     key={i}
                     className="flex gap-2 items-start"
                  >
                     <span className="shrink-0 font-semibold text-primary/70 min-w-[18px] text-xs">
                        {num[1]}.
                     </span>
                     <InlineMd text={num[2]!} />
                  </div>
               );
            if (!line.trim())
               return (
                  <div
                     key={i}
                     className="h-1"
                  />
               );
            return (
               <p
                  key={i}
                  className="leading-relaxed"
               >
                  <InlineMd text={line} />
               </p>
            );
         })}
      </div>
   );
}

function InlineMd({ text }: { text: string }) {
   const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
   return (
      <>
         {parts.map((p, i) => {
            if (p.startsWith("**") && p.endsWith("**"))
               return (
                  <strong
                     key={i}
                     className="font-semibold"
                  >
                     {p.slice(2, -2)}
                  </strong>
               );
            if (p.startsWith("*") && p.endsWith("*"))
               return <em key={i}>{p.slice(1, -1)}</em>;
            if (p.startsWith("`") && p.endsWith("`"))
               return (
                  <code
                     key={i}
                     className="bg-black/10 rounded px-1 py-0.5 font-mono text-[11px]"
                  >
                     {p.slice(1, -1)}
                  </code>
               );
            return <span key={i}>{p}</span>;
         })}
      </>
   );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
   const isAI = msg.role === "model";
   const [copied, setCopied] = useState(false);

   const time = (() => {
      try {
         return msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : "";
      } catch {
         return "";
      }
   })();

   const handleCopy = () => {
      navigator.clipboard.writeText(msg.content).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   };

   return (
      <div
         className={cn(
            "flex gap-2.5 group",
            isAI ? "items-start" : "items-end flex-row-reverse",
         )}
      >
         {isAI && (
            <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20">
               <Bot className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
         )}
         <div
            className={cn(
               "max-w-[82%] space-y-1",
               !isAI && "items-end flex flex-col",
            )}
         >
            <div
               className={cn(
                  "relative rounded-2xl px-3.5 py-2.5",
                  isAI
                     ? "bg-card border shadow-sm rounded-tl-sm"
                     : "bg-primary text-primary-foreground rounded-tr-sm shadow-sm",
               )}
            >
               {isAI ? (
                  <MarkdownText text={msg.content} />
               ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
               )}
               {isAI && (
                  <button
                     onClick={handleCopy}
                     className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                     title={copied ? "Copied!" : "Copy"}
                  >
                     {copied ? (
                        <CheckCheck className="h-3 w-3 text-primary" />
                     ) : (
                        <Copy className="h-3 w-3" />
                     )}
                  </button>
               )}
            </div>
            <p
               className={cn(
                  "text-[10px] text-muted-foreground px-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  isAI ? "text-left" : "text-right",
               )}
            >
               {time}
            </p>
         </div>
      </div>
   );
}

function ThinkingBubble() {
   return (
      <div className="flex gap-2.5 items-start">
         <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20">
            <Bot className="h-3.5 w-3.5 text-primary-foreground" />
         </div>
         <div className="rounded-2xl rounded-tl-sm bg-card border shadow-sm px-4 py-3">
            <div className="flex items-center gap-1.5">
               {[0, 1, 2].map((i) => (
                  <span
                     key={i}
                     className="block h-2 w-2 rounded-full bg-primary/50 animate-bounce"
                     style={{
                        animationDelay: `${i * 0.18}s`,
                        animationDuration: "1.2s",
                     }}
                  />
               ))}
            </div>
         </div>
      </div>
   );
}

function ErrorBubble({
   message,
   isRateLimit,
}: {
   message: string;
   isRateLimit?: boolean;
}) {
   return (
      <div className="flex items-start gap-2.5">
         <div
            className={cn(
               "mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center",
               isRateLimit ? "bg-amber-500/10" : "bg-destructive/10",
            )}
         >
            {isRateLimit ? (
               <WifiOff className="h-3.5 w-3.5 text-amber-500" />
            ) : (
               <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            )}
         </div>
         <div
            className={cn(
               "rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm max-w-[82%]",
               isRateLimit
                  ? "bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "bg-destructive/5 border border-destructive/20 text-destructive",
            )}
         >
            {message}
         </div>
      </div>
   );
}

interface SessionsListProps {
   sessions: ChatSessionSummary[];
   currentId: string | null;
   onSelect: (id: string) => void;
   onDelete: (id: string) => void;
   onNew: () => void;
}

function SessionsList({
   sessions,
   currentId,
   onSelect,
   onDelete,
   onNew,
}: SessionsListProps) {
   const deleteSession = useDeleteChatSession();

   return (
      <div className="flex flex-col h-full overflow-hidden">
         <div className="px-4 py-3 border-b shrink-0">
            <button
               onClick={onNew}
               className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[.98] transition-all"
            >
               <Plus className="h-4 w-4" />
               New Conversation
            </button>
         </div>
         <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground px-6 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                     <MessageSquare className="h-6 w-6 opacity-30" />
                  </div>
                  <div>
                     <p className="text-sm font-medium">No conversations yet</p>
                     <p className="text-xs mt-1 opacity-60">
                        Start a new chat to get HR help
                     </p>
                  </div>
               </div>
            ) : (
               <div className="py-1">
                  {sessions.map((s) => (
                     <div
                        key={s._id}
                        className={cn(
                           "flex items-center gap-3 px-4 py-2.5 cursor-pointer group transition-colors hover:bg-muted/50 relative",
                           s._id === currentId && "bg-primary/5",
                        )}
                        onClick={() => onSelect(s._id)}
                     >
                        {s._id === currentId && (
                           <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />
                        )}
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                           <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p
                              className={cn(
                                 "text-sm truncate",
                                 s._id === currentId
                                    ? "font-semibold"
                                    : "font-medium",
                              )}
                           >
                              {s.title}
                           </p>
                           <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDistanceToNow(new Date(s.updatedAt), {
                                 addSuffix: true,
                              })}
                           </p>
                        </div>
                        <button
                           onClick={(e) => {
                              e.stopPropagation();
                              onDelete(s._id);
                           }}
                           disabled={deleteSession.isPending}
                           className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
                           title="Delete conversation"
                        >
                           <Trash2 className="h-3.5 w-3.5" />
                        </button>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
   );
}

interface ChatbotDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function ChatbotDrawer({ open, onOpenChange }: ChatbotDrawerProps) {
   const [view, setView] = useState<"chat" | "sessions">("chat");
   const [currentSessionId, setCurrentSessionId] = useState<string | null>(
      null,
   );
   const [input, setInput] = useState("");
   const [pendingMsg, setPendingMsg] = useState<string | null>(null);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);
   const [isRateLimitError, setIsRateLimitError] = useState(false);

   const { data: sessions = [] } = useChatSessions();
   const { data: session } = useChatSession(currentSessionId);
   const createSession = useCreateChatSession();
   const sendMessage = useSendChatMessage();
   const deleteSession = useDeleteChatSession();

   const messagesEndRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLTextAreaElement>(null);

   useEffect(() => {
      if (open && sessions.length > 0 && !currentSessionId) {
         setCurrentSessionId(sessions[0]._id);
      }
   }, [open, sessions, currentSessionId]);

   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [session?.messages?.length, pendingMsg, errorMsg]);

   useEffect(() => {
      if (open && view === "chat") {
         setTimeout(() => inputRef.current?.focus(), 200);
      }
   }, [open, view]);

   const autoResize = useCallback(() => {
      const el = inputRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
   }, []);

   const handleNewChat = useCallback(() => {
      setCurrentSessionId(null);
      setView("chat");
      setInput("");
      setErrorMsg(null);
      setIsRateLimitError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
   }, []);

   const handleSelectSession = useCallback((id: string) => {
      setCurrentSessionId(id);
      setView("chat");
      setErrorMsg(null);
      setIsRateLimitError(false);
   }, []);

   const handleDeleteSession = useCallback(
      async (id: string) => {
         await deleteSession.mutateAsync(id);
         if (currentSessionId === id) {
            setCurrentSessionId(null);
            setErrorMsg(null);
            setIsRateLimitError(false);
         }
      },
      [deleteSession, currentSessionId],
   );

   const handleSend = useCallback(async () => {
      const content = input.trim();
      if (!content || sendMessage.isPending || createSession.isPending) return;

      setInput("");
      setErrorMsg(null);
      setIsRateLimitError(false);
      setPendingMsg(content);

      if (inputRef.current) inputRef.current.style.height = "auto";

      try {
         let sessionId = currentSessionId;
         if (!sessionId) {
            const newSession = await createSession.mutateAsync();
            sessionId = newSession._id;
            setCurrentSessionId(sessionId);
         }
         await sendMessage.mutateAsync({ sessionId, content });
      } catch (err: unknown) {
         const serverMsg =
            (err as { response?: { data?: { message?: string } } })?.response
               ?.data?.message ?? "";
         const rateLimit =
            serverMsg.toLowerCase().includes("temporarily busy") ||
            serverMsg.toLowerCase().includes("high demand") ||
            serverMsg.includes("429");
         setIsRateLimitError(rateLimit);
         setErrorMsg(
            rateLimit
               ? "The assistant is temporarily busy due to high demand. Please wait a moment and try again."
               : "Something went wrong. Please check your connection and try again.",
         );
      } finally {
         setPendingMsg(null);
      }
   }, [input, sendMessage, createSession, currentSessionId]);

   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
         e.preventDefault();
         handleSend();
      }
   };

   const handleQuickPrompt = (text: string) => {
      setInput(text);
      setTimeout(() => {
         autoResize();
         inputRef.current?.focus();
      }, 0);
   };

   const messages = session?.messages ?? [];
   const isThinking = sendMessage.isPending || createSession.isPending;
   const hasMessages = messages.length > 0 || !!pendingMsg || !!errorMsg;

   return (
      <div
         className={cn(
            "fixed bottom-24 right-6 z-50",
            "w-[420px] max-w-[calc(100vw-24px)]",
            "flex flex-col rounded-2xl overflow-hidden",
            "bg-background border shadow-2xl",
            "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right",
            open
               ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
               : "opacity-0 scale-90 translate-y-4 pointer-events-none",
         )}
         style={{ height: "580px", maxHeight: "calc(100vh - 110px)" }}
      >
         {/* Header */}
         <div className="shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
            {view === "sessions" ? (
               <button
                  onClick={() => setView("chat")}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
               >
                  <ArrowLeft className="h-4 w-4" />
               </button>
            ) : (
               <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center ring-2 ring-white/10">
                     <Bot className="h-5 w-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-primary" />
               </div>
            )}
            <div className="flex-1 min-w-0">
               <p className="font-semibold text-sm leading-tight">
                  {view === "sessions" ? "Conversations" : "HR Assistant"}
               </p>
               {view === "chat" && (
                  <p className="text-[11px] text-primary-foreground/70 leading-tight truncate">
                     {session?.title ?? "Online · Ready to help"}
                  </p>
               )}
            </div>
            <div className="flex items-center gap-0.5">
               <button
                  onClick={() =>
                     setView((v) => (v === "sessions" ? "chat" : "sessions"))
                  }
                  className={cn(
                     "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                     view === "sessions" ? "bg-white/15" : "hover:bg-white/10",
                  )}
                  title="Conversation history"
               >
                  <History className="h-4 w-4" />
               </button>
               <button
                  onClick={handleNewChat}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  title="New conversation"
               >
                  <Plus className="h-4 w-4" />
               </button>
               <button
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  title="Close"
               >
                  <X className="h-4 w-4" />
               </button>
            </div>
         </div>

         {/* Body */}
         {view === "sessions" ? (
            <div className="flex-1 overflow-hidden">
               <SessionsList
                  sessions={sessions}
                  currentId={currentSessionId}
                  onSelect={handleSelectSession}
                  onDelete={handleDeleteSession}
                  onNew={handleNewChat}
               />
            </div>
         ) : (
            <>
               {/* Messages area */}
               <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 bg-muted/20">
                  {!hasMessages ? (
                     <div className="flex flex-col items-center justify-center h-full gap-5 pb-4">
                        <div className="text-center space-y-2.5">
                           <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mx-auto">
                              <Users className="h-7 w-7 text-primary" />
                           </div>
                           <div>
                              <h3 className="font-bold text-base tracking-tight">
                                 How can I help you?
                              </h3>
                              <p className="text-xs text-muted-foreground max-w-[240px] mx-auto mt-1 leading-relaxed">
                                 Ask about HR concepts, platform features, or
                                 recruitment best practices.
                              </p>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full">
                           {QUICK_PROMPTS.map((q) => {
                              const Icon = q.Icon;
                              return (
                                 <button
                                    key={q.label}
                                    onClick={() => handleQuickPrompt(q.text)}
                                    className="flex flex-col gap-2.5 p-3.5 rounded-xl border bg-background hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm active:scale-[.97] transition-all text-left group"
                                 >
                                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                                       <Icon className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div>
                                       <p className="text-xs font-semibold leading-snug">
                                          {q.label}
                                       </p>
                                       <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                          {q.desc}
                                       </p>
                                    </div>
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  ) : (
                     <div className="space-y-4 pt-1">
                        {messages.map((msg, i) => (
                           <MessageBubble
                              key={i}
                              msg={msg}
                           />
                        ))}
                        {pendingMsg && (
                           <MessageBubble
                              msg={{
                                 role: "user",
                                 content: pendingMsg,
                                 createdAt: new Date().toISOString(),
                              }}
                           />
                        )}
                        {isThinking && <ThinkingBubble />}
                        {errorMsg && !isThinking && (
                           <ErrorBubble
                              message={errorMsg}
                              isRateLimit={isRateLimitError}
                           />
                        )}
                        <div ref={messagesEndRef} />
                     </div>
                  )}
               </div>

               {/* Input */}
               <div className="shrink-0 border-t bg-background px-4 py-3">
                  <div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3.5 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                     <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                           setInput(e.target.value);
                           autoResize();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about HR or this platform…"
                        rows={1}
                        className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none py-0.5 leading-relaxed"
                        style={{ minHeight: "22px" }}
                        disabled={isThinking}
                     />
                     <button
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        className={cn(
                           "h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                           input.trim() && !isThinking
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-90"
                              : "text-muted-foreground/30 cursor-not-allowed",
                        )}
                        title="Send (Enter)"
                     >
                        {isThinking ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                           <Send className="h-4 w-4" />
                        )}
                     </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
                     Enter to send &middot; Shift+Enter for new line
                  </p>
               </div>
            </>
         )}
      </div>
   );
}
