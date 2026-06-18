import type { ApplicationWithScreeningData, FitStatus, LocationFitStatus, NoticeStatus, ScreeningFacts } from "@/lib/screening/types";

type AiReport = Record<string, any> | null | undefined;

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();

function aiScore(aiReport: AiReport, path: string[]): number | null {
  let cursor: any = aiReport;
  for (const key of path) cursor = cursor?.[key];
  return typeof cursor === "number" ? cursor : null;
}

export function computeSkillFit(candidateSkills: string[] = [], jobSkills: string[] = [], aiReport?: AiReport) {
  const candidateNormalized = candidateSkills.map(normalize).filter(Boolean);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const jobSkill of jobSkills) {
    const normalizedJobSkill = normalize(jobSkill);
    const hasMatch = candidateNormalized.some((candidateSkill) => {
      return candidateSkill.includes(normalizedJobSkill) || normalizedJobSkill.includes(candidateSkill);
    });
    (hasMatch ? matched : missing).push(jobSkill);
  }

  const heuristicScore = jobSkills.length > 0 ? (matched.length / jobSkills.length) * 100 : candidateSkills.length > 0 ? 70 : 50;
  const jdScore = aiScore(aiReport, ["assessments", "jdFitment", "score"]);
  const reportFitment = (aiReport as any)?.assessments?.jdFitment ?? {};
  const reportMatched = Array.isArray(reportFitment.matchedSkills) ? reportFitment.matchedSkills : [];
  const reportMissing = Array.isArray(reportFitment.missingSkills) ? reportFitment.missingSkills : [];

  return {
    score: clampScore(jdScore == null ? heuristicScore : heuristicScore * 0.4 + jdScore * 0.6),
    matched: [...new Set([...matched, ...reportMatched])],
    missing: [...new Set([...missing, ...reportMissing])],
  };
}

export function computeExperienceFit(candidateYears = 0, requiredMin = 0, requiredMax = 0, aiReport?: AiReport) {
  const effectiveMin = Math.max(requiredMin ?? 0, 0);
  const effectiveMax = requiredMax && requiredMax > 0 ? requiredMax : effectiveMin + 5;
  let score = 50;

  if (effectiveMin === 0 && candidateYears > 0) score = 80;
  else if (candidateYears < effectiveMin) score = effectiveMin === 0 ? 50 : Math.max(0, (candidateYears / effectiveMin) * 60);
  else if (candidateYears <= effectiveMax) score = 100;
  else score = Math.max(70, 100 - ((candidateYears - effectiveMax) / Math.max(effectiveMax, 1)) * 30);

  const reportScore = aiScore(aiReport, ["assessments", "basicProfile", "score"]);
  return {
    score: clampScore(reportScore == null ? score : score * 0.5 + reportScore * 0.5),
    candidateYears,
    requiredMin: effectiveMin,
    requiredMax: effectiveMax,
  };
}

export function computeCtcFit(
  currentCtc: number | null | undefined,
  expectedCtc: number | null | undefined,
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined,
  aiReport?: AiReport,
) {
  const budgetMax = salaryMax ?? salaryMin ?? null;
  const candidateCtc = expectedCtc ?? currentCtc ?? null;

  if (candidateCtc == null || budgetMax == null || budgetMax <= 0) {
    const reportStatus = (aiReport as any)?.assessments?.ctcAnalysis?.status;
    const mapped = ["ok", "stretch", "mismatch", "unknown"].includes(reportStatus) ? (reportStatus as FitStatus) : "unknown";
    return { status: mapped, candidateCtc, budgetMax };
  }

  if (candidateCtc <= budgetMax) return { status: "ok" as FitStatus, candidateCtc, budgetMax };
  if (candidateCtc <= budgetMax * 1.15) return { status: "stretch" as FitStatus, candidateCtc, budgetMax };
  return { status: "mismatch" as FitStatus, candidateCtc, budgetMax };
}

export function computeLocationFit(
  city: string | null | undefined,
  preferredLocations: string[] = [],
  willRelocate = false,
  jobLocation: string | null | undefined,
) {
  const candidateCity = city ?? null;
  const normalizedCity = candidateCity ? normalize(candidateCity) : "";
  const normalizedJobLocation = jobLocation ? normalize(jobLocation) : "";
  const normalizedPreferred = preferredLocations.map(normalize);
  let status: LocationFitStatus = "unknown";

  if (normalizedCity && normalizedJobLocation) {
    const cityMatches = normalizedCity.includes(normalizedJobLocation) || normalizedJobLocation.includes(normalizedCity);
    const preferenceMatches = normalizedPreferred.some((location) => {
      return location.includes(normalizedJobLocation) || normalizedJobLocation.includes(location);
    });
    if (cityMatches || preferenceMatches) status = "match";
    else if (willRelocate) status = "relocation_possible";
    else status = "mismatch";
  } else if (willRelocate && normalizedJobLocation) {
    status = "relocation_possible";
  }

  return { status, candidateCity, jobLocation: jobLocation ?? null };
}

