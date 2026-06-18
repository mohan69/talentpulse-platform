import type { ClientScreeningSummary, ReadinessScore, ScreeningFacts } from "@/lib/screening/types";
import type { FitGapExplanation, FitLevel, OverallFit } from "@/lib/submission/types";
import { formatCurrency } from "@/lib/format";

function scoreToFit(score: number): FitLevel {
  if (score >= 80) return "strong";
  if (score >= 65) return "good";
  if (score >= 40) return "moderate";
  return "weak";
}

function statusToFit(status: string): FitLevel {
  if (["ok", "match", "immediate"].includes(status)) return "strong";
  if (["stretch", "relocation_possible", "short"].includes(status)) return "good";
  if (status === "unknown") return "moderate";
  return "weak";
}

export function generateFitGapExplanation(
  facts: ScreeningFacts,
  readiness: ReadinessScore,
  screeningSummary: ClientScreeningSummary,
): FitGapExplanation {
  const overallMap: Record<string, OverallFit> = {
    ready_for_interview: "strong_fit",
    likely_fit: "good_fit",
    needs_review: "moderate_fit",
    caution: "weak_fit",
  };

  const dimensions: FitGapExplanation["dimensions"] = [
    {
      category: "skills",
      fitLevel: scoreToFit(facts.skillFit.score),
      explanation: `${facts.skillFit.score}% skill alignment with ${facts.skillFit.matched.length} matched skill(s).`,
      evidence: [
        `Matched: ${facts.skillFit.matched.join(", ") || "none captured"}`,
        `Missing or needs validation: ${facts.skillFit.missing.join(", ") || "none"}`,
      ],
    },
    {
      category: "experience",
      fitLevel: scoreToFit(facts.experienceFit.score),
      explanation: `${facts.experienceFit.candidateYears} years against a ${facts.experienceFit.requiredMin}-${facts.experienceFit.requiredMax} year requirement.`,
      evidence: [`Experience fit score: ${facts.experienceFit.score}`],
    },
    {
      category: "compensation",
      fitLevel: statusToFit(facts.ctcFit.status),
      explanation: `Compensation status is ${facts.ctcFit.status}.`,
      evidence: [
        `Candidate CTC: ${formatCurrency(facts.ctcFit.candidateCtc)}`,
        `Budget max: ${formatCurrency(facts.ctcFit.budgetMax)}`,
      ],
    },
    {
      category: "location",
      fitLevel: statusToFit(facts.locationFit.status),
      explanation: `Location status is ${facts.locationFit.status}.`,
      evidence: [`Candidate city: ${facts.locationFit.candidateCity ?? "unknown"}`, `Job location: ${facts.locationFit.jobLocation ?? "unknown"}`],
    },
    {
      category: "notice_period",
      fitLevel: statusToFit(facts.noticePeriod.status),
      explanation: `Notice period is ${facts.noticePeriod.status}.`,
      evidence: [`Notice days: ${facts.noticePeriod.days ?? "unknown"}`],
    },
    {
      category: "education",
      fitLevel: facts.educationFit.assessed ? "good" : "moderate",
      explanation: facts.educationFit.assessed ? "Education details are available for client review." : "Education details need recruiter validation.",
      evidence: [
        facts.educationFit.degree ?? "Degree unknown",
        facts.educationFit.institution ?? "Institution unknown",
        facts.educationFit.graduationYear ? String(facts.educationFit.graduationYear) : "Graduation year unknown",
      ],
    },
  ];

  const recommendedAction =
    readiness.level === "ready_for_interview"
      ? "Proceed to interview"
      : readiness.level === "likely_fit"
        ? "Review before proceeding"
        : readiness.level === "needs_review"
          ? "Schedule clarification call first"
          : "Not recommended for submission without validation";

  const fitSummary = `${screeningSummary.verdict}. Overall readiness is ${readiness.overall}/100 with ${dimensions.filter((d) => d.fitLevel === "strong" || d.fitLevel === "good").length} positive fit dimension(s).`;

  return {
    overall: overallMap[readiness.level] ?? "moderate_fit",
    dimensions,
    summary: fitSummary,
    recommendedAction,
  };
}
