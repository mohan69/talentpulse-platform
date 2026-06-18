import type { ReadinessScore, RiskSignal, ScreeningFacts } from "@/lib/screening/types";

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

function statusScore(status: string, scores: Record<string, number>) {
  return scores[status] ?? scores.unknown ?? 50;
}

export function computeReadinessScore(facts: ScreeningFacts, risks: RiskSignal[]): ReadinessScore {
  const categories = {
    skillFit: facts.skillFit.score,
    experienceFit: facts.experienceFit.score,
    ctcFit: statusScore(facts.ctcFit.status, { ok: 100, stretch: 70, mismatch: 30, unknown: 50 }),
    locationFit: statusScore(facts.locationFit.status, { match: 100, relocation_possible: 70, mismatch: 30, unknown: 50 }),
    noticeFit: statusScore(facts.noticePeriod.status, { immediate: 100, short: 80, long: 40, unknown: 50 }),
    voiceSignal: facts.voiceScreeningSummary?.score ?? (facts.voiceScreeningSummary?.completed ? 70 : 50),
    recruiterSignal: facts.recruiterNotesSummary.length > 0 ? 70 : 50,
    pipelineVelocity: facts.pipelineHistory.totalDaysInPipeline <= 14 ? 80 : facts.pipelineHistory.totalDaysInPipeline <= 30 ? 65 : 50,
  };

  const weights: Record<keyof typeof categories, number> = {
    skillFit: 0.22,
    experienceFit: 0.16,
    ctcFit: 0.13,
    locationFit: 0.12,
    noticeFit: 0.12,
    voiceSignal: 0.1,
    recruiterSignal: 0.08,
    pipelineVelocity: 0.07,
  };

  const weighted = (Object.keys(categories) as Array<keyof typeof categories>).reduce((sum, key) => {
    return sum + categories[key] * weights[key];
  }, 0);
  const riskPenalty = Math.min(
    35,
    risks.reduce((sum, risk) => sum + (risk.severity === "high" ? 15 : risk.severity === "medium" ? 5 : 2), 0),
  );
  const overall = clampScore(weighted - riskPenalty);
  const level =
    overall >= 80 ? "ready_for_interview" : overall >= 60 ? "likely_fit" : overall >= 40 ? "needs_review" : "caution";

  return { overall, level, categories, riskPenalty };
}

