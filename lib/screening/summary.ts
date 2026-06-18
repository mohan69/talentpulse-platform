import type { ApplicationWithScreeningData, ClientScreeningSummary, MissingInfo, ReadinessScore, RiskSignal, ScreeningFacts } from "@/lib/screening/types";

export function buildClientSummary(
  app: ApplicationWithScreeningData,
  facts: ScreeningFacts,
  readiness: ReadinessScore,
  risks: RiskSignal[] = [],
  gaps: MissingInfo[] = [],
): ClientScreeningSummary {
  const candidate = app.candidate ?? {};
  const job = app.job ?? {};
  const name = candidate.name ?? "Candidate";
  const title = job.title ?? "the role";
  const strengths: string[] = [];
  const concerns: string[] = [];

  if (facts.skillFit.score >= 70) strengths.push(`Matches ${facts.skillFit.matched.length} key skills for ${title}.`);
  if (facts.experienceFit.score >= 80) strengths.push(`${facts.experienceFit.candidateYears} years of experience aligns with the requirement.`);
  if (facts.ctcFit.status === "ok") strengths.push("Compensation is within the current budget range.");
  if (facts.locationFit.status === "match") strengths.push("Location aligns with the role requirement.");
  if ((facts.voiceScreeningSummary?.score ?? 0) >= 75) strengths.push(`Voice screening score is strong at ${Math.round(facts.voiceScreeningSummary?.score ?? 0)}.`);

  if (facts.skillFit.missing.length > 0) concerns.push(`Needs validation on ${facts.skillFit.missing.slice(0, 3).join(", ")}.`);
  for (const risk of risks.slice(0, 3)) concerns.push(risk.label);
  for (const gap of gaps.filter((gap) => gap.severity === "high").slice(0, 2)) concerns.push(gap.label);
  if (facts.noticePeriod.status === "long") concerns.push("Joining timeline may be delayed due to notice period.");

  const verdict =
    readiness.level === "ready_for_interview"
      ? "Strong fit - proceed to next round"
      : readiness.level === "likely_fit"
        ? "Likely fit - proceed after closing key gaps"
        : readiness.level === "needs_review"
          ? "Needs recruiter review before submission"
          : "Significant concerns - do not proceed without validation";

  const recommendation =
    readiness.level === "ready_for_interview"
      ? `Schedule the next interview round for ${name}.`
      : readiness.level === "likely_fit"
        ? "Clarify the listed gaps and then proceed if responses are satisfactory."
        : readiness.level === "needs_review"
          ? "Run a focused recruiter screening call before client submission."
          : "Hold submission until the high-risk items are resolved.";

  return {
    verdict,
    strengths: strengths.slice(0, 5),
    concerns: [...new Set(concerns)].slice(0, 5),
    recommendation,
  };
}

