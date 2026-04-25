import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ChatSession, ChatSessionSummary, ChatMessage } from "@/types";

function ok<T>(r: { data: { data: T } }): T {
   return r.data.data;
}

export function useChatSessions() {
   return useQuery({
      queryKey: ["chat-sessions"],
      queryFn: () =>
         api
            .get<{ data: ChatSessionSummary[] }>("/chat/sessions")
            .then(ok<ChatSessionSummary[]>),
   });
}

export function useChatSession(id: string | null) {
   return useQuery({
      queryKey: ["chat-session", id],
      queryFn: () =>
         api
            .get<{ data: ChatSession }>(`/chat/sessions/${id}`)
            .then(ok<ChatSession>),
      enabled: !!id,
   });
}

export function useCreateChatSession() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: () =>
         api
            .post<{ data: ChatSession }>("/chat/sessions")
            .then(ok<ChatSession>),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-sessions"] }),
   });
}

export function useSendChatMessage() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: ({
         sessionId,
         content,
      }: {
         sessionId: string;
         content: string;
      }) =>
         api
            .post<{
               data: {
                  userMessage: ChatMessage;
                  aiMessage: ChatMessage;
                  title: string;
               };
            }>(`/chat/sessions/${sessionId}/messages`, { content })
            .then((r) => r.data.data),
      onSuccess: (data, { sessionId }) => {
         qc.setQueryData<ChatSession>(["chat-session", sessionId], (old) => {
            if (!old) {
               // First message on a brand new session — seed the cache
               return {
                  _id: sessionId,
                  title: data.title,
                  messages: [data.userMessage, data.aiMessage],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
               };
            }
            return {
               ...old,
               title: data.title,
               messages: [...old.messages, data.userMessage, data.aiMessage],
            };
         });
         qc.setQueryData<ChatSessionSummary[]>(["chat-sessions"], (old) => {
            if (!old) return old;
            return old.map((s) =>
               s._id === sessionId
                  ? {
                       ...s,
                       title: data.title,
                       updatedAt: new Date().toISOString(),
                    }
                  : s,
            );
         });
      },
   });
}

export function useDeleteChatSession() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: (id: string) => api.delete(`/chat/sessions/${id}`),
      onSuccess: (_, id) => {
         qc.invalidateQueries({ queryKey: ["chat-sessions"] });
         qc.removeQueries({ queryKey: ["chat-session", id] });
      },
   });
}
