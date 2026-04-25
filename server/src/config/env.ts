import dotenv from "dotenv";
dotenv.config();

const requiredEnvVars = [
   "MONGODB_URI",
   "JWT_SECRET",
   "GEMINI_API_KEY",
] as const;

for (const key of requiredEnvVars) {
   if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
   }
}

export const config = {
   port: parseInt(process.env.PORT ?? "5000", 10),
   nodeEnv: process.env.NODE_ENV ?? "development",
   mongodbUri: process.env.MONGODB_URI!,
   jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
   },
   geminiApiKey: process.env.GEMINI_API_KEY!,
   clientUrl: process.env.CLIENT_URL ?? "http://localhost:3000",
   maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? "10", 10),
   google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirectUri:
         process.env.GOOGLE_REDIRECT_URI ??
         "http://localhost:5000/api/v1/auth/google/callback",
   },
};
