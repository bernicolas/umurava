export interface Skill {
   name: string;
   level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
   yearsOfExperience: number;
}

export interface WorkExperience {
   company: string;
   role: string;
   startDate: string;
   endDate: string;
   description: string;
   technologies: string[];
   isCurrent: boolean;
}

export interface Education {
   institution: string;
   degree: string;
   fieldOfStudy: string;
   startYear: number;
   endYear: number | null;
}

export interface TalentProfile {
   firstName: string;
   lastName: string;
   email: string;
   headline: string;
   bio?: string;
   location: string;
   skills: Skill[];
   languages?: {
      name: string;
      proficiency: "Basic" | "Conversational" | "Fluent" | "Native";
   }[];
   experience: WorkExperience[];
   education: Education[];
   certifications?: { name: string; issuer: string; issueDate: string }[];
   projects?: {
      name: string;
      description: string;
      technologies: string[];
      role: string;
      link?: string;
      startDate: string;
      endDate?: string;
   }[];
   availability: {
      status: "Available" | "Open to Opportunities" | "Not Available";
      type: "Full-time" | "Part-time" | "Contract";
      startDate?: string;
   };
   socialLinks?: Record<string, string>;
}

export interface Job {
   _id: string;
   title: string;
   description: string;
   requirements: string;
   requiredSkills: string[];
   requiredExperience: number;
   location: string;
   type: "Full-time" | "Part-time" | "Contract" | "Internship";
   shortlistSize: 5 | 10 | 15 | 20 | 30 | 50;
   /** Job lifecycle */
   status: "draft" | "open" | "closed";
   /** AI screening state */
   screeningStatus: "none" | "running" | "done";
   lastScreenedApplicantCount: number;
   /** Current applicant count — populated by server aggregation */
   applicantCount?: number;
   createdBy: string;
   createdAt: string;
   updatedAt: string;
}

export type JobFormData = Omit<
   Job,
   | "_id"
   | "status"
   | "screeningStatus"
   | "lastScreenedApplicantCount"
   | "createdBy"
   | "createdAt"
   | "updatedAt"
>;

export interface Applicant {
   _id: string;
   jobId: string;
   source: "platform" | "external";
   profile: TalentProfile;
   resumeUrl?: string;
   createdAt: string;
}

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
   applicant?: {
      _id: string;
      source: string;
      profile: Pick<
         TalentProfile,
         | "firstName"
         | "lastName"
         | "email"
         | "headline"
         | "location"
         | "skills"
         | "availability"
         | "socialLinks"
      >;
   };
}

export interface ScreeningResult {
   _id: string;
   jobId: string;
   totalApplicants: number;
   shortlistSize: number;
   shortlist: ShortlistedCandidate[];
   screenedAt: string;
   modelUsed: string;
   finalSelection?: FinalSelection;
   emailLog?: EmailLog;
   totalBatches?: number;
   status?: "running" | "done" | "failed" | "none";
}

export interface ShortlistWithJob extends ScreeningResult {
   job: Pick<
      Job,
      | "title"
      | "location"
      | "type"
      | "status"
      | "requiredSkills"
      | "shortlistSize"
   > | null;
}

export interface ScreeningHistoryEntry {
   _id: string;
   jobId: string;
   runNumber: number;
   totalApplicants: number;
   shortlistSize: number;
   topScore: number;
   avgScore: number;
   modelUsed: string;
   screenedAt: string;
   /** How many 25-candidate batches were used */
   totalBatches?: number;
   /** Full shortlist — populated only by the detail endpoint */
   shortlist?: ShortlistedCandidate[];
}

/**
 * A candidate entry in a combined/averaged shortlist.
 * avgScore is the mean of matchScore across all runs that included this candidate.
 * appearances is how many runs this candidate appeared in.
 */
export interface CombinedCandidate {
   candidateId: string;
   rank: number;
   avgScore: number;
   /** Scores from each individual run, keyed by runNumber */
   runScores: Record<number, number>;
   appearances: number;
   /** criteriaScores averaged across all runs */
   avgCriteriaScores?: CriteriaScores;
   strengths: string[];
   gaps: string[];
   recommendation: string;
   applicant?: ShortlistedCandidate["applicant"];
}

export interface CombinedShortlistResult {
   jobId: string;
   runIds: string[];
   runNumbers: number[];
   totalRuns: number;
   shortlistSize: number;
   candidates: CombinedCandidate[];
   computedAt: string;
}

