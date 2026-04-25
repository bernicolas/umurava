import type {
   Request as Req,
   Response as Res,
   NextFunction as Next,
} from "express";
import { ScreeningConfig } from "../models";
import { sendSuccess, AppError } from "../utils";

export const DEFAULT_SCORING_WEIGHTS = {
   skills: 35,
   experience: 30,
   education: 15,
   projects: 15,
   availability: 5,
};

export const DEFAULT_SETTINGS = {
   scoringWeights: DEFAULT_SCORING_WEIGHTS,
   minScoreThreshold: 0,
   customInstructions: "",
   preferImmediateAvailability: false,
   autoTalentPool: true,
   autoTalentPoolCount: 3,
   defaultShortlistSize: 10 as 5 | 10 | 15 | 20 | 30 | 50,
   defaultCombineStrategy: "average" as "average" | "max" | "min",
};

function pickFields(doc: InstanceType<typeof ScreeningConfig>) {
   return {
      scoringWeights: doc.scoringWeights,
      minScoreThreshold: doc.minScoreThreshold,
      customInstructions: doc.customInstructions,
      preferImmediateAvailability: doc.preferImmediateAvailability,
      autoTalentPool: doc.autoTalentPool,
      autoTalentPoolCount: doc.autoTalentPoolCount,
      defaultShortlistSize: doc.defaultShortlistSize,
      defaultCombineStrategy: doc.defaultCombineStrategy,
   };
}

export async function getSettings(
   req: Req,
   res: Res,
   _next: Next,
): Promise<void> {
   const userId = req.user!.userId;
   const config = await ScreeningConfig.findOne({ userId });
   sendSuccess(res, config ? pickFields(config) : DEFAULT_SETTINGS);
}

export async function updateSettings(
   req: Req,
   res: Res,
   next: Next,
): Promise<void> {
   const userId = req.user!.userId;
   const {
      scoringWeights,
      minScoreThreshold,
      customInstructions,
      preferImmediateAvailability,
      autoTalentPool,
      autoTalentPoolCount,
      defaultShortlistSize,
      defaultCombineStrategy,
   } = req.body as {
      scoringWeights?: Record<string, number>;
      minScoreThreshold?: number;
      customInstructions?: string;
      preferImmediateAvailability?: boolean;
      autoTalentPool?: boolean;
      autoTalentPoolCount?: number;
      defaultShortlistSize?: number;
      defaultCombineStrategy?: string;
   };

   if (scoringWeights) {
      const {
         skills = 0,
         experience = 0,
         education = 0,
         projects = 0,
         availability = 0,
      } = scoringWeights;
      const total = skills + experience + education + projects + availability;
      if (Math.round(total) !== 100) {
         return next(
            new AppError(
               `Scoring weights must sum to 100 (current sum: ${total})`,
               422,
            ),
         );
      }
      for (const [key, val] of Object.entries(scoringWeights)) {
         if (val < 0 || val > 100) {
            return next(
               new AppError(
                  `Weight for "${key}" must be between 0 and 100`,
                  422,
               ),
            );
         }
      }
   }

   if (
      minScoreThreshold !== undefined &&
      (minScoreThreshold < 0 || minScoreThreshold > 80)
   ) {
      return next(
         new AppError("Minimum score threshold must be between 0 and 80", 422),
      );
   }

   if (customInstructions && customInstructions.length > 1500) {
      return next(
         new AppError("Custom instructions cannot exceed 1500 characters", 422),
      );
   }

   const update: Record<string, unknown> = {};
   if (scoringWeights !== undefined) update["scoringWeights"] = scoringWeights;
   if (minScoreThreshold !== undefined)
      update["minScoreThreshold"] = minScoreThreshold;
   if (customInstructions !== undefined)
      update["customInstructions"] = customInstructions;
   if (preferImmediateAvailability !== undefined)
      update["preferImmediateAvailability"] = preferImmediateAvailability;
   if (autoTalentPool !== undefined) update["autoTalentPool"] = autoTalentPool;
   if (autoTalentPoolCount !== undefined) {
      if (autoTalentPoolCount < 0 || autoTalentPoolCount > 10) {
         return next(
            new AppError("autoTalentPoolCount must be between 0 and 10", 422),
         );
      }
      update["autoTalentPoolCount"] = autoTalentPoolCount;
   }
   if (defaultShortlistSize !== undefined) {
      if (![5, 10, 15, 20, 30, 50].includes(defaultShortlistSize)) {
         return next(
            new AppError(
               "defaultShortlistSize must be one of 5, 10, 15, 20, 30, 50",
               422,
            ),
         );
      }
      update["defaultShortlistSize"] = defaultShortlistSize;
   }
   if (defaultCombineStrategy !== undefined) {
      if (!["average", "max", "min"].includes(defaultCombineStrategy)) {
         return next(
            new AppError(
               'defaultCombineStrategy must be "average", "max", or "min"',
               422,
            ),
         );
      }
      update["defaultCombineStrategy"] = defaultCombineStrategy;
   }

   const config = await ScreeningConfig.findOneAndUpdate(
      { userId },
      { $set: update },
      {
         upsert: true,
         new: true,
         runValidators: true,
         setDefaultsOnInsert: true,
      },
   );

   sendSuccess(res, pickFields(config!), "Settings saved successfully");
}
