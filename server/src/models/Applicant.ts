import { Schema, model, Document, Types } from "mongoose";
import type { TalentProfile } from "../types";

export interface IApplicant extends Document {
   jobId: Types.ObjectId;
   source: "platform" | "external";
   profile: TalentProfile;
   resumeUrl?: string;
   rawData?: Record<string, unknown>;
   createdAt: Date;
}

const skillSchema = new Schema(
   {
      name: String,
      level: {
         type: String,
         enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
      },
      yearsOfExperience: Number,
   },
   { _id: false },
);

const applicantSchema = new Schema<IApplicant>(
   {
      jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
      source: { type: String, enum: ["platform", "external"], required: true },
      profile: {
         firstName: { type: String, required: true },
         lastName: { type: String, required: true },
         email: { type: String, required: true },
         headline: { type: String, required: true },
         bio: String,
         location: { type: String, required: true },
         skills: [skillSchema],
         languages: [
            {
               name: String,
               proficiency: {
                  type: String,
                  enum: ["Basic", "Conversational", "Fluent", "Native"],
               },
               _id: false,
            },
         ],
         experience: [
            {
               company: String,
               role: String,
               startDate: String,
               endDate: String,
               description: String,
               technologies: [String],
               isCurrent: Boolean,
               _id: false,
            },
         ],
         education: [
            {
               institution: String,
               degree: String,
               fieldOfStudy: String,
               startYear: Number,
               endYear: Number,
               _id: false,
            },
         ],
         certifications: [
            {
               name: String,
               issuer: String,
               issueDate: String,
               _id: false,
            },
         ],
         projects: [
            {
               name: String,
               description: String,
               technologies: [String],
               role: String,
               link: String,
               startDate: String,
               endDate: String,
               _id: false,
            },
         ],
         availability: {
            status: {
               type: String,
               enum: ["Available", "Open to Opportunities", "Not Available"],
            },
            type: {
               type: String,
               enum: ["Full-time", "Part-time", "Contract"],
            },
            startDate: String,
            _id: false,
         },
         socialLinks: { type: Schema.Types.Mixed },
      },
      resumeUrl: String,
      rawData: { type: Schema.Types.Mixed },
   },
   { timestamps: true },
);

applicantSchema.index({ jobId: 1 });
applicantSchema.index({ "profile.email": 1, jobId: 1 });

export const Applicant = model<IApplicant>("Applicant", applicantSchema);
