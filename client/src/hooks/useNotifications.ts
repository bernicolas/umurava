"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/hooks/use-toast";

export interface AppNotification {
   id: string;
   type:
      | "screening_started"
      | "screening_done"
      | "screening_failed"
      | "screening_batch_progress"  // ← ADDED: Batch progress notifications
      | "job_created"
      | "job_closed";
   title: string;
   body: string;
   jobId?: string;
   at: string;
   // Optional batch-progress fields
   batchNumber?: number;
   totalBatches?: number;
   processedApplicants?: number;
   totalApplicants?: number;
}

const MAX_STORED = 50;

function notifKey(userId: string) {
   return `notifications_v1_${userId}`;
}
function readKey(userId: string) {
   return `notifications_read_v1_${userId}`;
}

function loadNotifications(userId: string): AppNotification[] {
   try {
      const raw = localStorage.getItem(notifKey(userId));
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
   } catch {
      return [];
   }
}

function saveNotifications(userId: string, items: AppNotification[]): void {
   try {
      localStorage.setItem(
         notifKey(userId),
         JSON.stringify(items.slice(0, MAX_STORED)),
      );
   } catch {}
}

function loadRead(userId: string): Set<string> {
   try {
      const raw = localStorage.getItem(readKey(userId));
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
   } catch {
      return new Set();
   }
}

function saveRead(userId: string, ids: Set<string>): void {
   try {
      localStorage.setItem(readKey(userId), JSON.stringify([...ids]));
   } catch {}
}

export function useNotifications() {
   const token = useAppSelector((s) => s.auth.token);
   const user = useAppSelector((s) => s.auth.user);
   const userId = user?.id ?? null;

   const [notifications, setNotifications] = useState<AppNotification[]>([]);
   const [read, setRead] = useState<Set<string>>(new Set());

   const { toast } = useToast();

   const esRef = useRef<EventSource | null>(null);
   const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const retryCount = useRef(0);
   const appendRef = useRef<(n: AppNotification) => void>(() => {});

   // Load persisted state when userId changes
   useEffect(() => {
      if (!userId) {
         setNotifications([]);
         setRead(new Set());
         return;
      }
      setNotifications(loadNotifications(userId));
      setRead(loadRead(userId));
   }, [userId]);

   const appendNotification = useCallback(
      (n: AppNotification) => {
         if (!userId) return;
         setNotifications((prev) => {
            if (prev.some((p) => p.id === n.id)) return prev;
            const next = [n, ...prev].slice(0, MAX_STORED);
            saveNotifications(userId, next);
            return next;
         });
         
         // Show toast for terminal events and batch progress
         if (n.type === "screening_done") {
            toast({ title: n.title, description: n.body });
         } else if (n.type === "screening_failed") {
            toast({
               title: n.title,
               description: n.body,
               variant: "destructive",
            });
         } else if (n.type === "screening_batch_progress" && n.batchNumber && n.totalBatches) {
            // Only show toast for first batch and every 2nd batch to avoid spam
            if (n.batchNumber === 1 || n.batchNumber % 2 === 0 || n.batchNumber === n.totalBatches) {
               toast({
                  title: `Batch ${n.batchNumber}/${n.totalBatches}`,
                  description: n.body,
                  duration: 2000,
               });
            }
         }
      },
      [userId, toast],
   );

   // Keep the ref up to date
   useEffect(() => {
      appendRef.current = appendNotification;
   }, [appendNotification]);

   const connect = useCallback(() => {
      if (!token || !userId) return;
      const base = process.env.NEXT_PUBLIC_API_URL ?? "";
      const url = `${base}/notifications/stream?token=${encodeURIComponent(token)}`;

      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
         retryCount.current = 0;
         console.log("[SSE] Connected to notification stream");
      };

      es.onmessage = (e: MessageEvent) => {
         try {
            const payload = JSON.parse(e.data as string) as AppNotification;
            appendRef.current(payload);
         } catch (err) {
            console.error("[SSE] Failed to parse notification:", err);
         }
      };

      es.onerror = () => {
         console.warn("[SSE] Connection error, reconnecting...");
         es.close();
         esRef.current = null;
         const delay = Math.min(2_000 * 2 ** retryCount.current, 30_000);
         retryCount.current += 1;
         retryTimerRef.current = setTimeout(connect, delay);
      };
   }, [token, userId]);

   useEffect(() => {
      connect();
      return () => {
         esRef.current?.close();
         esRef.current = null;
         if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      };
   }, [connect]);

   const markRead = useCallback(
      (id: string) => {
         if (!userId) return;
         setRead((prev) => {
            const next = new Set([...prev, id]);
            saveRead(userId, next);
            return next;
         });
      },
      [userId],
   );

   const markAllRead = useCallback(() => {
      if (!userId) return;
      setRead((prev) => {
         const next = new Set([...prev, ...notifications.map((n) => n.id)]);
         saveRead(userId, next);
         return next;
      });
   }, [userId, notifications]);

   const clearAll = useCallback(() => {
      if (!userId) return;
      setNotifications([]);
      setRead(new Set());
      saveNotifications(userId, []);
      saveRead(userId, new Set());
   }, [userId]);

   const unreadCount = notifications.filter((n) => !read.has(n.id)).length;

   return {
      notifications,
      read,
      unreadCount,
      markRead,
      markAllRead,
      clearAll,
   };
}