export interface ApplicantScreeningDetail {
   matchScore: number;
   rank: number;
   criteriaScores: CriteriaScores | null;
   strengths: string[];
   gaps: string[];
   recommendation: string;
   screenedAt: string;
   totalApplicants: number;
   shortlistSize: number;
}

export interface ApplicantScreeningHistoryRun extends ApplicantScreeningDetail {
   runNumber: number;
   modelUsed: string;
}

export interface ApplicantDetail {
   applicant: Applicant;
   job: Pick<
      Job,
      | "_id"
      | "title"
      | "location"
      | "type"
      | "status"
      | "requiredSkills"
      | "requiredExperience"
      | "shortlistSize"
   > | null;
   screening: ApplicantScreeningDetail | null;
   screeningHistory: ApplicantScreeningHistoryRun[];
}

export interface ApiResponse<T = unknown> {
   success: boolean;
   data?: T;
   message?: string;
   errors?: Record<string, string[]>;
}

export interface PaginatedData<T> {
   items: T[];
   meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
   };
}

export interface AuthUser {
   id: string;
   name: string;
   email: string;
   role: "candidate" | "recruiter" | "admin";
}

export interface AuthResponse {
   token: string;
   user: AuthUser;
}

export interface ScoringWeights {
   skills: number;
   experience: number;
   education: number;
   projects: number;
   availability: number;
}

export interface ScreeningConfig {
   scoringWeights: ScoringWeights;
   minScoreThreshold: number;
   customInstructions: string;
   preferImmediateAvailability: boolean;
   autoTalentPool: boolean;
   autoTalentPoolCount: number;
   defaultShortlistSize: 5 | 10 | 15 | 20 | 30 | 50;
   defaultCombineStrategy: "average" | "max" | "min";
}

export interface ChatSessionSummary {
   _id: string;
   title: string;
   createdAt: string;
   updatedAt: string;
}

export interface ChatMessage {
   _id?: string;
   role: "user" | "model";
   content: string;
   createdAt?: string;
}

export interface ChatSession {
   _id: string;
   title: string;
   messages: ChatMessage[];
   createdAt: string;
   updatedAt: string;
}

// ─── Final Selection & Email ─────────────────────────────────────────────────

export interface InterviewRound {
   roundNumber: number;
   title: string;
   type: "phone" | "technical" | "cultural" | "panel" | "final" | "other";
   scheduledDate?: string;
   location?: string;
   notes?: string;
   interviewers?: string[];
}

export interface FinalSelection {
   selectedCandidateIds: string[];
   rejectedCandidateIds: string[];
   talentPoolCandidateIds: string[];
   selectionType: "ai_recommended" | "manual";
   finalizedAt: string;
   finalizedBy: string;
   interviewRounds?: InterviewRound[];
}

export interface EmailLog {
   interviewInvitationsSent: boolean;
   interviewInvitationsSentAt?: string;
   interviewInvitationCount?: number;
   regretLettersSent: boolean;
   regretLettersSentAt?: string;
   regretLetterCount?: number;
}

export interface FinalizationState {
   finalized: boolean;
   finalSelection: FinalSelection | null;
   emailLog: EmailLog | null;
   shortlist: ShortlistedCandidate[];
}

export interface SendEmailResult {
   sent: number;
   failed: number;
   errors: string[];
   message: string;
}

// ─── Talent Pool ─────────────────────────────────────────────────────────────

export interface TalentPoolEntry {
   _id: string;
   jobId: string;
   applicantId: string;
   addedBy: string;
   addedAt: string;
   matchScore: number;
   jobTitle: string;
   reason?: string;
   notes?: string;
   status: "active" | "contacted" | "hired" | "archived";
   regretLetterSent: boolean;
   regretLetterSentAt?: string;
   applicant?: {
      _id: string;
      profile: Pick<
         TalentProfile,
         | "firstName"
         | "lastName"
         | "email"
         | "headline"
         | "skills"
         | "location"
         | "availability"
         | "socialLinks"
      >;
   } | null;
   createdAt: string;
   updatedAt: string;
}

// ─── Email Settings ───────────────────────────────────────────────────────────

export interface EmailSettings {
   _id?: string;
   smtpHost: string;
   smtpPort: number;
   smtpSecure: boolean;
   smtpUser: string;
   /** Never returned from server — presence indicated by smtpPassSet */
   smtpPassSet?: boolean;
   fromEmail: string;
   fromName: string;
   replyTo?: string;
   interviewSubject: string;
   interviewBody: string;
   regretSubject: string;
   regretBody: string;
   updatedAt?: string;
}

export interface EmailTemplateDefaults {
   interview: { subject: string; body: string };
   regret: { subject: string; body: string };
}
