import type { Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { User } from "../models";
import { signToken, sendSuccess, AppError } from "../utils";
import { config } from "../config";

export const registerValidation = [
   body("name").trim().notEmpty().withMessage("Name is required"),
   body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
   body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
];

export const loginValidation = [
   body("email").isEmail().normalizeEmail(),
   body("password").notEmpty(),
];

export async function register(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role?: string;
   };

   const existing = await User.findOne({ email });
   if (existing) return next(new AppError("Email already in use", 409));

   const validRoles = ["candidate", "recruiter"];
   const assignedRole = role && validRoles.includes(role) ? role : "candidate";

   const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
   });
   const token = signToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
   });

   sendSuccess(
      res,
      {
         token,
         user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
         },
      },
      "Account created",
      201,
   );
}

export async function login(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const { email, password } = req.body as { email: string; password: string };

   const user = await User.findOne({ email }).select("+password");
   if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Invalid credentials", 401));
   }

   const token = signToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
   });

   sendSuccess(res, {
      token,
      user: {
         id: user._id,
         name: user.name,
         email: user.email,
         role: user.role,
      },
   });
}

export async function getMe(req: Request, res: Response): Promise<void> {
   const user = await User.findById(req.user!.userId);
   sendSuccess(res, user);
}

// ── Google OAuth ────────────────────────────────────────────────────────────

export function googleRedirect(
   _req: Request,
   res: Response,
   next: NextFunction,
): void {
   if (!config.google.clientId) {
      return next(new AppError("Google OAuth is not configured", 503));
   }
   const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
   });
   res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
   );
}

export async function googleCallback(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   const { code, error } = req.query as { code?: string; error?: string };

   if (error || !code) {
      return res.redirect(
         `${config.clientUrl}/login?error=${encodeURIComponent(error ?? "oauth_cancelled")}`,
      ) as unknown as void;
   }

   // Exchange code for tokens
   const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
         code,
         client_id: config.google.clientId,
         client_secret: config.google.clientSecret,
         redirect_uri: config.google.redirectUri,
         grant_type: "authorization_code",
      }),
   });

   if (!tokenRes.ok) {
      return next(
         new AppError("Failed to exchange Google authorization code", 400),
      );
   }

   const tokenData = (await tokenRes.json()) as { access_token: string };

   // Fetch Google user profile
   const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
         headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
   );

   if (!profileRes.ok) {
      return next(new AppError("Failed to retrieve Google profile", 400));
   }

   const googleUser = (await profileRes.json()) as {
      sub: string;
      name: string;
      email: string;
      picture?: string;
   };

   // Only allow sign-in for accounts that already exist — no auto-registration
   const user = await User.findOne({
      $or: [{ googleId: googleUser.sub }, { email: googleUser.email }],
   });

   if (!user) {
      return res.redirect(
         `${config.clientUrl}/login?error=${encodeURIComponent("no_account")}`,
      ) as unknown as void;
   }

   // Link Google ID to an existing email-based account (first-time Google sign-in)
   if (!user.googleId) {
      user.googleId = googleUser.sub;
      if (googleUser.picture && !user.avatar) user.avatar = googleUser.picture;
      await user.save();
   }

   const token = signToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
   });
   const userData = JSON.stringify({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
   });

   // Redirect to client callback page with credentials in query
   const clientParams = new URLSearchParams({ token, user: userData });
   res.redirect(`${config.clientUrl}/auth/callback?${clientParams.toString()}`);
}
