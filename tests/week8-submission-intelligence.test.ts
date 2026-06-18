import assert from "node:assert/strict";
import { computeScreeningFacts } from "../lib/screening/facts";
import { computeMissingInfo } from "../lib/screening/gaps";
import { computeJoiningRisks } from "../lib/screening/risks";
import { computeReadinessScore } from "../lib/screening/readiness";
import { buildClientSummary } from "../lib/screening/summary";
import { submissionIntelligenceEnabled } from "../lib/submission/flag";
import { generateFitGapExplanation } from "../lib/submission/fit-gap";
import { generateRiskDisclosure, DISCLOSURE_TEMPLATES } from "../lib/submission/risk-disclosure";
import { buildClientReadySummary } from "../lib/submission/summary";
import { generateSubmissionEmailDraft } from "../lib/submission/email-draft";
import { buildTrackerRow, trackerRowToCsv } from "../lib/submission/tracker";
import { assembleSubmissionPackage } from "../lib/submission/package";
import { DEFAULT_APPROVAL_CONFIG, getApprovalStatusFromHistory, SubmissionApprovalService } from "../lib/submission/approval";
import { getSubmissionStatusFromHistory } from "../lib/submission/memory";
import type { MemoryEntry } from "../lib/memory/types";

assert.equal(submissionIntelligenceEnabled, true);
assert.equal(DEFAULT_APPROVAL_CONFIG.requiresApproval, false);

const now = new Date("2026-06-18T10:00:00Z");
const application = {
  id: "app_1",
  candidateId: "cand_1",
  jobId: "job_1",
  stage: "REVIEWED",
  matchScore: 86,
  noShowRisk: 20,
  submittedAt: null,
  clientFeedback: null,
  createdAt: now,
  updatedAt: now,
  candidate: {
    id: "cand_1",
    name: "Priya Rao",
    email: "priya@example.com",
    phone: "+919999999999",
    currentCompany: "Acme Cloud",
    currentDesignation: "Senior DevOps Engineer",
    currentCity: "Bangalore",
    preferredLocations: ["Bangalore"],
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
    aiSummary: "Strong DevOps candidate with Kubernetes depth.",
    projects: [{ projectName: "Cloud Platform", role: "Lead Engineer", skillsUsed: ["Kubernetes", "Terraform"] }],
    notes: [{ body: "Strong Kubernetes exposure and clear motivation." }],
    voiceScreenings: [{ callStatus: "COMPLETED", aiScore: 84, aiSummary: "Strong communication. Available in 30 days." }],
    whatsappMessages: [],
    interviews: [{ outcome: "PROCEED", rating: 4 }],
  },
  job: {
    id: "job_1",
    clientId: "client_1",
    title: "Senior DevOps Engineer",
    location: "Bangalore",
    experienceMin: 6,
    experienceMax: 10,
    skills: ["Kubernetes", "DevOps", "Terraform"],
    salaryMin: 2500000,
    salaryMax: 3500000,
    description: "Own Kubernetes platform delivery.",
    client: { id: "client_1", name: "CloudBank", contactName: "Mohan", contactEmail: "mohan@cloudbank.test" },
  },
};

const facts = computeScreeningFacts(application);
const gaps = computeMissingInfo(application);
const risks = computeJoiningRisks(application, undefined, undefined, facts);
const readiness = computeReadinessScore(facts, risks);
const screeningSummary = buildClientSummary(application, facts, readiness, risks, gaps);
const workbench = { application, facts, gaps, risks, readiness, summary: screeningSummary };
const companyProfile = {
  name: "TalentPulse",
  brandName: "TalentPulse",
  website: "https://talentpulse.test",
  email: "hello@talentpulse.test",
  phone: "+91 90000 00000",
  tagline: "Agentic talent intelligence",
};

const recruiterNoteEntry: MemoryEntry = {
  id: "mem_note",
  organizationId: "org_1",
  workspaceId: "ws_1",
  userId: "user_1",
  entityType: "application",
  entityId: "app_1",
  action: "note_added",
  metadata: {
    memoryType: "decision",
    summary: "Recruiter note",
    details: "Candidate has led production Kubernetes migrations.",
    sourceModel: "application",
    sourceId: "app_1",
    tags: ["submission", "recruiter-note"],
    confidence: "confirmed",
  },
  createdAt: now,
};

const pkg = assembleSubmissionPackage({
  application,
  workbench,
  companyProfile,
  history: [recruiterNoteEntry],
  includeEmailDraft: true,
  recruiterName: "Mohan Babu",
});

assert.equal(pkg.applicationId, "app_1");
assert.equal(pkg.candidate.name, "Priya Rao");
assert.equal(pkg.job.clientName, "CloudBank");
assert.equal(pkg.readiness.level, "ready_for_interview");
assert.equal(pkg.submissionStatus, "not_submitted");
assert.ok(pkg.summary.oneLiner.includes("DevOps"));
assert.ok(pkg.summary.keyHighlights.length >= 3);
assert.equal(pkg.summary.relevantProjects[0].projectName, "Cloud Platform");

const fitGap = generateFitGapExplanation(facts, readiness, screeningSummary);
assert.equal(fitGap.overall, "strong_fit");
assert.ok(fitGap.dimensions.some((dimension) => dimension.category === "skills" && dimension.fitLevel === "strong"));
assert.ok(fitGap.dimensions.every((dimension) => dimension.evidence.length > 0));
assert.equal(fitGap.recommendedAction, "Proceed to interview");

