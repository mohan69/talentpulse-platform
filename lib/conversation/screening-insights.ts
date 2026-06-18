import type { ExtractedInsight } from "@/lib/conversation/types";

export function extractInsightsFromScreening(screeningData: {
  score?: number | null;
  skillsMatch?: number | null;
  experienceMatch?: number | null;
  salaryFit?: string | null;
  report?: any;
}): ExtractedInsight[] {
  const insights: ExtractedInsight[] = [];
  const report = screeningData.report?.ai ?? screeningData.report ?? {};

  const score = screeningData.score ?? report.matchScore;
  if (score != null) {
    insights.push({
      type: "screening_score",
      value: `AI Match Score: ${score}/100`,
      source: "ai_screening",
      confidence: 0.92,
      sentiment: score >= 75 ? "positive" : score < 50 ? "negative" : "neutral",
    });
  }

  const jdFit = screeningData.skillsMatch ?? report.assessments?.jdFitment?.score;
  if (jdFit != null) {
    insights.push({
      type: "skill_signal",
      value: `Skills/JD fit: ${jdFit}%`,
      source: "ai_screening",
      confidence: 0.84,
      sentiment: jdFit >= 75 ? "positive" : jdFit < 50 ? "negative" : "neutral",
    });
  }

  const expFit = screeningData.experienceMatch ?? report.assessments?.projectExperience?.score;
  if (expFit != null) {
    insights.push({
      type: "fit_signal",
      value: `Experience fit: ${expFit}%`,
      source: "ai_screening",
      confidence: 0.8,
      sentiment: expFit >= 75 ? "positive" : expFit < 50 ? "negative" : "neutral",
    });
  }

  const salaryFit = screeningData.salaryFit ?? report.assessments?.ctcAnalysis?.notes;
  if (salaryFit) {
    insights.push({
      type: "salary_expectation",
      value: salaryFit,
      source: "ai_screening",
      confidence: 0.76,
      sentiment: /mismatch|stretch|high/i.test(salaryFit) ? "negative" : "neutral",
    });
  }

  for (const risk of report.redFlags ?? []) {
    insights.push({
      type: "risk_signal",
      value: String(risk),
      source: "ai_screening",
      confidence: 0.78,
      sentiment: "negative",
    });
  }

  return insights;
}

