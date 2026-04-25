import mongoose from "mongoose";
import { config } from "./env";

export async function connectDB(): Promise<void> {
   try {
      await mongoose.connect(config.mongodbUri);
      console.log("MongoDB connected");
   } catch (err) {
      console.error("MongoDB connection error:", err);
      process.exit(1);
   }
}
