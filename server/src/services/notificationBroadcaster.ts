import type { Response } from "express";

export interface AppNotification {
   id:    string;
   type:
      | "screening_started"
      | "screening_done"
      | "screening_failed"
      | "screening_batch_progress"
      | "job_created"
      | "job_closed";
   title: string;
   body:  string;
   jobId?: string;
   at:    string;
   // Optional batch-progress fields (only present when type === "screening_batch_progress")
   batchNumber?:         number;
   totalBatches?:        number;
   processedApplicants?: number;
   totalApplicants?:     number;
}

class NotificationBroadcaster {
   private clients = new Map<string, Set<Response>>();

   addClient(userId: string, res: Response): void {
      if (!this.clients.has(userId)) this.clients.set(userId, new Set());
      this.clients.get(userId)!.add(res);
   }

   removeClient(userId: string, res: Response): void {
      const set = this.clients.get(userId);
      if (!set) return;
      set.delete(res);
      if (set.size === 0) this.clients.delete(userId);
   }

   /** Broadcast to every connected client (all users). */
   broadcast(payload: AppNotification): void {
      const data = `data: ${JSON.stringify(payload)}\n\n`;
      for (const set of this.clients.values()) {
         for (const res of set) {
            try { res.write(data); } catch { /* client disconnected */ }
         }
      }
   }

   /** Send to a specific user only. */
   send(userId: string, payload: AppNotification): void {
      const set = this.clients.get(userId);
      if (!set) return;
      const data = `data: ${JSON.stringify(payload)}\n\n`;
      for (const res of set) {
         try { res.write(data); } catch {}
      }
   }
}

export const notifier = new NotificationBroadcaster();