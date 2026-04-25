import { Schema, model, Document } from "mongoose";

export interface IInviteToken extends Document {
   email:     string;
   token:     string;
   createdBy: Schema.Types.ObjectId;
   usedAt?:   Date;
   expiresAt: Date;
}

const inviteTokenSchema = new Schema<IInviteToken>(
   {
      email:     { type: String, required: true, lowercase: true, trim: true },
      token:     { type: String, required: true, unique: true },
      createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      usedAt:    { type: Date },
      expiresAt: { type: Date, required: true },
   },
   { timestamps: true },
);

// Auto-delete expired tokens after 7 days
inviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
inviteTokenSchema.index({ token: 1 });
inviteTokenSchema.index({ email: 1 });

export const InviteToken = model<IInviteToken>("InviteToken", inviteTokenSchema);