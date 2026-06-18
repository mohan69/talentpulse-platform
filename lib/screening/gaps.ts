import type { ApplicationWithScreeningData, MissingInfo } from "@/lib/screening/types";

export function computeMissingInfo(app: ApplicationWithScreeningData): MissingInfo[] {
  const gaps: MissingInfo[] = [];
  const candidate = app.candidate ?? {};
  const job = app.job ?? {};

  if (candidate.currentCtc == null) gaps.push({ category: "current_ctc", label: "Current CTC not provided", severity: "high", field: "currentCtc" });
  if (candidate.expectedCtc == null && candidate.currentCtc == null) {
    gaps.push({ category: "expected_ctc", label: "Expected CTC not provided", severity: "high", field: "expectedCtc" });
  }
  if (candidate.currentCtc != null && candidate.ctcFixed == null && candidate.ctcVariable == null) {
    gaps.push({ category: "ctc_split", label: "Fixed vs variable CTC split unknown", severity: "low", field: "ctcFixed" });
  }

  if (candidate.noticePeriod == null) gaps.push({ category: "notice_period", label: "Notice period not specified", severity: "high", field: "noticePeriod" });
  if (candidate.noticePeriod != null && candidate.noticePeriod > 30 && !candidate.canBuyOut && !candidate.lastWorkingDay) {
    gaps.push({ category: "notice_buyout", label: "Notice buyout or last working day not confirmed", severity: "medium", field: "canBuyOut" });
  }

  if (!candidate.degree) gaps.push({ category: "education", label: "Highest degree not specified", severity: "medium", field: "degree" });
  if (!candidate.institution) gaps.push({ category: "education", label: "Institution not specified", severity: "low", field: "institution" });

  if (!candidate.currentCity) gaps.push({ category: "location", label: "Current location not specified", severity: "medium", field: "currentCity" });
  if (candidate.currentCity && job.location && candidate.currentCity !== job.location && !candidate.willRelocate) {
    gaps.push({ category: "relocation", label: "Relocation willingness not confirmed", severity: "high", field: "willRelocate" });
  }

  if (!candidate.totalExperience && !candidate.relevantExperience) {
    gaps.push({ category: "experience", label: "Total experience not specified", severity: "high", field: "totalExperience" });
  }
  if (!Array.isArray(candidate.skills) || candidate.skills.length === 0) {
    gaps.push({ category: "skills", label: "Skills not listed", severity: "high", field: "skills" });
  }
  if (["OFFER_EXTENDED", "OFFER_ACCEPTED"].includes(String(app.stage ?? ""))) {
    gaps.push({ category: "reference_check", label: "Reference check status unknown before offer finalization", severity: "medium", field: null });
  }
  if (!candidate.resumeUrl && !candidate.resumeKey) gaps.push({ category: "resume", label: "Resume not uploaded", severity: "medium", field: "resumeUrl" });
  if (!candidate.linkedinUrl) gaps.push({ category: "linkedin", label: "LinkedIn profile not linked", severity: "low", field: "linkedinUrl" });

  return gaps;
}

