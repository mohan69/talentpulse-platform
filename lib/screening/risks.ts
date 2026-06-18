import type { ApplicationWithScreeningData, RiskSignal, ScreeningFacts } from "@/lib/screening/types";
import type { MemoryQueryResult } from "@/lib/memory/types";

const watchedRiskTypes = new Set([
  "counter_offer",
  "long_notice",
  "ctc_mismatch",
  "no_show",
  "location_mismatch",
  "voice_screening_concern",
  "prior_rejection",
  "low_match_score",
]);

function addRisk(risks: RiskSignal[], risk: RiskSignal) {
  if (!risks.some((existing) => existing.type === risk.type)) risks.push(risk);
}

function combinedText(app: ApplicationWithScreeningData, memoryEntries?: MemoryQueryResult, candidateMemory?: MemoryQueryResult) {
  const notes = (app.candidate?.notes ?? []).map((note: any) => note.content ?? note.body ?? note.text ?? "");
  const messages = (app.candidate?.whatsappMessages ?? []).map((message: any) => message.body ?? "");
  const memory = [...(memoryEntries?.entries ?? []), ...(candidateMemory?.entries ?? [])].map((entry) => {
    return `${entry.metadata?.summary ?? ""} ${entry.metadata?.details ?? ""}`;
  });
  return [...notes, ...messages, ...memory].join(" ").toLowerCase();
}

function dismissedRiskTypes(memoryEntries?: MemoryQueryResult, candidateMemory?: MemoryQueryResult) {
  const dismissed = new Set<string>();
  for (const entry of [...(memoryEntries?.entries ?? []), ...(candidateMemory?.entries ?? [])]) {
    if (entry.action !== "risk_dismissed") continue;
    const tags = entry.metadata?.tags ?? [];
    const fromTags = tags.find((tag) => watchedRiskTypes.has(tag));
    const fromValue = (entry.metadata?.newValue as any)?.riskType;
    if (fromTags) dismissed.add(fromTags);
    if (typeof fromValue === "string") dismissed.add(fromValue);
  }
  return dismissed;
}

export function computeJoiningRisks(
  app: ApplicationWithScreeningData,
  memoryEntries?: MemoryQueryResult,
  candidateMemory?: MemoryQueryResult,
  facts?: ScreeningFacts,
): RiskSignal[] {
  const risks: RiskSignal[] = [];
  const candidate = app.candidate ?? {};
  const text = combinedText(app, memoryEntries, candidateMemory);
  const latestVoice = (candidate.voiceScreenings ?? app.voiceScreenings ?? [])[0];

  if (/\bcounter[-\s]?offer\b|\bretention offer\b/.test(text)) {
    addRisk(risks, {
      type: "counter_offer",
      label: "Counter-offer risk",
      severity: "medium",
      source: "conversation_memory",
      likelihood: 45,
      evidence: "Counter-offer was mentioned in notes, WhatsApp, or memory.",
    });
  }

  if ((candidate.noticePeriod ?? 0) > 60 || facts?.noticePeriod.status === "long") {
    addRisk(risks, {
      type: "long_notice",
      label: "Long notice period",
      severity: "medium",
      source: "candidate_profile",
      likelihood: 50,
      evidence: `Notice period is ${candidate.noticePeriod ?? facts?.noticePeriod.days} days.`,
    });
  }

  if (facts?.ctcFit.status === "mismatch") {
    addRisk(risks, {
      type: "ctc_mismatch",
      label: "Compensation mismatch",
      severity: "high",
      source: "candidate_job_fit",
      likelihood: 70,
      evidence: "Expected or current CTC is above the role budget.",
    });
  }

  if ((app.noShowRisk ?? 0) >= 60) {
    addRisk(risks, {
      type: "no_show",
      label: "Interview no-show risk",
      severity: "medium",
      source: "application_score",
      likelihood: Math.round(app.noShowRisk),
      evidence: `Application no-show risk is ${Math.round(app.noShowRisk)}.`,
    });
  }

  if (facts?.locationFit.status === "mismatch") {
    addRisk(risks, {
      type: "location_mismatch",
      label: "Location mismatch",
      severity: "high",
      source: "candidate_profile",
      likelihood: 65,
      evidence: "Candidate location does not match the job and relocation is not confirmed.",
    });
  }

  if (typeof latestVoice?.aiScore === "number" && latestVoice.aiScore < 50) {
    addRisk(risks, {
      type: "voice_screening_concern",
      label: "Voice screening concern",
      severity: "medium",
      source: "voice_screening",
      likelihood: 55,
      evidence: `Latest voice screening score is ${Math.round(latestVoice.aiScore)}.`,
    });
  }

  const interviews = candidate.interviews ?? app.interviews ?? [];
  if (String(app.stage) === "REJECTED" || interviews.some((interview: any) => interview.outcome === "REJECT")) {
    addRisk(risks, {
      type: "prior_rejection",
      label: "Prior rejection signal",
      severity: "medium",
      source: "pipeline_history",
      likelihood: 50,
      evidence: "Application or interview history includes a rejection.",
    });
  }

  if (typeof app.matchScore === "number" && app.matchScore < 50) {
    addRisk(risks, {
      type: "low_match_score",
      label: "Low match score",
      severity: "medium",
      source: "application_score",
      likelihood: 50,
      evidence: `Application match score is ${Math.round(app.matchScore)}.`,
    });
  }

  const dismissed = dismissedRiskTypes(memoryEntries, candidateMemory);
  return risks.filter((risk) => !dismissed.has(risk.type));
}

