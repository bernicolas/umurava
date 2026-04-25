export interface CriteriaScores {
   skills: number;
   experience: number;
   education: number;
   projects: number;
   availability: number;
}

export interface ShortlistedCandidate {
   candidateId: string;
   rank: number;
   matchScore: number;
   criteriaScores?: CriteriaScores;
   strengths: string[];
   gaps: string[];
   recommendation: string;
}

export interface ScreeningResult {
   jobId: string;
   totalApplicants: number;
   shortlistSize: number;
   shortlist: ShortlistedCandidate[];
   screenedAt: string;
   modelUsed: string;
}

export interface ScoringWeights {
   skills: number;
   experience: number;
   education: number;
   projects: number;
   availability: number;
}

export interface ScreeningPrefs {
   scoringWeights?: ScoringWeights;
   minScoreThreshold?: number;
   customInstructions?: string;
   preferImmediateAvailability?: boolean;
}
