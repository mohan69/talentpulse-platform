import { PipelineStage, type CandidateSource } from "@prisma/client";

export type RevenueApplication = {
  id: string;
  stage: PipelineStage;
  matchScore: number | null;
  submittedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    currentCity: string | null;
    currentCompany: string | null;
    currentDesignation: string | null;
    totalExperience: number;
    relevantExperience: number;
    skills: string[];
    currentCtc: number | null;
    expectedCtc: number | null;
    noticePeriod: number | null;
    aiSummary: string | null;
    source: CandidateSource | string;
  };
  job: {
    id: string;
    title: string;
    location: string;
    experienceMin: number;
    experienceMax: number;
    skills: string[];
    salaryMin: number | null;
    salaryMax: number | null;
    openings: number;
    priority: string;
    status: string;
    recruiter?: { id: string; name: string | null; email: string | null } | null;
    client?: { id: string; name: string } | null;
  };
  interviews?: { id: string; status: string; outcome: string; rating: number | null }[];
  offers?: { id: string; status: string; offeredCtc: number; feeAmount: number | null; feePercent: number | null }[];
};

const stageOrder: Record<string, number> = {
  NEW: 0,
  AI_SCREENING: 1,
  REVIEWED: 2,
  SUBMITTED: 3,
  INTERVIEW_SCHEDULED: 4,
  INTERVIEW_COMPLETE: 5,
  OFFER_EXTENDED: 6,
  OFFER_ACCEPTED: 7,
  JOINED: 8,
  REJECTED: -1,
  ON_HOLD: 1,
};

const stageProbability: Record<string, number> = {
  NEW: 0.02,
  AI_SCREENING: 0.05,
  REVIEWED: 0.08,
  SUBMITTED: 0.15,
  INTERVIEW_SCHEDULED: 0.25,
  INTERVIEW_COMPLETE: 0.35,
  OFFER_EXTENDED: 0.6,
  OFFER_ACCEPTED: 0.85,
  JOINED: 1,
  ON_HOLD: 0.05,
  REJECTED: 0,
};

export const funnelStages = [
  "Candidate",
  "Shortlisted",
  "Submitted",
  "Interview",
  "Offer",
  "Joined",
  "Revenue",
];

