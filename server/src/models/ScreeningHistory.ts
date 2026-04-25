import { Schema, model, Document, Types } from "mongoose";
import type { ShortlistedCandidate } from "../types";

export interface IScreeningHistory extends Document {
   jobId:            Types.ObjectId;
   runNumber:        number;
   totalApplicants:  number;
   shortlistSize:    number;
   topScore:         number;
   avgScore:         number;
   modelUsed:        string;
   screenedAt:       Date;
   /** How many 25-candidate batches were used in this run */
   totalBatches?:    number;
   shortlist:        ShortlistedCandidate[];
}

const criteriaScoresSchema = new Schema(
   {
      skills:       { type: Number },
      experience:   { type: Number },
      education:    { type: Number },
      projects:     { type: Number },
      availability: { type: Number },
   },
   { _id: false },
);

const shortlistedCandidateSchema = new Schema<ShortlistedCandidate>(
   {
      candidateId:    { type: String,  required: true },
      rank:           { type: Number,  required: true },
      matchScore:     { type: Number,  required: true, min: 0, max: 100 },
      criteriaScores: { type: criteriaScoresSchema },
      strengths:      [String],
      gaps:           [String],
      recommendation: String,
   },
   { _id: false },
);

const screeningHistorySchema = new Schema<IScreeningHistory>(
   {
      jobId:           { type: Schema.Types.ObjectId, ref: "Job", required: true },
      runNumber:       { type: Number,  required: true },
      totalApplicants: { type: Number,  required: true },
      shortlistSize:   { type: Number,  required: true },
      topScore:        { type: Number,  required: true },
      avgScore:        { type: Number,  required: true },
      modelUsed:       { type: String,  required: true },
      screenedAt:      { type: Date,    default: Date.now },
      totalBatches:    { type: Number },
      shortlist:       { type: [shortlistedCandidateSchema], default: [] },
   },
   { timestamps: true },
);

screeningHistorySchema.index({ jobId: 1, screenedAt: -1 });

export const ScreeningHistory = model<IScreeningHistory>("ScreeningHistory", screeningHistorySchema);