const riskFixture = [
  { type: "ctc_mismatch", label: "Compensation mismatch", severity: "high" as const, source: "candidate_job_fit", likelihood: 72 },
  { type: "counter_offer", label: "Counter-offer risk", severity: "medium" as const, source: "note", likelihood: 45 },
];
const riskDisclosure = generateRiskDisclosure(riskFixture, new Set(["counter_offer"]));
assert.equal(riskDisclosure.hasRisks, true);
assert.equal(riskDisclosure.riskCount, 1);
assert.equal(riskDisclosure.highRiskCount, 1);
assert.ok(riskDisclosure.noGoFlags.includes("Compensation mismatch"));
assert.ok(riskDisclosure.mitigationPlan.includes("Confirm client flexibility"));
assert.ok(riskDisclosure.disclaimer.includes("Recruiters should verify"));
for (const type of ["counter_offer", "long_notice", "ctc_mismatch", "no_show", "location_mismatch", "voice_screening_concern", "prior_rejection", "low_match_score"]) {
  assert.ok(DISCLOSURE_TEMPLATES[type], `missing disclosure template for ${type}`);
}

const clientSummary = buildClientReadySummary(application, facts, readiness, "Personalized recruiter note.");
assert.ok(clientSummary.compensationSummary.includes("expected"));
assert.ok(clientSummary.availabilitySummary.includes("30"));
assert.ok(clientSummary.educationSummary.includes("B.Tech"));
assert.equal(clientSummary.whyThisCandidate, "Personalized recruiter note.");

assert.ok(pkg.emailDraft);
assert.ok(pkg.emailDraft!.subject.includes("Priya Rao"));
assert.ok(pkg.emailDraft!.subject.includes("Senior DevOps Engineer"));
assert.ok(pkg.emailDraft!.htmlBody.includes("TalentPulse"));
assert.ok(pkg.emailDraft!.htmlBody.includes("Mohan Babu"));
assert.ok(pkg.emailDraft!.metadata.applicationId === "app_1");

const riskyPackage = { ...pkg, riskDisclosure };
const riskyDraft = generateSubmissionEmailDraft(riskyPackage, "Mohan Babu", "Please prioritize this candidate.");
assert.ok(riskyDraft.htmlBody.includes("Risk disclosure"));
assert.ok(riskyDraft.htmlBody.includes("Please prioritize this candidate."));

const trackerRow = buildTrackerRow(pkg, now);
assert.equal(trackerRow.candidateName, "Priya Rao");
assert.equal(trackerRow.jobTitle, "Senior DevOps Engineer");
assert.equal(trackerRow.submissionDate, "2026-06-18");
assert.ok(Object.keys(trackerRow).length >= 30);
const csv = trackerRowToCsv({ ...trackerRow, candidateName: 'Rao, "Priya"' });
assert.ok(csv.startsWith("\uFEFF"));
assert.ok(csv.includes('"Rao, ""Priya"""'));
assert.equal(csv.trim().split("\n").length, 2);

const approvalService = new SubmissionApprovalService({ requiresApproval: true, approverRoles: ["ADMIN"], autoApproveLevels: ["ready_for_interview"] });
assert.equal(approvalService.requiresApproval("ready_for_interview"), false);
assert.equal(approvalService.requiresApproval("likely_fit"), true);
assert.equal(approvalService.canApprove("ADMIN"), true);
assert.equal(approvalService.canApprove("RECRUITER"), false);

const approvalRequested: MemoryEntry = {
  ...recruiterNoteEntry,
  id: "approval_pending",
  action: "action_completed",
  metadata: { ...recruiterNoteEntry.metadata, tags: ["submission", "approval", "pending"], newValue: { submissionStatus: "pending_approval" } },
  createdAt: now,
};
const approvalGranted: MemoryEntry = {
  ...approvalRequested,
  id: "approval_success",
  userId: "admin_1",
  metadata: { ...approvalRequested.metadata, tags: ["submission", "approval", "success"], newValue: { submissionStatus: "approved" } },
  createdAt: new Date("2026-06-18T11:00:00Z"),
};
const approvalRejected: MemoryEntry = {
  ...approvalRequested,
  id: "approval_rejected",
  userId: "admin_1",
  metadata: { ...approvalRequested.metadata, tags: ["submission", "approval", "rejection"], details: "Need better CTC fit", newValue: { submissionStatus: "not_submitted" } },
  createdAt: new Date("2026-06-18T11:30:00Z"),
};

assert.equal(getApprovalStatusFromHistory([approvalRequested]).status, "pending");
assert.equal(getApprovalStatusFromHistory([approvalGranted, approvalRequested]).status, "approved");
const rejectedStatus = getApprovalStatusFromHistory([approvalRejected, approvalRequested]);
assert.equal(rejectedStatus.status, "rejected");
assert.equal(rejectedStatus.reason, "Need better CTC fit");

assert.equal(getSubmissionStatusFromHistory([approvalRequested], null), "pending_approval");
assert.equal(getSubmissionStatusFromHistory([approvalGranted], null), "approved");
assert.equal(getSubmissionStatusFromHistory([], now), "submitted");

console.log("Week 8 submission intelligence tests passed");

