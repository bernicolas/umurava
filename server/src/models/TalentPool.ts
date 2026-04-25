import { Schema, model, Document, Types } from "mongoose";

export interface ITalentPool extends Document {
   jobId: Types.ObjectId;
   applicantId: Types.ObjectId;
   addedBy: Types.ObjectId;
   addedAt: Date;
   matchScore: number;
   jobTitle: string;
   reason?: string;
   notes?: string;
   status: "active" | "contacted" | "hired" | "archived";
   regretLetterSent: boolean;
   regretLetterSentAt?: Date;
}

const talentPoolSchema = new Schema<ITalentPool>(
   {
      jobId: {
         type: Schema.Types.ObjectId,
         ref: "Job",
         required: true,
      },
      applicantId: {
         type: Schema.Types.ObjectId,
         ref: "Applicant",
         required: true,
      },
      addedBy: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      addedAt: { type: Date, default: Date.now },
      matchScore: { type: Number, required: true, min: 0, max: 100 },
      jobTitle: { type: String, required: true },
      reason: String,
      notes: String,
      status: {
         type: String,
         enum: ["active", "contacted", "hired", "archived"],
         default: "active",
      },
      regretLetterSent: { type: Boolean, default: false },
      regretLetterSentAt: Date,
   },
   { timestamps: true },
);

// Prevent duplicate talent pool entries for the same applicant/job pair
talentPoolSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

export const TalentPool = model<ITalentPool>("TalentPool", talentPoolSchema);
