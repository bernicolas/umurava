import { Schema, model, Document, Types } from "mongoose";

export interface IMessage {
   role: "user" | "model";
   content: string;
   createdAt: Date;
}

export interface IChatSession extends Document {
   userId: Types.ObjectId;
   title: string;
   messages: IMessage[];
   createdAt: Date;
   updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
   {
      role: { type: String, enum: ["user", "model"], required: true },
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
   },
   { _id: false },
);

const chatSessionSchema = new Schema<IChatSession>(
   {
      userId: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
         index: true,
      },
      title: { type: String, default: "New Chat" },
      messages: [messageSchema],
   },
   { timestamps: true },
);

export const ChatSession = model<IChatSession>(
   "ChatSession",
   chatSessionSchema,
);
