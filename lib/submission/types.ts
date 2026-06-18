import type { MemoryEntry } from "@/lib/memory/types";
import type { ClientScreeningSummary, MissingInfo, ReadinessScore, RiskSignal, ScreeningFacts } from "@/lib/screening/types";

export type SubmissionStatus =
  | "not_submitted"
  | "draft"
  | "pending_approval"
  | "approved"
  | "submitted"
  | "client_rejected"
  | "client_interviewing";

export type FitLevel = "strong" | "good" | "moderate" | "weak";
export type OverallFit = "strong_fit" | "good_fit" | "moderate_fit" | "weak_fit";

export interface ClientReadySummary extends ClientScreeningSummary {
  oneLiner: string;
  keyHighlights: string[];
  relevantProjects: { projectName: string; role: string; relevance: string }[];
  compensationSummary: string;
  availabilitySummary: string;
  educationSummary: string;
  whyThisCandidate: string;
}

export interface FitGapExplanation {
  overall: OverallFit;
  dimensions: {
    category: string;
    fitLevel: FitLevel;
    explanation: string;
    evidence: string[];
  }[];
  summary: string;
  recommendedAction: string;
}

export interface RiskDisclosure {
  hasRisks: boolean;
  riskCount: number;
  highRiskCount: number;
  items: {
    riskType: string;
    label: string;
    severity: "high" | "medium" | "low";
    disclosure: string;
    likelihood: number;
    mitigation: string;
    dismissedByRecruiter: boolean;
  }[];
  executiveSummary: string;
  noGoFlags: string[];
  mitigationPlan: string;
  disclaimer: string;
}

export interface SubmissionEmailDraft {
  subject: string;
  htmlBody: string;
  textBody: string;
  generatedAt: string;
  model: string;
  metadata: Record<string, unknown>;
}

export type TrackerRow = Record<string, string | number | boolean | null>;

export interface SubmissionApprovalConfig {
  requiresApproval: boolean;
  approverRoles: string[];
  autoApproveLevels: string[];
}

export interface SubmissionApprovalStatus {
  status: "not_required" | "pending" | "approved" | "rejected";
  requestedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  approverId: string | null;
  reason: string | null;
}

export interface SubmissionPackage {
  applicationId: string;
  candidateId: string;
  jobId: string;
  clientId: string;
  candidate: Record<string, any>;
  job: Record<string, any>;
  facts: ScreeningFacts;
  gaps: MissingInfo[];
  risks: RiskSignal[];
  readiness: ReadinessScore;
  summary: ClientReadySummary;
  fitGapExplanation: FitGapExplanation;
  riskDisclosure: RiskDisclosure;
  emailDraft: SubmissionEmailDraft | null;
  trackerRow: TrackerRow;
  submissionStatus: SubmissionStatus;
  submittedAt: string | null;
  clientFeedback: string | null;
  recruiterNote: string | null;
  companyProfile: {
    name: string;
    brandName: string;
    website: string;
    email: string;
    phone: string;
    tagline: string;
  };
  history: MemoryEntry[];
}

