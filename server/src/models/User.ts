import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
   name: string;
   email: string;
   password?: string;
   googleId?: string;
   avatar?: string;
   role: "candidate" | "recruiter" | "admin";
   createdAt: Date;
   comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
   {
      name: { type: String, required: true, trim: true },
      email: {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true,
      },
      password: { type: String, required: false, select: false },
      googleId: { type: String, required: false, select: false },
      avatar: { type: String, required: false },
      role: {
         type: String,
         enum: ["candidate", "recruiter", "admin"],
         default: "candidate",
      },
   },
   { timestamps: true },
);

userSchema.pre("save", async function (next) {
   if (!this.isModified("password") || !this.password) return next();
   this.password = await bcrypt.hash(this.password, 12);
   next();
});

userSchema.methods.comparePassword = function (
   candidate: string,
): Promise<boolean> {
   if (!this.password) return Promise.resolve(false);
   return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser>("User", userSchema);
