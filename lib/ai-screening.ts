// Heuristic scoring used as an immediate fallback alongside LLM reports.
import type { Candidate, Job } from "@prisma/client";

export type HeuristicScore = {
  matchScore: number;
  skillOverlap: number;
  missingSkills: string[];
  matchedSkills: string[];
  experienceMatch: "under" | "ok" | "over";
  locationMatch: boolean;
  noShowRisk: number;
  ctcFit: "ok" | "stretch" | "mismatch" | "unknown";
  flags: string[];
  strengths: string[];
};

export function computeHeuristicScore(
  candidate: Pick<Candidate, "skills" | "totalExperience" | "currentCity" | "preferredLocations" | "currentCtc" | "expectedCtc" | "noticePeriod" | "willRelocate" | "employmentGapNotes">,
  job: Pick<Job, "skills" | "experienceMin" | "experienceMax" | "location" | "salaryMin" | "salaryMax">,
): HeuristicScore {
  const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase().trim());
  const candSkills = (candidate.skills ?? []).map((s) => s.toLowerCase().trim());
  const matchedSkills = jobSkills.filter((s) => candSkills.some((c) => c.includes(s) || s.includes(c)));
  const missingSkills = jobSkills.filter((s) => !matchedSkills.includes(s));
  const skillOverlap = jobSkills.length === 0 ? 1 : matchedSkills.length / jobSkills.length;

  let experienceMatch: "under" | "ok" | "over" = "ok";
  const exp = candidate.totalExperience ?? 0;
  if (exp < job.experienceMin) experienceMatch = "under";
  else if (job.experienceMax > 0 && exp > job.experienceMax + 2) experienceMatch = "over";

  const locationMatch =
    !job.location ||
    (candidate.currentCity && job.location.toLowerCase().includes(candidate.currentCity.toLowerCase())) ||
    (candidate.preferredLocations ?? []).some((l) => job.location.toLowerCase().includes(l.toLowerCase())) ||
    candidate.willRelocate;

  let ctcFit: "ok" | "stretch" | "mismatch" | "unknown" = "unknown";
  if (candidate.expectedCtc && job.salaryMax) {
    if (candidate.expectedCtc <= job.salaryMax) ctcFit = "ok";
    else if (candidate.expectedCtc <= job.salaryMax * 1.15) ctcFit = "stretch";
    else ctcFit = "mismatch";
  }

  // No-show risk (0-100, higher = more risk)
  let risk = 20;
  if ((candidate.noticePeriod ?? 0) > 60) risk += 15;
  if ((candidate.noticePeriod ?? 0) > 90) risk += 10;
  if (ctcFit === "mismatch") risk += 30;
  if (ctcFit === "stretch") risk += 10;
  if (experienceMatch === "under") risk += 15;
  if (candidate.employmentGapNotes && candidate.employmentGapNotes.length > 0) risk += 8;
  if (!locationMatch && !candidate.willRelocate) risk += 15;
  risk = Math.min(95, Math.max(5, risk));

  const matchScore = Math.round(
    skillOverlap * 55 +
      (experienceMatch === "ok" ? 20 : experienceMatch === "over" ? 10 : 5) +
      (locationMatch ? 10 : 2) +
      (ctcFit === "ok" ? 15 : ctcFit === "stretch" ? 8 : ctcFit === "unknown" ? 10 : 0),
  );

  const flags: string[] = [];
  const strengths: string[] = [];
  if (missingSkills.length > 0) flags.push(`Missing skills: ${missingSkills.slice(0, 3).join(", ")}`);
  if (experienceMatch === "under") flags.push(`Experience (${exp}y) below required minimum (${job.experienceMin}y)`);
  if (ctcFit === "mismatch") flags.push("Expected CTC exceeds client budget");
  if ((candidate.noticePeriod ?? 0) > 60) flags.push(`Long notice period (${candidate.noticePeriod}d)`);
  if (candidate.employmentGapNotes) flags.push("Has employment gaps — verify reasons");

  if (skillOverlap >= 0.75) strengths.push(`Strong skill match (${Math.round(skillOverlap * 100)}%)`);
  if (experienceMatch === "ok") strengths.push("Experience aligns with requirement");
  if (locationMatch) strengths.push("Location preference matches");
  if (ctcFit === "ok") strengths.push("CTC expectations within budget");
  if ((candidate.noticePeriod ?? 999) <= 30) strengths.push("Short notice period — quick joiner");

  return {
    matchScore: Math.min(100, Math.max(0, matchScore)),
    skillOverlap: Math.round(skillOverlap * 100),
    missingSkills,
    matchedSkills,
    experienceMatch,
    locationMatch: !!locationMatch,
    noShowRisk: risk,
    ctcFit,
    flags,
    strengths,
  };
}
