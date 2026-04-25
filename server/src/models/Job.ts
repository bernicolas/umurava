import { Schema, model, Document, Types } from "mongoose";

export interface IJob extends Document {
   title: string;
   description: string;
   requirements: string;
   requiredSkills: string[];
   requiredExperience: number;
   location: string;
   type: "Full-time" | "Part-time" | "Contract" | "Internship";
   shortlistSize: 5 | 10 | 15 | 20 | 30 | 50;
   /** Job lifecycle: whether the posting is accepting applications */
   status: "draft" | "open" | "closed";
   /** AI screening state, independent of job lifecycle */
   screeningStatus: "none" | "running" | "done";
   screeningStartedAt?: Date;
   screeningSessionId?: string;
   /** Applicant count captured at last screening run — used to detect new applicants */
   lastScreenedApplicantCount: number;
   createdBy: Types.ObjectId;
   createdAt: Date;
   updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
   {
      title: { type: String, required: true, trim: true },
      description: { type: String, required: true },
      requirements: { type: String, required: true },
      requiredSkills: [{ type: String }],
      requiredExperience: { type: Number, required: true, min: 0 },
      location: { type: String, required: true },
      type: {
         type: String,
         enum: ["Full-time", "Part-time", "Contract", "Internship"],
         required: true,
      },
      shortlistSize: {
         type: Number,
         enum: [5, 10, 15, 20, 30, 50],
         default: 10,
      },
      status: {
         type: String,
         enum: ["draft", "open", "closed"],
         default: "draft",
      },
      screeningStatus: {
         type: String,
         enum: ["none", "running", "done"],
         default: "none",
      },
      screeningStartedAt: { type: Date, default: null },
      screeningSessionId: {type: String, default: null },
      lastScreenedApplicantCount: { type: Number, default: 0 },
      createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
   },
   { timestamps: true },
);

export const Job = model<IJob>("Job", jobSchema);
