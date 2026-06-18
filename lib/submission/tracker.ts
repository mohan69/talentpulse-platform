import type { SubmissionPackage, TrackerRow } from "@/lib/submission/types";

export function buildTrackerRow(pkg: SubmissionPackage, now = new Date()): TrackerRow {
  return {
    submissionDate: now.toISOString().split("T")[0],
    applicationId: pkg.applicationId,
    candidateId: pkg.candidateId,
    candidateName: pkg.candidate.name,
    candidateEmail: pkg.candidate.email,
    candidatePhone: pkg.candidate.phone,
    currentCompany: pkg.candidate.currentCompany,
    currentDesignation: pkg.candidate.currentDesignation,
    totalExperience: pkg.candidate.totalExperience,
    relevantExperience: pkg.candidate.relevantExperience,
    skills: (pkg.candidate.skills ?? []).join(", "),
    currentCity: pkg.candidate.currentCity,
    currentCtc: pkg.candidate.currentCtc,
    expectedCtc: pkg.candidate.expectedCtc,
    noticePeriod: pkg.candidate.noticePeriod,
    canBuyOut: pkg.candidate.canBuyOut,
    resumeUrl: pkg.candidate.resumeUrl,
    linkedinUrl: pkg.candidate.linkedinUrl,
    jobId: pkg.jobId,
    jobTitle: pkg.job.title,
    clientId: pkg.clientId,
    clientName: pkg.job.clientName,
    jobLocation: pkg.job.location,
    salaryMin: pkg.job.salaryMin,
    salaryMax: pkg.job.salaryMax,
    readinessScore: pkg.readiness.overall,
    readinessLevel: pkg.readiness.level,
    fitOverall: pkg.fitGapExplanation.overall,
    riskCount: pkg.riskDisclosure.riskCount,
    highRiskCount: pkg.riskDisclosure.highRiskCount,
    submissionStatus: pkg.submissionStatus,
    submittedAt: pkg.submittedAt,
    profileUrl: `/applications/${pkg.applicationId}`,
  };
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function trackerRowToCsv(row: TrackerRow) {
  const headers = Object.keys(row);
  const values = headers.map((header) => csvEscape(row[header]));
  return `\uFEFF${headers.map(csvEscape).join(",")}\n${values.join(",")}\n`;
}