export function computeNoticePeriod(
  days: number | null | undefined,
  lastWorkingDay: Date | string | null | undefined,
  canBuyOut = false,
  aiReport?: AiReport,
) {
  if (days == null) {
    const reportStatus = (aiReport as any)?.assessments?.noticePeriod?.status;
    const mapped = ["immediate", "short", "long", "unknown"].includes(reportStatus) ? (reportStatus as NoticeStatus) : "unknown";
    return { days: null, status: mapped };
  }

  const workingDay = lastWorkingDay ? new Date(lastWorkingDay) : null;
  const hasReachedLastWorkingDay = Boolean(workingDay && Number.isFinite(workingDay.getTime()) && workingDay <= new Date());
  if (days <= 7 || hasReachedLastWorkingDay) return { days, status: "immediate" as NoticeStatus };
  if (days <= 30 || canBuyOut) return { days, status: "short" as NoticeStatus };
  return { days, status: "long" as NoticeStatus };
}

export function computeEducationFit(degree?: string | null, institution?: string | null, graduationYear?: number | null) {
  return { degree: degree ?? null, institution: institution ?? null, graduationYear: graduationYear ?? null, assessed: Boolean(degree || institution || graduationYear) };
}

export function computeVoiceSummary(screenings: any[] = []) {
  const completed = screenings.find((screening) => screening.callStatus === "COMPLETED" || screening.completedAt || screening.transcript || screening.aiSummary);
  if (!completed) return null;

  const sourceText = String(completed.aiSummary ?? completed.transcript ?? "");
  const findings = sourceText
    .split(/[\n.]/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  return { completed: true, score: completed.aiScore ?? null, keyFindings: findings };
}

export function extractNoteSummaries(notes: any[] = []) {
  return notes
    .map((note) => String(note.content ?? note.body ?? note.text ?? "").trim())
    .filter(Boolean)
    .map((text) => (text.length > 180 ? `${text.slice(0, 177)}...` : text))
    .slice(0, 8);
}

export function computePipelineHistory(app: ApplicationWithScreeningData) {
  const now = Date.now();
  const updatedAt = app.updatedAt ? new Date(app.updatedAt).getTime() : now;
  const createdAt = app.createdAt ? new Date(app.createdAt).getTime() : now;
  const day = 24 * 60 * 60 * 1000;

  return {
    stageChanges: 0,
    currentStage: String(app.stage ?? "NEW"),
    daysInStage: Math.max(0, Math.floor((now - updatedAt) / day)),
    totalDaysInPipeline: Math.max(0, Math.floor((now - createdAt) / day)),
  };
}

export function computeInterviewOutcomes(interviews: any[] = []) {
  const ratings = interviews.map((interview) => interview.rating).filter((rating): rating is number => typeof rating === "number");
  const proceeded = interviews.filter((interview) => interview.outcome === "PROCEED" || interview.rating >= 4).length;
  const rejected = interviews.filter((interview) => interview.outcome === "REJECT").length;

  return {
    total: interviews.length,
    proceeded,
    rejected,
    averageRating: ratings.length > 0 ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10 : null,
  };
}

export function computeScreeningFacts(app: ApplicationWithScreeningData): ScreeningFacts {
  const candidate = app.candidate ?? {};
  const job = app.job ?? {};
  const aiReport = app.aiReport as AiReport;

  return {
    skillFit: computeSkillFit(candidate.skills ?? [], job.skills ?? [], aiReport),
    experienceFit: computeExperienceFit(candidate.totalExperience ?? 0, job.experienceMin ?? 0, job.experienceMax ?? 0, aiReport),
    ctcFit: computeCtcFit(candidate.currentCtc ?? null, candidate.expectedCtc ?? null, job.salaryMin ?? null, job.salaryMax ?? null, aiReport),
    locationFit: computeLocationFit(candidate.currentCity ?? null, candidate.preferredLocations ?? [], candidate.willRelocate ?? false, job.location ?? null),
    noticePeriod: computeNoticePeriod(candidate.noticePeriod ?? null, candidate.lastWorkingDay ?? null, candidate.canBuyOut ?? false, aiReport),
    educationFit: computeEducationFit(candidate.degree ?? null, candidate.institution ?? null, candidate.graduationYear ?? null),
    voiceScreeningSummary: computeVoiceSummary(candidate.voiceScreenings ?? app.voiceScreenings ?? []),
    recruiterNotesSummary: extractNoteSummaries(candidate.notes ?? []),
    pipelineHistory: computePipelineHistory(app),
    interviewOutcomes: computeInterviewOutcomes(candidate.interviews ?? app.interviews ?? []),
  };
}

