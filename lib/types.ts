import type { PipelineStage, UserRole, JobStatus, InterviewStatus, CandidateSource } from "@prisma/client";

export type { PipelineStage, UserRole, JobStatus, InterviewStatus, CandidateSource };

export const STAGE_LABELS: Record<PipelineStage, string> = {
  NEW: "New",
  AI_SCREENING: "AI Screening",
  REVIEWED: "Reviewed",
  SUBMITTED: "Submitted",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETE: "Interview Done",
  OFFER_EXTENDED: "Offer Extended",
  OFFER_ACCEPTED: "Offer Accepted",
  JOINED: "Joined",
  REJECTED: "Rejected",
  ON_HOLD: "On Hold",
};

export const STAGE_ORDER: PipelineStage[] = [
  "NEW",
  "AI_SCREENING",
  "REVIEWED",
  "SUBMITTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETE",
  "OFFER_EXTENDED",
  "OFFER_ACCEPTED",
  "JOINED",
];

export const STAGE_COLORS: Record<PipelineStage, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  AI_SCREENING: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
  REVIEWED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  SUBMITTED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
  INTERVIEW_SCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  INTERVIEW_COMPLETE: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
  OFFER_EXTENDED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  OFFER_ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  JOINED: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  ON_HOLD: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  CLIENT: "Client",
  CANDIDATE: "Candidate",
};