export function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "Rs 0";
  if (value >= 10000000) return `Rs ${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `Rs ${(value / 100000).toFixed(1)} L`;
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

export function daysSince(value: Date | string | null | undefined) {
  if (!value) return 999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000));
}

export function expectedFee(app: RevenueApplication, defaultFeePercent = 8) {
  const acceptedOffer = app.offers?.find((offer) => offer.status === "ACCEPTED" || offer.status === "EXTENDED");
  if (acceptedOffer?.feeAmount) return acceptedOffer.feeAmount;
  const salaryMid = app.job.salaryMin && app.job.salaryMax
    ? (app.job.salaryMin + app.job.salaryMax) / 2
    : app.candidate.expectedCtc ?? app.candidate.currentCtc ?? acceptedOffer?.offeredCtc ?? 0;
  return Math.round(Math.max(0, salaryMid) * (defaultFeePercent / 100));
}

export function profileCompleteness(candidate: RevenueApplication["candidate"]) {
  const fields = [
    candidate.name,
    candidate.email,
    candidate.phone,
    candidate.currentCity,
    candidate.currentCompany,
    candidate.currentDesignation,
    candidate.totalExperience > 0,
    candidate.skills.length > 0,
    candidate.currentCtc || candidate.expectedCtc,
    candidate.noticePeriod !== null,
    candidate.aiSummary,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function hasCriticalReadinessFields(candidate: RevenueApplication["candidate"]) {
  return Boolean(
    candidate.email &&
    candidate.phone &&
    candidate.skills.length > 0 &&
    candidate.totalExperience > 0 &&
    candidate.currentCity &&
    candidate.noticePeriod !== null &&
    (candidate.currentCtc !== null || candidate.expectedCtc !== null) &&
    (candidate.aiSummary || candidate.source)
  );
}

export function missingInformation(app: RevenueApplication) {
  const c = app.candidate;
  return [
    !c.phone ? "Phone number" : null,
    !c.currentCity ? "Current location" : null,
    !c.currentCompany ? "Current company" : null,
    !c.currentDesignation ? "Current title" : null,
    c.skills.length === 0 ? "Skills" : null,
    c.currentCtc == null ? "Current CTC" : null,
    c.expectedCtc == null ? "Expected CTC" : null,
    c.noticePeriod == null ? "Notice period" : null,
  ].filter(Boolean) as string[];
}

export function riskIndicators(app: RevenueApplication) {
  const c = app.candidate;
  const risks = [
    c.noticePeriod != null && c.noticePeriod > 60 ? "Long notice period" : null,
    c.expectedCtc != null && c.currentCtc != null && c.expectedCtc > c.currentCtc * 1.5 ? "High compensation jump" : null,
    profileCompleteness(c) < 75 ? "Incomplete profile" : null,
    daysSince(app.updatedAt) > 21 && !["JOINED", "REJECTED"].includes(app.stage) ? "Pipeline stale" : null,
    app.matchScore != null && app.matchScore < 65 ? "Weak match score" : null,
  ].filter(Boolean) as string[];
  return risks.length ? risks : ["No major risk detected"];
}

export function recommendationFor(app: RevenueApplication) {
  const missing = missingInformation(app);
  const risks = riskIndicators(app).filter((risk) => risk !== "No major risk detected");
  if (missing.includes("Notice period")) return "Verify Notice";
  if (missing.includes("Current CTC") || missing.includes("Expected CTC")) return "Verify Compensation";
  if (missing.length > 2) return "Request Updated Resume";
  if (stageOrder[app.stage] < stageOrder.SUBMITTED && risks.length <= 1) return "Submit To Client";
  if (app.stage === "SUBMITTED") return "Schedule Interview";
  if (app.stage === "INTERVIEW_COMPLETE") return "Move To Offer Stage";
  return "Keep Warm";
}

export function computeApplicationIntelligence(app: RevenueApplication) {
  const completeness = profileCompleteness(app.candidate);
  const matchScore = app.matchScore ?? 50;
  const missing = missingInformation(app);
  const risks = riskIndicators(app);
  const stageWeight = Math.max(0, stageOrder[app.stage]) * 3;
  const rawReadiness = Math.round(matchScore * 0.4 + completeness * 0.38 + stageWeight + Math.max(0, 14 - missing.length * 4));
  const readiness = Math.min(hasCriticalReadinessFields(app.candidate) ? 100 : 95, rawReadiness);
  const base = stageProbability[app.stage] ?? 0.1;
  const riskPenalty = risks.filter((risk) => risk !== "No major risk detected").length * 0.05;
  const qualityBoost = Math.max(0, readiness - 70) / 250;
  const interviewProbability = Math.min(0.96, Math.max(0.05, base + qualityBoost - riskPenalty + (stageOrder[app.stage] >= 3 ? 0.18 : 0)));
  const offerProbability = Math.min(0.92, Math.max(0.03, interviewProbability * (stageOrder[app.stage] >= 5 ? 0.95 : 0.58)));
  const joiningProbability = Math.min(0.9, Math.max(0.02, offerProbability * (app.candidate.noticePeriod != null && app.candidate.noticePeriod <= 30 ? 0.86 : 0.68)));
  const revenuePotential = Math.round(expectedFee(app) * joiningProbability);

  return {
    applicationId: app.id,
    candidateId: app.candidate.id,
    candidateName: app.candidate.name,
    jobTitle: app.job.title,
    clientName: app.job.client?.name ?? "Unassigned client",
    recruiterName: app.job.recruiter?.name ?? "Unassigned",
    stage: app.stage,
    readiness,
    interviewProbability: Math.round(interviewProbability * 100),
    offerProbability: Math.round(offerProbability * 100),
    joiningProbability: Math.round(joiningProbability * 100),
    revenuePotential,
    risks,
    missing,
    recommendation: recommendationFor(app),
  };
}

export function stageBucket(stage: string) {
  if (stage === "JOINED") return "Joined";
  if (stage === "OFFER_ACCEPTED" || stage === "OFFER_EXTENDED") return "Offer";
  if (stage === "INTERVIEW_SCHEDULED" || stage === "INTERVIEW_COMPLETE") return "Interview";
  if (stage === "SUBMITTED") return "Submitted";
  if (stage === "REVIEWED" || stage === "AI_SCREENING") return "Shortlisted";
  return "Candidate";
}
