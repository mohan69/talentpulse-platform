import assert from "node:assert/strict";
import { computeScreeningFacts } from "../lib/screening/facts";
import { computeMissingInfo } from "../lib/screening/gaps";
import { computeJoiningRisks } from "../lib/screening/risks";
import { computeReadinessScore } from "../lib/screening/readiness";
import { generateNextQuestions } from "../lib/screening/questions";
import { buildClientSummary } from "../lib/screening/summary";
import { screeningIntelligenceEnabled } from "../lib/screening/flag";
import type { MemoryQueryResult } from "../lib/memory/types";

assert.equal(screeningIntelligenceEnabled, true);

const now = new Date("2026-06-18T10:00:00Z");

const baseApplication = {
  id: "app_1",
  candidateId: "cand_1",
  jobId: "job_1",
  stage: "REVIEWED",
  matchScore: 86,
  noShowRisk: 20,
  aiReport: null,
  createdAt: now,
  updatedAt: now,
  candidate: {
    id: "cand_1",
    name: "Priya Rao",
    currentCity: "Bangalore",
    preferredLocations: ["Bangalore", "Remote"],
    willRelocate: false,
    totalExperience: 8,
    relevantExperience: 7,
    skills: ["Kubernetes", "DevOps", "AWS", "Terraform"],
    degree: "B.Tech",
    institution: "VTU",
    graduationYear: 2016,
    currentCtc: 2800000,
    expectedCtc: 3200000,
    ctcFixed: 2500000,
    ctcVariable: 300000,
    noticePeriod: 30,
    canBuyOut: true,
    resumeUrl: "https://example.test/resume.pdf",
    linkedinUrl: "https://linkedin.test/priya",
    notes: [{ body: "Strong Kubernetes exposure and clear motivation." }],
    voiceScreenings: [{ callStatus: "COMPLETED", aiScore: 84, aiSummary: "Strong communication. Available in 30 days." }],
    whatsappMessages: [],
    interviews: [{ outcome: "PROCEED", rating: 4 }],
  },
  job: {
    id: "job_1",
    title: "Senior DevOps Engineer",
    location: "Bangalore",
    experienceMin: 6,
    experienceMax: 10,
    skills: ["Kubernetes", "DevOps", "Terraform"],
    salaryMin: 2500000,
    salaryMax: 3500000,
  },
};

const emptyCandidateApplication = {
  ...baseApplication,
  id: "app_empty",
  stage: "OFFER_EXTENDED",
  candidate: {
    id: "cand_empty",
    name: "Incomplete Candidate",
    currentCity: null,
    preferredLocations: [],
    willRelocate: false,
    totalExperience: 0,
    relevantExperience: 0,
    skills: [],
    degree: null,
    institution: null,
    graduationYear: null,
    currentCtc: null,
    expectedCtc: null,
    ctcFixed: null,
    ctcVariable: null,
    noticePeriod: null,
    canBuyOut: false,
    resumeUrl: null,
    resumeKey: null,
    linkedinUrl: null,
    notes: [],
    voiceScreenings: [],
    whatsappMessages: [],
    interviews: [],
  },
};

const facts = computeScreeningFacts(baseApplication);
assert.equal(facts.skillFit.score, 100);
assert.equal(facts.experienceFit.score, 100);
assert.equal(facts.ctcFit.status, "ok");
assert.equal(facts.locationFit.status, "match");
assert.equal(facts.noticePeriod.status, "short");
assert.equal(facts.voiceScreeningSummary?.completed, true);

const gaps = computeMissingInfo(emptyCandidateApplication);
assert.ok(gaps.some((gap) => gap.category === "current_ctc" && gap.severity === "high"));
assert.ok(gaps.some((gap) => gap.category === "notice_period"));
assert.ok(gaps.some((gap) => gap.category === "skills"));
assert.ok(gaps.some((gap) => gap.category === "reference_check"));

const riskApplication = {
  ...baseApplication,
  noShowRisk: 75,
  matchScore: 42,
  candidate: {
    ...baseApplication.candidate,
    currentCity: "Delhi",
    preferredLocations: ["Delhi"],
    willRelocate: false,
    expectedCtc: 5000000,
    noticePeriod: 90,
    notes: [{ body: "Candidate is worried about a counter offer from current employer." }],
    voiceScreenings: [{ callStatus: "COMPLETED", aiScore: 42, aiSummary: "Communication was unclear." }],
    interviews: [{ outcome: "REJECT", rating: 2 }],
  },
};

const riskFacts = computeScreeningFacts(riskApplication);
const risks = computeJoiningRisks(riskApplication, undefined, undefined, riskFacts);
assert.ok(risks.some((risk) => risk.type === "counter_offer"));
assert.ok(risks.some((risk) => risk.type === "long_notice"));
assert.ok(risks.some((risk) => risk.type === "ctc_mismatch"));
assert.ok(risks.some((risk) => risk.type === "no_show"));
assert.ok(risks.some((risk) => risk.type === "location_mismatch"));
assert.ok(risks.some((risk) => risk.type === "voice_screening_concern"));
assert.ok(risks.some((risk) => risk.type === "prior_rejection"));
assert.ok(risks.some((risk) => risk.type === "low_match_score"));

const dismissedMemory: MemoryQueryResult = {
  entries: [
    {
      id: "mem_1",
      organizationId: "org_1",
      workspaceId: "ws_1",
      userId: "user_1",
      entityType: "application",
      entityId: "app_1",
      action: "risk_dismissed",
      metadata: {
        memoryType: "decision",
        summary: "Risk dismissed: counter_offer",
        sourceModel: "application",
        sourceId: "app_1",
        tags: ["screening", "risk-dismissed", "counter_offer"],
        confidence: "dismissed",
      },
      createdAt: now,
    },
  ],
  total: 1,
  limit: 100,
  offset: 0,
};
const filteredRisks = computeJoiningRisks(riskApplication, dismissedMemory, undefined, riskFacts);
assert.ok(!filteredRisks.some((risk) => risk.type === "counter_offer"));

const readiness = computeReadinessScore(facts, []);
assert.ok(readiness.overall >= 80);
assert.equal(readiness.level, "ready_for_interview");

const riskyReadiness = computeReadinessScore(riskFacts, risks);
assert.ok(riskyReadiness.overall < readiness.overall);
assert.ok(riskyReadiness.riskPenalty > 0);

const questionFacts = computeScreeningFacts({
  ...baseApplication,
  candidate: { ...baseApplication.candidate, skills: ["DevOps"], voiceScreenings: [] },
});
const questions = generateNextQuestions(questionFacts, computeMissingInfo(riskApplication), risks, riskApplication);
assert.ok(questions.some((question) => question.category === "skill_clarification"));
assert.ok(questions.some((question) => question.category === "compensation"));
assert.ok(questions.some((question) => question.category === "joining_risk"));

const strongSummary = buildClientSummary(baseApplication, facts, readiness, [], []);
assert.ok(strongSummary.verdict.startsWith("Strong fit"));
assert.ok(strongSummary.strengths.length > 0);

const riskSummary = buildClientSummary(riskApplication, riskFacts, riskyReadiness, risks, computeMissingInfo(riskApplication));
assert.ok(riskSummary.concerns.length > 0);
assert.ok(riskSummary.recommendation.length > 0);

console.log("Week 7 screening intelligence tests passed");
