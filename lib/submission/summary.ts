import type { ApplicationWithScreeningData, ReadinessScore, ScreeningFacts } from "@/lib/screening/types";
import type { ClientReadySummary } from "@/lib/submission/types";
import { formatCurrency } from "@/lib/format";

function projectRelevance(project: any, skills: string[]) {
  const used = Array.isArray(project.skillsUsed) ? project.skillsUsed : [];
  const matched = used.filter((skill: string) => skills.some((jobSkill) => jobSkill.toLowerCase() === skill.toLowerCase()));
  return matched.length > 0 ? `Relevant through ${matched.join(", ")} experience.` : "Relevant candidate project experience.";
}

export function buildClientReadySummary(
  app: ApplicationWithScreeningData,
  facts: ScreeningFacts,
  readiness: ReadinessScore,
  recruiterNote?: string | null,
): ClientReadySummary {
  const candidate = app.candidate ?? {};
  const job = app.job ?? {};
  const base = app.summary ?? {};
  const oneLiner = `${candidate.totalExperience ?? 0}yr ${candidate.currentDesignation ?? job.title ?? "candidate"} with ${(candidate.skills ?? []).slice(0, 3).join(", ") || "relevant"} expertise, expected ${formatCurrency(candidate.expectedCtc)}, notice ${candidate.noticePeriod ?? "unknown"} days`;
  const keyHighlights = [
    ...(base.strengths ?? []),
    `${facts.skillFit.score}% skill fit`,
    `${facts.experienceFit.candidateYears} years experience`,
    facts.ctcFit.status === "ok" ? "Within budget" : `Compensation status: ${facts.ctcFit.status}`,
  ].filter(Boolean).slice(0, 5);

  return {
    verdict: base.verdict ?? "Submission package ready",
    strengths: base.strengths ?? [],
    concerns: base.concerns ?? [],
    recommendation: base.recommendation ?? "Review and submit after recruiter approval.",
    oneLiner,
    keyHighlights,
    relevantProjects: (candidate.projects ?? []).slice(0, 3).map((project: any) => ({
      projectName: project.projectName,
      role: project.role,
      relevance: projectRelevance(project, job.skills ?? []),
    })),
    compensationSummary: `Current ${formatCurrency(candidate.currentCtc)}, expected ${formatCurrency(candidate.expectedCtc)}, budget ${formatCurrency(job.salaryMin)}-${formatCurrency(job.salaryMax)} - ${facts.ctcFit.status}.`,
    availabilitySummary: `Notice period ${facts.noticePeriod.days ?? "unknown"} days, ${candidate.canBuyOut ? "buyout possible" : "buyout not confirmed"}.`,
    educationSummary: [facts.educationFit.degree, facts.educationFit.institution, facts.educationFit.graduationYear].filter(Boolean).join(" ") || "Education details not confirmed.",
    whyThisCandidate: recruiterNote ?? candidate.aiSummary ?? base.recommendation ?? "Profile aligns with the current role signals and recruiter screening output.",
  };
}

