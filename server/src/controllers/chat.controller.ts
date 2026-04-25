import type { Request, Response } from "express";
import { ChatSession } from "../models/ChatSession";
import { chatWithAI } from "../services/chat.service";
import { AppError } from "../utils";

export async function listSessions(req: Request, res: Response): Promise<void> {
   const userId = req.user!.userId;
   const sessions = await ChatSession.find({ userId })
      .select("title createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
   res.json({ success: true, data: sessions });
}

export async function getSession(req: Request, res: Response): Promise<void> {
   const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user!.userId,
   }).lean();
   if (!session) throw new AppError("Session not found", 404);
   res.json({ success: true, data: session });
}

export async function createSession(
   req: Request,
   res: Response,
): Promise<void> {
   const session = await ChatSession.create({
      userId: req.user!.userId,
      title: "New Chat",
      messages: [],
   });
   res.status(201).json({ success: true, data: session });
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
   const { content } = req.body as { content?: string };
   if (!content?.trim()) throw new AppError("Message content is required", 400);

   const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user!.userId,
   });
   if (!session) throw new AppError("Session not found", 404);

   const history = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
   }));

   const aiText = await chatWithAI(history, content.trim());

   const now = new Date();
   const userMsg = {
      role: "user" as const,
      content: content.trim(),
      createdAt: now,
   };
   const aiMsg = { role: "model" as const, content: aiText, createdAt: now };

   session.messages.push(userMsg, aiMsg);

   // Auto-title from first user message
   if (session.messages.length === 2) {
      const raw = content.trim();
      session.title = raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
   }

   await session.save();

   res.json({
      success: true,
      data: {
         userMessage: userMsg,
         aiMessage: aiMsg,
         title: session.title,
      },
   });
}

export async function deleteSession(
   req: Request,
   res: Response,
): Promise<void> {
   const session = await ChatSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.userId,
   });
   if (!session) throw new AppError("Session not found", 404);
   res.json({ success: true, message: "Session deleted" });
}
