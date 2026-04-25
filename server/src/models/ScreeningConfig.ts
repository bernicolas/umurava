import { Schema, model, Document, Types } from "mongoose";

export interface IScoringWeights {
   skills: number;
   experience: number;
   education: number;
   projects: number;
   availability: number;
}

export interface IScreeningConfig extends Document {
   userId: Types.ObjectId;
   scoringWeights: IScoringWeights;
   minScoreThreshold: number;
   customInstructions: string;
   preferImmediateAvailability: boolean;
   /** Auto-add near-miss candidates to talent pool after screening */
   autoTalentPool: boolean;
   /** How many near-miss candidates to auto-add (0 = disabled) */
   autoTalentPoolCount: number;
   /** Default shortlist size used when creating new jobs */
   defaultShortlistSize: 5 | 10 | 15 | 20 | 30 | 50;
   /** Default strategy for combining multiple screening runs */
   defaultCombineStrategy: "average" | "max" | "min";
}

const screeningConfigSchema = new Schema<IScreeningConfig>(
   {
      userId: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
         unique: true,
      },
      scoringWeights: {
         skills: { type: Number, default: 35, min: 0, max: 100 },
         experience: { type: Number, default: 30, min: 0, max: 100 },
         education: { type: Number, default: 15, min: 0, max: 100 },
         projects: { type: Number, default: 15, min: 0, max: 100 },
         availability: { type: Number, default: 5, min: 0, max: 100 },
      },
      minScoreThreshold: { type: Number, default: 0, min: 0, max: 80 },
      customInstructions: { type: String, default: "", maxlength: 1500 },
      preferImmediateAvailability: { type: Boolean, default: false },
      autoTalentPool: { type: Boolean, default: true },
      autoTalentPoolCount: { type: Number, default: 3, min: 0, max: 10 },
      defaultShortlistSize: {
         type: Number,
         enum: [5, 10, 15, 20, 30, 50],
         default: 10,
      },
      defaultCombineStrategy: {
         type: String,
         enum: ["average", "max", "min"],
         default: "average",
      },
   },
   { timestamps: true },
);

export const ScreeningConfig = model<IScreeningConfig>(
   "ScreeningConfig",
   screeningConfigSchema,
);
