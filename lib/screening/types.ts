import type { MemoryQueryResult } from "@/lib/memory/types";

export type FitStatus = "ok" | "stretch" | "mismatch" | "unknown";
export type LocationFitStatus = "match" | "mismatch" | "relocation_possible" | "unknown";
export type NoticeStatus = "immediate" | "short" | "long" | "unknown";
export type ScreeningSeverity = "high" | "medium" | "low" | "info";
export type ScreeningPriority = "high" | "medium" | "low";
export type ScreeningReadinessLevel = "ready_for_interview" | "likely_fit" | "needs_review" | "caution";

export type ApplicationWithScreeningData = any;

export interface ScreeningFacts {
  skillFit: { score: number; matched: string[]; missing: string[] };
  experienceFit: { score: number; candidateYears: number; requiredMin: number; requiredMax: number };
  ctcFit: { status: FitStatus; candidateCtc: number | null; budgetMax: number | null };
  locationFit: {
    status: LocationFitStatus;
    candidateCity: string | null;
    jobLocation: string | null;
  };
  noticePeriod: { days: number | null; status: NoticeStatus };
  educationFit: { degree: string | null; institution: string | null; graduationYear: number | null; assessed: boolean };
  voiceScreeningSummary: { completed: boolean; score: number | null; keyFindings: string[] } | null;
  recruiterNotesSummary: string[];
  pipelineHistory: { stageChanges: number; currentStage: string; daysInStage: number; totalDaysInPipeline: number };
  interviewOutcomes: { total: number; proceeded: number; rejected: number; averageRating: number | null };
}

export interface MissingInfo {
  category: string;
  label: string;
  severity: ScreeningSeverity;
  field?: string | null;
}

export interface RiskSignal {
  type: string;
  label: string;
  severity: Exclude<ScreeningSeverity, "info">;
  source: string;
  likelihood: number;
  evidence?: string;
}

export interface ReadinessScore {
  overall: number;
  level: ScreeningReadinessLevel;
  categories: Record<string, number>;
  riskPenalty: number;
}

export interface RecruiterQuestion {
  question: string;
  reason: string;
  priority: ScreeningPriority;
  category: string;
}

export interface ClientScreeningSummary {
  verdict: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
}

export interface ScreeningWorkbench {
  application: ApplicationWithScreeningData;
  facts: ScreeningFacts;
  gaps: MissingInfo[];
  risks: RiskSignal[];
  readiness: ReadinessScore;
  questions: RecruiterQuestion[];
  summary: ClientScreeningSummary;
  memory: MemoryQueryResult;
  candidateMemory: MemoryQueryResult;
}

