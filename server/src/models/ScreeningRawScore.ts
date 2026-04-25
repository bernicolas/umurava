import { Schema, model, Document, Types } from "mongoose";
import type { ShortlistedCandidate } from "../types";

/**
 * Stores raw AI scores for individual candidates during a paginated screening
 * run. Written after each page completes. Deleted once the final
 * ScreeningResult has been written. A 2-hour TTL index auto-deletes orphaned
 * rows if the cleanup code never runs (crash, etc.).
 */
export interface IScreeningRawScore extends Document {
   jobId:          Types.ObjectId;
   /** Identifies this specific run — survives server restarts via Job.screeningSessionId */
   sessionId:      string;
   candidateId:    string;
   /** Which page (1-based) produced this score */
   pageNumber:     number;
   matchScore:     number;
   criteriaScores: ShortlistedCandidate["criteriaScores"];
   strengths:      string[];
   gaps:           string[];
   recommendation: string;
   modelUsed:      string;
   createdAt:      Date;
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

const screeningRawScoreSchema = new Schema<IScreeningRawScore>(
   {
      jobId:       { type: Schema.Types.ObjectId, ref: "Job", required: true },
      sessionId:   { type: String, required: true },
      candidateId: { type: String, required: true },
      pageNumber:  { type: Number, required: true },
      matchScore:  { type: Number, required: true, min: 0, max: 100 },
      criteriaScores: { type: criteriaScoresSchema },
      strengths:      [String],
      gaps:           [String],
      recommendation: { type: String },
      modelUsed:      { type: String, required: true },
   },
   { timestamps: true },
);

// Fast lookup: all scores for a session, or scores for a specific page
screeningRawScoreSchema.index({ jobId: 1, sessionId: 1, pageNumber: 1 });

// TTL safety net: orphaned rows auto-delete after 2 hours
screeningRawScoreSchema.index(
   { createdAt: 1 },
   { expireAfterSeconds: 60 * 60 * 2 },
);

export const ScreeningRawScore = model<IScreeningRawScore>(
   "ScreeningRawScore",
   screeningRawScoreSchema,
);