import { Schema, model, Document, Types } from "mongoose";
import type { ShortlistedCandidate } from "../types";

export interface IFinalSelection {
   selectedCandidateIds: string[];
   rejectedCandidateIds: string[];
   talentPoolCandidateIds: string[];
   selectionType: "ai_recommended" | "manual";
   finalizedAt: Date;
   finalizedBy: Types.ObjectId;
   interviewRounds?: IInterviewRound[];
}

export interface IInterviewRound {
   roundNumber: number;
   title: string;
   type: "phone" | "technical" | "cultural" | "panel" | "final" | "other";
   scheduledDate?: Date;
   location?: string;
   notes?: string;
   interviewers?: string[];
}

export interface IEmailLog {
   interviewInvitationsSent: boolean;
   interviewInvitationsSentAt?: Date;
   interviewInvitationCount?: number;
   regretLettersSent: boolean;
   regretLettersSentAt?: Date;
   regretLetterCount?: number;
}

export interface IScreeningResult extends Document {
   jobId: Types.ObjectId;
   totalApplicants: number;
   shortlistSize: number;
   shortlist: ShortlistedCandidate[];
   screenedAt: Date;
   modelUsed: string;
   promptSnapshot: string;
   /** How many 25-candidate batches were used */
   totalBatches?: number;
   finalSelection?: IFinalSelection;
   emailLog?: IEmailLog;
}

const criteriaScoresSchema = new Schema(
   {
      skills: { type: Number },
      experience: { type: Number },
      education: { type: Number },
      projects: { type: Number },
      availability: { type: Number },
   },
   { _id: false },
);

const shortlistedCandidateSchema = new Schema<ShortlistedCandidate>(
   {
      candidateId: { type: String, required: true },
      rank: { type: Number, required: true },
      matchScore: { type: Number, required: true, min: 0, max: 100 },
      criteriaScores: { type: criteriaScoresSchema },
      strengths: [String],
      gaps: [String],
      recommendation: String,
   },
   { _id: false },
);

const finalSelectionSchema = new Schema<IFinalSelection>(
   {
      selectedCandidateIds: [String],
      rejectedCandidateIds: [String],
      talentPoolCandidateIds: [String],
      selectionType: {
         type: String,
         enum: ["ai_recommended", "manual"],
         required: true,
      },
      finalizedAt: { type: Date, required: true },
      finalizedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      interviewRounds: [
         new Schema(
            {
               roundNumber: { type: Number, required: true },
               title: { type: String, required: true },
               type: {
                  type: String,
                  enum: [
                     "phone",
                     "technical",
                     "cultural",
                     "panel",
                     "final",
                     "other",
                  ],
                  required: true,
               },
               scheduledDate: Date,
               location: String,
               notes: String,
               interviewers: [String],
            },
            { _id: false },
         ),
      ],
   },
   { _id: false },
);

const emailLogSchema = new Schema<IEmailLog>(
   {
      interviewInvitationsSent: { type: Boolean, default: false },
      interviewInvitationsSentAt: Date,
      interviewInvitationCount: Number,
      regretLettersSent: { type: Boolean, default: false },
      regretLettersSentAt: Date,
      regretLetterCount: Number,
   },
   { _id: false },
);

const screeningResultSchema = new Schema<IScreeningResult>(
   {
      jobId: {
         type: Schema.Types.ObjectId,
         ref: "Job",
         required: true,
         unique: true,
      },
      totalApplicants: { type: Number, required: true },
      shortlistSize: { type: Number, required: true },
      shortlist: { type: [shortlistedCandidateSchema], default: [] },
      screenedAt: { type: Date, default: Date.now },
      modelUsed: { type: String, required: true },
      promptSnapshot: { type: String, default: "" },
      totalBatches: { type: Number },
      finalSelection: { type: finalSelectionSchema, default: undefined },
      emailLog: { type: emailLogSchema, default: undefined },
   },
   { timestamps: true },
);

screeningResultSchema.index({ jobId: 1 });

export const ScreeningResult = model<IScreeningResult>(
   "ScreeningResult",
   screeningResultSchema,
);
