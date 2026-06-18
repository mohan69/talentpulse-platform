import { getScreeningWorkbench } from "@/lib/screening/service";
import { estimateFeeAmount, getDefaultFeePercent } from "@/lib/revenue/fees";
import { getStageProbability } from "@/lib/revenue/types";
import type { PlacementProbabilitySignal } from "@/lib/revenue/types";
import type { TenantContext } from "@/lib/tenant/context";

type Appish = any;
type Factish = any;
type Riskish = any;

const SIGNAL_EVALUATORS: Array<{
  name: string;
  label: string;
  evaluate: (app: Appish, facts?: Factish, risks?: Riskish[]) => { delta: number; reason: string } | null;
}> = [
  {
    name: "skill_fit", label: "Skill Fit",
    evaluate: (app, facts) => {
      if (!facts?.skillFit) return null;
      const score = facts.skillFit.score ?? 50;
      if (score >= 80) return { delta: 0.10, reason: `Strong skill match (${score}%)` };
      if (score < 40) return { delta: -0.10, reason: `Weak skill match (${score}%)` };
      return null;
    },
  },
  {
    name: "voice_screening", label: "Voice Screening",
    evaluate: (app, facts) => {
      if (!facts?.voiceScreeningSummary?.completed) return null;
      const score = facts.voiceScreeningSummary.score ?? 0;
      if (score >= 80) return { delta: 0.08, reason: `Voice screening score: ${score}/100` };
      if (score < 50) return { delta: -0.08, reason: `Voice screening concern: ${score}/100` };
      return null;
    },
  },
  {
    name: "interview_history", label: "Interview History",
    evaluate: (app, facts) => {
      if (!facts?.interviewOutcomes) return null;
      const { proceeded, rejected, total } = facts.interviewOutcomes;
      if (total === 0) return null;
      if (rejected > 0) return { delta: -0.10, reason: `${rejected} prior rejection(s) in pipeline` };
      if (proceeded === total && total >= 2) return { delta: 0.08, reason: "Consistent interview progression" };
      return null;
    },
  },
  {
    name: "ctc_fit", label: "CTC Fit",
    evaluate: (app, facts) => {
      if (!facts?.ctcFit) return null;
      if (facts.ctcFit.status === "ok") return { delta: 0.05, reason: "CTC within budget range" };
      if (facts.ctcFit.status === "mismatch") return { delta: -0.15, reason: "CTC mismatch with budget" };
      return null;
    },
  },
  {
    name: "notice_period", label: "Notice Period",
    evaluate: (app, facts) => {
      if (!facts?.noticePeriod) return null;
      if (facts.noticePeriod.status === "immediate") return { delta: 0.05, reason: "Immediate availability" };
      if (facts.noticePeriod.status === "long") return { delta: -0.08, reason: "Extended notice period" };
      return null;
    },
  },
  {
    name: "counter_offer_risk", label: "Counter-Offer Risk",
    evaluate: (app, facts, risks) => {
      if (!risks?.some((r: any) => r.type === "counter_offer")) return null;
      return { delta: -0.12, reason: "Counter-offer risk identified" };
    },
  },
  {
    name: "pipeline_age", label: "Pipeline Age",
    evaluate: (app, facts) => {
      if (!facts?.pipelineHistory) return null;
      const days = facts.pipelineHistory.daysInStage;
      if (days > 30) return { delta: -0.08, reason: `Stalled: ${days} days in current stage` };
      if (days > 14) return { delta: -0.03, reason: `${days} days in current stage` };
      return null;
    },
  },
  {
    name: "recruiter_interest", label: "Recruiter Interest",
    evaluate: (app, facts) => {
      if (!facts?.recruiterNotesSummary?.length) return null;
      const positiveNote = facts.recruiterNotesSummary.some(
        (n: string) => /\b(interested|strong|excellent|good fit|proceed)\b/i.test(n)
      );
      const negativeNote = facts.recruiterNotesSummary.some(
        (n: string) => /\b(concern|risk|unresponsive|declined|not interested)\b/i.test(n)
      );
      if (positiveNote) return { delta: 0.06, reason: "Recruiter notes indicate positive signal" };
      if (negativeNote) return { delta: -0.10, reason: "Recruiter notes indicate concern" };
      return null;
    },
  },
];

function getNextAction(stage: string): string {
  const actions: Record<string, string> = {
    NEW: "Run AI screening to evaluate candidate fit",
    AI_SCREENING: "Review AI screening report and move to Reviewed or Reject",
    REVIEWED: "Advance to submission for client review",
    SUBMITTED: "Follow up with client for feedback and interview scheduling",
    INTERVIEW_SCHEDULED: "Prepare candidate for upcoming interview",
    INTERVIEW_COMPLETE: "Review interview feedback and decide next step",
    OFFER_EXTENDED: "Follow up with candidate for decision; address counter-offer concerns",
    OFFER_ACCEPTED: "Track joining formalities and notice period",
  };
  return actions[stage] ?? "Advance candidate to next pipeline stage";
}

export async function computePlacementProbability(
  ctx: TenantContext,
  applicationId: string,
): Promise<PlacementProbabilitySignal | null> {
  const workbench = await getScreeningWorkbench(ctx, { applicationId });
  if (!workbench) return null;

  const { application, facts, risks } = workbench;
  const stage = application.stage;

  const baseProbability = getStageProbability(stage);

  const modifiers: PlacementProbabilitySignal["modifiers"] = [];
  for (const signal of SIGNAL_EVALUATORS) {
    const result = signal.evaluate(application, facts as any, risks as any);
    if (result) {
      modifiers.push({ name: signal.name, label: signal.label, delta: result.delta, reason: result.reason });
    }
  }

  const totalDelta = modifiers.reduce((sum, m) => sum + m.delta, 0);
  const adjustedProbability = Math.max(0.01, Math.min(0.99, baseProbability + totalDelta));

  const defaultPct = getDefaultFeePercent(ctx);
  const offer = application.offers?.[0];
  const estimatedFeeAtPlacement = offer
    ? estimateFeeAmount(offer, defaultPct)
    : Math.round(((application.job?.salaryMin ?? 0) + (application.job?.salaryMax ?? 0)) / 2 * (defaultPct / 100));

  const expectedValue = Math.round(adjustedProbability * estimatedFeeAtPlacement);

  const f = facts as any;
  const confidenceLevel = f?.educationFit?.assessed && (f?.skillFit?.matched?.length ?? 0) > 0
    ? "high" : modifiers.length > 2 ? "medium" : "low";

  const positiveDrivers = modifiers.filter((m) => m.delta > 0).map((m) => m.reason);
  const concerns = modifiers.filter((m) => m.delta < 0).map((m) => m.reason);

  return {
    applicationId: application.id,
    candidateName: application.candidate?.name ?? "Unknown",
    jobTitle: application.job?.title ?? "Unknown",
    clientName: application.job?.client?.name ?? "Unknown",
    currentStage: stage,
    baseProbability: Math.round(baseProbability * 100) / 100,
    adjustedProbability: Math.round(adjustedProbability * 100) / 100,
    confidenceLevel,
    modifiers,
    estimatedFeeAtPlacement,
    expectedValue,
    positiveDrivers,
    concerns,
    nextRecommendedAction: getNextAction(stage),
  };
}
