export interface RecruiterProductivityScore {
  recruiterId: string;
  recruiterName: string;
  recruiterEmail: string;
  period: { from: string; to: string };
  applicationsProcessed: number;
  averageDaysInPipeline: number | null;
  stageTransitionCount: number;
  activeApplications: number;
  averageMatchScore: number | null;
  highMatchCount: number;
  interviewPassRate: number | null;
  screeningToInterviewRate: number | null;
  totalSubmissions: number;
  submissionToOfferRate: number | null;
  submissionToJoinRate: number | null;
  offersExtended: number;
  offersAccepted: number;
  offersRejected: number;
  totalJoins: number;
  offerAcceptRate: number | null;
  averageDaysToOffer: number | null;
  averageDaysToJoin: number | null;
  estimatedRevenue: number;
  averageFeePerPlacement: number | null;
  totalFeeValue: number;
  projectedQuarterlyRevenue: number;
}

export interface SourceEffectiveness {
  source: string;
  sourceLabel: string;
  totalCandidates: number;
  totalApplications: number;
  activeCandidates: number;
  screened: number;
  submitted: number;
  interviewed: number;
  offered: number;
  joined: number;
  applicationToScreen: number | null;
  screenToSubmit: number | null;
  submitToInterview: number | null;
  interviewToOffer: number | null;
  offerToJoin: number | null;
  overallConversion: number | null;
  averageMatchScore: number | null;
  averageDaysToJoin: number | null;
  averageFeePerPlacement: number | null;
  totalEstimatedRevenue: number;
  estimatedROI: string;
}

export interface RevenueOpportunity {
  realizedRevenue: {
    total: number;
    byRecruiter: { recruiterId: string; recruiterName: string; amount: number }[];
    byClient: { clientId: string; clientName: string; amount: number }[];
    byMonth: { month: string; amount: number }[];
  };
  pipelineRevenue: {
    total: number;
    byStage: { stage: string; amount: number; probability: number }[];
    weightedTotal: number;
    expectedValue: number;
    optimisticValue: number;
    pessimisticValue: number;
  };
  atRiskRevenue: {
    total: number;
    staleOffers: number;
    joiningAtRisk: number;
  };
  clientRevenue: {
    clientId: string;
    clientName: string;
    totalRevenue: number;
    activeJobs: number;
    filledJobs: number;
    estimatedAnnualRevenue: number;
    revenueTrend: string;
  }[];
}

export interface ClientProfitabilitySignal {
  clientId: string;
  clientName: string;
  industry: string | null;
  isActive: boolean;
  totalJobs: number;
  activeJobs: number;
  filledJobs: number;
  totalApplications: number;
  totalSubmissions: number;
  totalInterviews: number;
  totalEstimatedRevenue: number;
  pendingPipelineValue: number;
  totalOpportunityValue: number;
  averageFeePerFill: number | null;
  applicationsPerFill: number | null;
  interviewsPerFill: number | null;
  submissionsPerFill: number | null;
  averageDaysToFill: number | null;
  revenueTrend: string;
  engagementHealth: string;
  churnRisk: string;
  lastSubmissionDate: string | null;
}

export interface PlacementProbabilitySignal {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  clientName: string;
  currentStage: string;
  baseProbability: number;
  adjustedProbability: number;
  confidenceLevel: string;
  modifiers: { name: string; label: string; delta: number; reason: string }[];
  estimatedFeeAtPlacement: number;
  expectedValue: number;
  positiveDrivers: string[];
  concerns: string[];
  nextRecommendedAction: string;
}

export interface LeaderboardEntry {
  rank: number;
  recruiterId: string;
  recruiterName: string;
  recruiterEmail: string;
  scores: { overall: number; velocity: number; quality: number; closure: number; revenue: number };
  raw: {
    totalApplications: number;
    totalSubmissions: number;
    totalInterviews: number;
    totalOffers: number;
    totalJoins: number;
    estimatedRevenue: number;
    averageDaysToJoin: number | null;
  };
  trend: string;
  previousRank: number | null;
  badges: string[];
}

export interface OwnerDashboardMetrics {
  ownerId: string;
  ownerName: string;
  ownerRole: string;
  period: { from: string; to: string };
  personal: RecruiterProductivityScore;
  rank: {
    overall: number;
    totalRecruiters: number;
    percentile: number;
    previousRank: number | null;
    trend: string;
  };
  leaderboardEntry: LeaderboardEntry;
  pipeline: {
    totalActive: number;
    byStage: { stage: string; count: number; value: number }[];
    aging: { stale: number; warning: number; healthy: number };
    expectedRevenue: number;
    topProspect: {
      applicationId: string;
      candidateName: string;
      jobTitle: string;
      probability: number;
      expectedValue: number;
    } | null;
  };
  clients: {
    totalClients: number;
    activeClients: number;
    topClients: { clientId: string; name: string; revenue: number }[];
    atRiskClients: { clientId: string; name: string; reason: string }[];
  };
  sources: SourceEffectiveness[];
  revenue: {
    realizedThisPeriod: number;
    pipelineExpected: number;
    projectedQuarterly: number;
    yoyGrowth: number | null;
  };
  recentActivity: { type: string; summary: string; timestamp: string; entityId: string }[];
}

const STAGE_PROBABILITIES: Record<string, number> = {
  NEW: 0.02,
  AI_SCREENING: 0.05,
  REVIEWED: 0.08,
  SUBMITTED: 0.15,
  INTERVIEW_SCHEDULED: 0.25,
  INTERVIEW_COMPLETE: 0.35,
  OFFER_EXTENDED: 0.6,
  OFFER_ACCEPTED: 0.85,
  JOINED: 1.0,
};

export function getStageProbability(stage: string): number {
  return STAGE_PROBABILITIES[stage] ?? 0.02;
}

export const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  NAUKRI: "Naukri",
  REFERRAL: "Referral",
  INTERNAL_DB: "Internal DB",
  DIRECT: "Direct",
  OTHER: "Other",
};

const JOIN_AFTER_STAGES = new Set([
  "SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE",
  "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED",
]);

const INTERVIEW_AFTER_STAGES = new Set([
  "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE",
  "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED",
]);

const OFFER_AFTER_STAGES = new Set(["OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"]);

export function isSubmittedStage(stage: string): boolean {
  return JOIN_AFTER_STAGES.has(stage);
}

export function isInterviewStage(stage: string): boolean {
  return INTERVIEW_AFTER_STAGES.has(stage);
}

export function isOfferStage(stage: string): boolean {
  return OFFER_AFTER_STAGES.has(stage);
}
