# WEEK 8 — SUBMISSION INTELLIGENCE PLAN

## Purpose

Week 8 builds a **submission intelligence layer** that packages every screening workbench output into a structured, client-ready submission package — with fit-gap explanation, risk disclosure, AI-generated submission email draft, tracker row export, approval workflow, and decision memory capture.

The platform already has screening intelligence (facts, gaps, risks, readiness, questions, summary, Week 7) and conversation capture (insights, follow-up tasks, timeline, Week 6). What it lacks is a **formal submission workflow** that converts a recruiter's "I want to submit this candidate" intent into a polished, auditable, and shareable package for the client — with full traceability back to screening intelligence and institutional memory.

## Principles

1. **No schema changes** — All submission data is stored in existing models (`ActivityLog` for memory, `Application` for `submittedAt`/`clientFeedback`, existing fields).
2. **No new tables** — Submission packages are computed at request time (read-only) or stored in `Application.metadata` as JSON.
3. **Tenant-safe** — All submission endpoints and services go through the Week 3/4 repository layer.
4. **Readiness-gated** — Submission is gated on screening intelligence readiness; `caution` level blocks submission (override-able with confirmation).
5. **Human-in-the-loop** — Every submission decision (approve, reject, override) is captured in memory for audit trail.
6. **Approval-aware** — Submissions may require manager approval before sending to client; configurable per organization.
7. **No automatic sending** — The submission email draft is generated but not sent automatically; recruiter reviews and sends manually.
8. **Tracker-ready** — Each submission produces a structured row suitable for export to spreadsheets or ATS trackers.

---

## 1. Submission Intelligence Architecture

### 1.1 Submission Lifecycle

```
Screening Workbench (Week 7)
         │
         ▼
┌─────────────────────────────────┐
│ Recruiter reviews workbench     │
│ Facts, gaps, risks, readiness   │
│ Questions, summary, memory      │
└─────────────────────────────────┘
         │
         ▼ (Recruiter clicks "Submit to Client")
┌─────────────────────────────────┐
│ 1. Build Submission Package     │
│    - Client-ready summary       │
│    - Fit-gap explanation        │
│    - Risk disclosure            │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Check approval requirement   │
│    - If approval needed →       │
│      PENDING_APPROVAL state     │
│    - If no approval needed →    │
│      generate email draft       │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Recruiter reviews draft      │
│    Edits email body             │
│    Adds personal note           │
│    Confirms or cancels          │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. Approve & Submit             │
│    - Sets submittedAt           │
│    - Updates stage to SUBMITTED │
│    - Captures decision memory   │
│    - Generates tracker row      │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 5. Client feedback loop         │
│    - Received / Rejected        │
│    - Interview scheduled        │
│    - Feedback captured          │
│    - Captured in memory         │
└─────────────────────────────────┘
```

### 1.2 Module Map

```
lib/submission/
  types.ts              — Types: SubmissionPackage, FitGapExplanation, RiskDisclosure, SubmissionEmailDraft, TrackerRow, SubmissionStatus, SubmissionApproval
  package.ts            — BuildSubmissionPackage(): assembles everything from screening workbench + candidate + job + client
  fit-gap.ts            — generateFitGapExplanation(): structured text explaining why candidate fits or doesn't
  risk-disclosure.ts    — generateRiskDisclosure(): formal risk statement with mitigation suggestions
  email-draft.ts        — generateSubmissionEmailDraft(): AI-generated submission email using existing company profile
  tracker.ts            — buildTrackerRow(): structured CSV/JSON row for external tracking
  approval.ts           — ApprovalService: check requirement, create approval request, approve/reject
  service.ts            — orchestrator: submitCandidate(), getSubmissionPackage(), approveSubmission(), rejectSubmission()
  flag.ts               — SUBMISSION_INTELLIGENCE_ENABLED feature flag

app/api/submission/
  package/route.ts      — GET /api/submission/package?applicationId=xxx — returns SubmissionPackage
  submit/route.ts       — POST /api/submission/submit — initiates submission flow
  approve/route.ts      — POST /api/submission/approve — manager approves pending submission
  reject/route.ts       — POST /api/submission/reject — manager rejects submission
  email-draft/route.ts  — POST /api/submission/email-draft — generates/regenerates email draft
  tracker/route.ts      — GET /api/submission/tracker?applicationId=xxx — returns tracker row
  confirm/route.ts      — POST /api/submission/confirm — recruiter confirms submission after review

tests/
  week8-submission-intelligence.test.ts  — 60+ test cases
```

### 1.3 State Constants

```typescript
// Submission status stored in Application.metadata
type SubmissionStatus =
  | "not_submitted"         // Default — no submission attempt
  | "draft"                 // Package built, draft generated, pending recruiter review
  | "pending_approval"      // Requires manager approval
  | "approved"              // Manager approved, ready to submit
  | "submitted"             // Submitted to client (Application.stage === SUBMITTED)
  | "client_rejected"       // Client declined
  | "client_interviewing";  // Client proceeding to interview
```

### 1.4 Feature Flag

```typescript
// lib/submission/flag.ts
export const submissionIntelligenceEnabled = process.env.SUBMISSION_INTELLIGENCE_ENABLED !== "false";
```

Add to `.env`:
```
SUBMISSION_INTELLIGENCE_ENABLED=true
```

---

## 2. Candidate Submission Package

### 2.1 SubmissionPackage Type

```typescript
// lib/submission/types.ts

export interface SubmissionPackage {
  // IDs
  applicationId: string;
  candidateId: string;
  jobId: string;
  clientId: string;

  // Candidate snapshot
  candidate: {
    name: string;
    email: string | null;
    phone: string | null;
    currentCompany: string | null;
    currentDesignation: string | null;
    totalExperience: number;
    relevantExperience: number;
    skills: string[];
    degree: string | null;
    institution: string | null;
    currentCity: string | null;
    preferredLocations: string[];
    willRelocate: boolean;
    currentCtc: number | null;
    expectedCtc: number | null;
    noticePeriod: number | null;
    canBuyOut: boolean;
    resumeUrl: string | null;
    linkedinUrl: string | null;
    aiSummary: string | null;
  };

  // Job snapshot
  job: {
    title: string;
    location: string;
    experienceMin: number;
    experienceMax: number;
    skills: string[];
    salaryMin: number | null;
    salaryMax: number | null;
    description: string;
    clientName: string;
    clientContactName: string | null;
    clientContactEmail: string | null;
  };

  // Screening intelligence (from Week 7)
  facts: ScreeningFacts;
  gaps: MissingInfo[];
  risks: RiskSignal[];
  readiness: ReadinessScore;
  summary: ClientScreeningSummary;

  // Submission-specific
  fitGapExplanation: FitGapExplanation;
  riskDisclosure: RiskDisclosure;
  emailDraft: SubmissionEmailDraft | null;
  trackerRow: TrackerRow;
  submissionStatus: SubmissionStatus;
  submittedAt: string | null;
  clientFeedback: string | null;

  // Recruitor's personal note to client
  recruiterNote: string | null;

  // Company profile for branding
  companyProfile: {
    name: string;
    brandName: string;
    website: string;
    email: string;
    phone: string;
    tagline: string;
  };
}
```

### 2.2 Package Builder

```typescript
// lib/submission/package.ts

export async function buildSubmissionPackage(
  ctx: TenantContext,
  applicationId: string,
): Promise<SubmissionPackage | null> {
  // 1. Fetch application with candidate, job, client (tenant-safe)
  // 2. Fetch company profile (tenant-safe)
  // 3. Compute screening workbench via getScreeningWorkbench() (Week 7)
  // 4. Generate fit-gap explanation
  // 5. Generate risk disclosure
  // 6. Build tracker row
  // 7. Load any existing email draft from memory
  // 8. Assemble and return SubmissionPackage
}
```

The package builder **must**:
- Use `tenantPrisma.application.withContext(ctx).findUnique({ include: { candidate: true, job: { include: { client: true } } } })`
- Use `getCompanyProfile()` from `lib/company.ts` for branding
- Use `getScreeningWorkbench()` from `lib/screening/service.ts` (Week 7) for all intelligence
- Only build package if `readiness.level !== "caution"` (overridable with `force=true` query param)
- Never modify the database — it is a read-only aggregation

### 2.3 Recruiter Note

Allow the recruiter to add a **personal note** that will be included in the submission email:

```typescript
// stored in memory as action="note_added" with tags ["submission", "recruiter-note"]
// Retrieved at package build time from memory service
```

---

## 3. Client-Ready Candidate Summary

### 3.1 Enhanced Summary Format

Building on Week 7's `ClientScreeningSummary` (verdict, strengths, concerns, recommendation), the client-ready summary adds:

```typescript
export interface ClientReadySummary {
  // Original Week 7 fields
  verdict: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;

  // Week 8 additions
  oneLiner: string;                           // "8yr DevOps engineer with Kubernetes expertise, currently at ₹28L, available in 30 days"
  keyHighlights: string[];                    // Top 3-5 bullet points for client
  relevantProjects: {                         // From Candidate.projects matched to job
    projectName: string;
    role: string;
    relevance: string;                        // Why this project matters for this role
  }[];
  compensationSummary: string;                // "Current ₹28L, Expected ₹32L, Budget ₹25-35L — within range"
  availabilitySummary: string;                // "Notice period 30 days, can buy out, earliest join 15 Jul"
  educationSummary: string;                   // "B.Tech VTU 2016"
  whyThisCandidate: string;                   // Recruiter's personalized justification
}
```

### 3.2 Summary Builder

```typescript
// lib/submission/summary.ts

export function buildClientReadySummary(
  app: ApplicationWithScreeningData,
  facts: ScreeningFacts,
  readiness: ReadinessScore,
  recruiterNote?: string | null,
): ClientReadySummary {
  // 1. Generate one-liner from candidate + job data
  // 2. Extract top 3-5 key highlights from strengths + readiness
  // 3. Match candidate projects to job skills (filter relevant ones)
  // 4. Build compensation summary from CTC fit facts
  // 5. Build availability summary from notice period facts
  // 6. Build education summary from education fit facts
  // 7. Generate "why this candidate" from recruiter note or fallback to AI summary
  // 8. Return full ClientReadySummary
}
```

---

## 4. Fit-Gap Explanation

### 4.1 FitGapExplanation Type

```typescript
export interface FitGapExplanation {
  overall: "strong_fit" | "good_fit" | "moderate_fit" | "weak_fit";

  // Structured fit dimensions
  dimensions: {
    category: string;           // "skills", "experience", "compensation", "location", "notice_period", "education"
    fitLevel: "strong" | "good" | "moderate" | "weak";
    explanation: string;        // Human-readable explanation
    evidence: string[];         // Specific data points supporting the assessment
  }[];

  // Consolidated for client consumption
  summary: string;              // Concise paragraph summarizing overall fit
  recommendedAction: string;    // "Proceed to interview" / "Review before proceeding" / "Not recommended"
}
```

### 4.2 Generation Logic

```typescript
// lib/submission/fit-gap.ts

export function generateFitGapExplanation(
  facts: ScreeningFacts,
  readiness: ReadinessScore,
  summary: ClientScreeningSummary,
): FitGapExplanation {
  // Map readiness level to overall fit
  const overallMap: Record<string, "strong_fit" | "good_fit" | "moderate_fit" | "weak_fit"> = {
    ready_for_interview: "strong_fit",
    likely_fit: "good_fit",
    needs_review: "moderate_fit",
    caution: "weak_fit",
  };

  // Build dimension assessments from ScreeningFacts
  const dimensions = [
    buildSkillDimension(facts.skillFit, readiness),
    buildExperienceDimension(facts.experienceFit, readiness),
    buildCompensationDimension(facts.ctcFit, readiness),
    buildLocationDimension(facts.locationFit, readiness),
    buildNoticeDimension(facts.noticePeriod, readiness),
    buildEducationDimension(facts.educationFit, readiness),
  ].filter(Boolean);

  // Generate human-readable summary string
  const summary = generateFitSummary(dimensions, facts);

  // Map readiness recommendation
  const recommendedAction = readiness.level === "ready_for_interview"
    ? "Proceed to interview"
    : readiness.level === "likely_fit"
      ? "Review before proceeding"
      : readiness.level === "needs_review"
        ? "Schedule clarification call first"
        : "Not recommended for submission without validation";

  return { overall: overallMap[readiness.level] ?? "moderate_fit", dimensions, summary, recommendedAction };
}
```

### 4.3 Dimension Builders

Each dimension function produces a structured assessment from the relevant `ScreeningFacts` field:

- `buildSkillDimension(facts.skillFit, readiness)` — matched/missing counts, skill overlap %, JD fit
- `buildExperienceDimension(facts.experienceFit, readiness)` — candidate years vs required range, alignment
- `buildCompensationDimension(facts.ctcFit, readiness)` — CTC comparison, budget fit, stretch indicators
- `buildLocationDimension(facts.locationFit, readiness)` — city match, preferred locations, relocation willingness
- `buildNoticeDimension(facts.noticePeriod, readiness)` — notice days, buyout, earliest join date estimate
- `buildEducationDimension(facts.educationFit, readiness)` — degree, institution, assessed status

Each dimension returns:
```typescript
{
  category: string;
  fitLevel: "strong" | "good" | "moderate" | "weak";
  explanation: string;
  evidence: string[];
}
```

---

## 5. Risk Disclosure

### 5.1 RiskDisclosure Type

```typescript
export interface RiskDisclosure {
  hasRisks: boolean;
  riskCount: number;
  highRiskCount: number;

  // Individual risk disclosures (from ScreeningRisks)
  items: {
    riskType: string;
    label: string;
    severity: "high" | "medium" | "low";
    disclosure: string;                 // Client-facing language
    likelihood: number;                 // 0-100
    mitigation: string;                 // Suggested mitigation
    dismissedByRecruiter: boolean;      // True if recruiter dismissed this risk
  }[];

  // Consolidated disclosures
  executiveSummary: string;             // "2 high risks, 3 medium risks identified"
  noGoFlags: string[];                  // Risks that block submission (high severity + high likelihood)
  mitigationPlan: string;              // "Counter-offer: confirm candidate motivation before offer stage"
  disclaimer: string;                  // Standard disclaimer text
}
```

### 5.2 Generation Logic

```typescript
// lib/submission/risk-disclosure.ts

export function generateRiskDisclosure(
  risks: RiskSignal[],
  dismissedRisks: Set<string>,
): RiskDisclosure {
  const activeRisks = risks.filter((risk) => !dismissedRisks.has(risk.type));

  // Map each risk to client-facing disclosure
  const items = activeRisks.map((risk) => ({
    ...risk,
    disclosure: toClientFacingDisclosure(risk),
    mitigation: toMitigationSuggestion(risk),
    dismissedByRecruiter: dismissedRisks.has(risk.type),
  }));

  // Identify no-go flags: high severity + likelihood >= 60
  const noGoFlags = items
    .filter((item) => item.severity === "high" && item.likelihood >= 60)
    .map((item) => item.label);

  // Build executive summary
  const high = items.filter((r) => r.severity === "high").length;
  const medium = items.filter((r) => r.severity === "medium").length;
  const low = items.filter((r) => r.severity === "low").length;

  // Build mitigation plan
  const mitigationPlan = items
    .map((item) => `${item.label}: ${item.mitigation}`)
    .join("\n");

  const disclaimer = "This risk assessment is AI-generated based on available profile data, conversation insights, and pipeline history. Recruiters should independently verify all concerns before client presentation.";

  return {
    hasRisks: items.length > 0,
    riskCount: items.length,
    highRiskCount: high,
    items,
    executiveSummary: noGoFlags.length > 0
      ? `${noGoFlags.length} blocking risk(s) — submission not recommended. ${high} high, ${medium} medium, ${low} low.`
      : `${high} high, ${medium} medium, ${low} low risk(s) identified — manageable with mitigation.`,
    noGoFlags,
    mitigationPlan,
    disclaimer,
  };
}
```

### 5.3 Client-Facing Disclosure Templates

```typescript
const DISCLOSURE_TEMPLATES: Record<string, { disclosure: string; mitigation: string }> = {
  counter_offer: {
    disclosure: "Candidate may receive a counter-offer from current employer, which could affect acceptance.",
    mitigation: "Confirm candidate's primary motivations beyond compensation before offer stage.",
  },
  long_notice: {
    disclosure: "Candidate has an extended notice period which may delay joining.",
    mitigation: "Confirm buyout option and negotiate early release; have backup candidates ready.",
  },
  ctc_mismatch: {
    disclosure: "Expected compensation exceeds the role budget, requiring budget confirmation or negotiation.",
    mitigation: "Discuss flexibility with the client; candidate may negotiate within range.",
  },
  no_show: {
    disclosure: "Historical data indicates elevated risk of interview no-show.",
    mitigation: "Send calendar reminders; confirm availability 24hrs before interview.",
  },
  location_mismatch: {
    disclosure: "Candidate location does not match the role and relocation is unconfirmed.",
    mitigation: "Confirm relocation willingness and timeline before interview scheduling.",
  },
  voice_screening_concern: {
    disclosure: "Voice screening score is below threshold, indicating potential communication or fit concern.",
    mitigation: "Conduct an additional screening call focused on the low-scoring areas.",
  },
  prior_rejection: {
    disclosure: "Candidate has a prior rejection or negative outcome in this pipeline.",
    mitigation: "Discuss what has changed since the prior rejection before proceeding.",
  },
  low_match_score: {
    disclosure: "AI match score is below 50, suggesting limited skill or experience alignment.",
    mitigation: "Review specific skill/experience gaps with the client before interview.",
  },
};
```

---

## 6. Submission Email Draft

### 6.1 SubmissionEmailDraft Type

```typescript
export interface SubmissionEmailDraft {
  subject: string;
  body: string;                   // HTML formatted
  recipientName: string;
  recipientEmail: string;
  ccRecipients: string[];
  fromName: string;               // Recruiter name or company brand
  fromEmail: string;              // Company email

  // Metadata
  generatedAt: string;
  model: string;                  // Which AI model generated this
  draftId: string;                // Memory entityId for this draft
  regenerated: boolean;           // True if this is a regeneration
}
```

### 6.2 Generation Logic

```typescript
// lib/submission/email-draft.ts

export async function generateSubmissionEmailDraft(
  ctx: TenantContext,
  userId: string,
  packageData: SubmissionPackage,
  previousDraftId?: string | null,
): Promise<SubmissionEmailDraft> {
  // 1. Get company profile for branding
  const company = packageData.companyProfile;

  // 2. Get recruiter name from user context
  // 3. Get client contact info from job.client

  // 4. Call AI provider (same pattern as email-campaigns/ai-draft)
  //    - System prompt: professional recruitment submission email
  //    - User prompt includes: candidate summary, fit-gap explanation, risk disclosure (if any), recruiter note
  //    - Response format: JSON with subject, body (HTML), cc

  // 5. If risk level is high, add risk disclosure section to email
  // 6. If recruiter note exists, append as "Recruiter's Note" section

  // 7. Store draft in memory (action="submission_draft_generated")
  //    for audit trail and retrieval

  // 8. Return SubmissionEmailDraft
}
```

### 6.3 Email Template Structure

The generated email should follow this structure:

```
Subject: Candidate Submission: {candidateName} — {jobTitle}

Hi {clientContactName},

I'd like to present {candidateName} for the {jobTitle} role.

{oneLiner from ClientReadySummary}

Key Highlights:
• {highlight 1}
• {highlight 2}
• {highlight 3}

Fit-Gap Summary:
{fitGapExplanation.summary}

{Risk Disclosure section — only if hasRisks}
Risk Assessment:
• {risk disclosure items}
Mitigation: {mitigationPlan}

{Recruiter Note — only if present}
Recruiter's Note:
{recruiterNote}

Resume: {resumeUrl}
LinkedIn: {linkedinUrl}

Please let me know if you'd like to proceed with scheduling an interview.

Best regards,
{recruiterName}
{companyBrandName}
{companyPhone}
{companyEmail}
```

### 6.4 AI Prompt Design

```
SYSTEM: You are a professional recruitment consultant writing a candidate submission
email to a client hiring manager. Use a consultative, respectful tone. Be specific
about the candidate's strengths. If risks exist, acknowledge them transparently
with proposed mitigations. Return ONLY a JSON object with "subject" and "body"
(HTML) fields. No markdown wrapping.

USER:
Generate a submission email for:

Candidate: {candidateName}
Role: {jobTitle}
Client: {clientName}
Contact: {clientContactName}

Candidate Summary: {oneLiner}
Key Highlights: {highlights}

Fit-Gap: {fitGapSummary}
Risks: {riskExecutiveSummary}
Mitigations: {mitigationPlan}

Recruiter Note: {recruiterNote}

Company: {companyBrandName}
Consultant: {recruiterName}
Phone: {companyPhone}
Email: {companyEmail}
```

---

## 7. Tracker Row Export

### 7.1 TrackerRow Type

```typescript
export interface TrackerRow {
  // Core submission data — flat structure for CSV/Google Sheets/ATS
  submissionDate: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobTitle: string;
  clientName: string;
  clientContact: string;
  recruiterName: string;

  // Profile data
  currentCompany: string;
  currentDesignation: string;
  totalExperience: number;
  relevantExperience: number;
  skills: string;
  degree: string;
  institution: string;
  currentCity: string;
  preferredLocations: string;

  // Compensation
  currentCtc: string;
  expectedCtc: string;
  budgetRange: string;

  // Availability
  noticePeriod: string;
  earliestJoinDate: string;

  // Screening data
  matchScore: number;
  readinessLevel: string;
  readinessScore: number;

  // Risk data
  riskCount: number;
  highRiskCount: number;
  topRisks: string;

  // Status
  submissionStatus: string;
  clientFeedback: string | null;

  // Links
  resumeUrl: string | null;
  linkedinUrl: string | null;
  talentPulseProfileUrl: string;
}
```

### 7.2 Builder Logic

```typescript
// lib/submission/tracker.ts

export function buildTrackerRow(
  app: ApplicationWithScreeningData,
  pkg: SubmissionPackage,
  ctx: TenantContext,
): TrackerRow {
  // Flat structure, all string values for easy export
  return {
    submissionDate: new Date().toISOString().split("T")[0],
    candidateName: pkg.candidate.name,
    candidateEmail: pkg.candidate.email ?? "",
    // ... map all fields
    talentPulseProfileUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/recruiter/candidates/${pkg.candidateId}`,
  };
}
```

### 7.3 Export Formats

The tracker endpoint should support two output formats via `Accept` header or `?format=` query param:

| Format | Usage |
|--------|-------|
| `json` | Default — full `TrackerRow` object |
| `csv`  | Comma-separated values with header row |

The CSV export should:
- Escape commas, quotes, and newlines in values
- Use `\r\n` line endings for Excel compatibility
- Include a UTF-8 BOM for proper Unicode rendering in Excel (especially for ₹/INR symbols)

---

## 8. Approval Workflow

### 8.1 Approval Requirement

```typescript
// lib/submission/approval.ts

export interface SubmissionApprovalConfig {
  requiresApproval: boolean;      // Per-organization, stored in company profile or metadata
  approverRoles: string[];        // ["ADMIN"] — who can approve
  autoApproveLevels: string[];    // ["ready_for_interview"] — skip approval for these readiness levels
}

// Default: no approval required unless explicitly configured
export const DEFAULT_APPROVAL_CONFIG: SubmissionApprovalConfig = {
  requiresApproval: false,
  approverRoles: ["ADMIN"],
  autoApproveLevels: ["ready_for_interview"],
};
```

### 8.2 Approval States

```
submitCandidate()
    │
    ▼
┌───────────────────────────┐
│ Check approval config     │
└───────────────────────────┘
    │                │
    ▼                ▼
No approval      Requires approval
needed           │
    │            ▼
    │    ┌───────────────────────┐
    │    │ Create approval       │
    │    │ request in memory     │
    │    │ action="approval_     │
    │    │  requested"           │
    │    │ status="PENDING"      │
    │    └───────────────────────┘
    │            │
    │            ▼
    │    ┌───────────────────────┐
    │    │ Notify approvers      │
    │    │ (in-app only, no      │
    │    │  automatic email)     │
    │    └───────────────────────┘
    │            │
    ▼            ▼
┌───────────────────────────┐
│ Set submissionStatus      │
│ → "pending_approval"      │
│ (or "draft" if no         │
│  approval needed)         │
└───────────────────────────┘
```

### 8.3 Approval Service

```typescript
export class SubmissionApprovalService {
  async requiresApproval(ctx: TenantContext): Promise<boolean>;
  async createApprovalRequest(ctx: TenantContext, userId: string, applicationId: string): Promise<string>;
  async approve(ctx: TenantContext, approverId: string, applicationId: string, notes?: string): Promise<boolean>;
  async reject(ctx: TenantContext, approverId: string, applicationId: string, reason: string): Promise<boolean>;
  async getApprovalStatus(ctx: TenantContext, applicationId: string): Promise<{ status: string; requestedAt: string | null; approvedAt: string | null; rejectedAt: string | null; approverId: string | null }>;
}
```

All state stored in memory entries:
- `action="approval_requested"`, tags: `["submission", "approval"]`
- `action="approval_granted"`, tags: `["submission", "approval"]`
- `action="approval_rejected"`, tags: `["submission", "approval"]`

### 8.4 UI Integration Points (design only, no UI implementation)

The approval workflow is designed for future UI integration:

```
Recruiter clicks "Submit" →
  Package built → draft generated →
    If approval required:
      Show "Approval Required" notice with approver list
      Send in-app notification to approvers
      Approver sees pending approval in their dashboard
    If no approval required:
      Show email draft preview
      Recruiter confirms → submission complete
```

---

## 9. Decision Memory Capture

### 9.1 Capture Points

Every decision point in the submission lifecycle is captured in institutional memory:

| Event | `action` | `entityType` | Tags | `memoryType` |
|-------|----------|-------------|------|-------------|
| Package viewed | `summary_updated` | `application` | `["submission", "package-viewed"]` | `decision` |
| Submission initiated | `stage_changed` | `application` | `["submission", "submission-initiated"]` | `decision` |
| Email draft generated | `summary_updated` | `application` | `["submission", "draft-generated"]` | `decision` |
| Email draft regenerated | `summary_updated` | `application` | `["submission", "draft-regenerated"]` | `decision` |
| Approval requested | `action_completed` | `application` | `["submission", "approval"]` | `decision` |
| Approval granted | `action_completed` | `application` | `["submission", "approval", "success"]` | `decision` |
| Approval rejected | `action_completed` | `application` | `["submission", "approval", "rejection"]` | `decision` |
| Candidate submitted | `stage_changed` | `application` | `["submission", "submitted", "success"]` | `outcome` |
| Client feedback received | `client_feedback` | `application` | `["submission", "client-feedback"]` | `candidate` |
| Client rejected | `stage_changed` | `application` | `["submission", "client-rejected"]` | `outcome` |
| Submission overrode caution | `screening_confirmed` | `application` | `["submission", "override-caution"]` | `decision` |

### 9.2 Capture Implementation

```typescript
// lib/submission/memory.ts

import { captureMemoryWithContext } from "@/lib/memory/service";
import type { TenantContext } from "@/lib/tenant/context";

export async function captureSubmissionMemory(
  ctx: TenantContext,
  params: {
    userId: string | null;
    applicationId: string;
    candidateId: string;
    action: string;
    summary: string;
    details?: string | null;
    tags?: string[];
    importance?: "low" | "medium" | "high";
    newValue?: Record<string, any>;
  },
) {
  await captureMemoryWithContext(ctx, {
    userId: params.userId,
    entityType: "application",
    entityId: params.applicationId,
    action: params.action as any,
    metadata: {
      memoryType: params.action === "stage_changed" ? "outcome" : "decision",
      summary: params.summary,
      details: params.details ?? null,
      sourceModel: "application",
      sourceId: params.applicationId,
      tags: ["submission", ...(params.tags ?? [])],
      confidence: "confirmed",
      importance: params.importance ?? "medium",
      channel: "screening",
      direction: "internal",
      newValue: { candidateId: params.candidateId, ...(params.newValue ?? {}) },
    },
  });
}
```

### 9.3 Retrieval for Submission History

```typescript
export async function getSubmissionHistory(
  ctx: TenantContext,
  applicationId: string,
): Promise<MemoryEntry[]> {
  const result = await getMemory(ctx, {
    entityType: "application",
    entityId: applicationId,
    tags: ["submission"],
    sortBy: "createdAt",
    sortOrder: "asc",
    includeDismissed: false,
  });
  return result.entries;
}
```

---

## 10. Tenant-Safe APIs

### 10.1 API Overview

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/submission/package` | GET | ADMIN, RECRUITER | Get full submission package |
| `/api/submission/submit` | POST | ADMIN, RECRUITER | Initiate submission flow |
| `/api/submission/approve` | POST | ADMIN | Manager approves submission |
| `/api/submission/reject` | POST | ADMIN | Manager rejects submission |
| `/api/submission/email-draft` | POST | ADMIN, RECRUITER | Generate/regenerate email draft |
| `/api/submission/tracker` | GET | ADMIN, RECRUITER | Get tracker row |
| `/api/submission/confirm` | POST | ADMIN, RECRUITER | Recruiter confirms submission |
| `/api/submission/history` | GET | ADMIN, RECRUITER | Get submission history |

### 10.2 Common Pattern

Every API route follows the established pattern:

```typescript
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { submissionIntelligenceEnabled } from "@/lib/submission/flag";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!submissionIntelligenceEnabled)
    return NextResponse.json({ enabled: false }, { status: 404 });

  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  // ... route-specific logic using tenant-safe repository calls
}
```

### 10.3 Route Details

#### GET /api/submission/package

Query params: `applicationId` (required), `force` (optional, boolean — bypass caution gate)

```typescript
// Flow:
// 1. Validate applicationId
// 2. Call buildSubmissionPackage(ctx, applicationId)
// 3. If caution level and !force, return 409 with warning
// 4. Capture memory: action="summary_updated", tags=["submission", "package-viewed"]
// 5. Return SubmissionPackage JSON
```

#### POST /api/submission/submit

Body: `{ applicationId, recruiterNote?, force? }`

```typescript
// Flow:
// 1. Validate applicationId
// 2. Build package (read-only)
// 3. Check readiness: if caution and !force, return 409
// 4. Check approval config
// 5. If approval required: create approval request, return { status: "pending_approval" }
// 6. If no approval: set submissionStatus = "draft", return { status: "draft" }
// 7. Capture memory: action="stage_changed", tags=["submission", "submission-initiated"]
```

#### POST /api/submission/approve

Body: `{ applicationId, notes? }`

```typescript
// Flow:
// 1. Validate applicationId + user has ADMIN role
// 2. Check existing approval request exists and is pending
// 3. Update: submissionStatus → "approved" in metadata
// 4. Capture memory: action="action_completed", tags=["submission", "approval", "success"]
// 5. Return { success: true }
```

#### POST /api/submission/reject

Body: `{ applicationId, reason }`

```typescript
// Flow:
// 1. Validate applicationId + reason + user has ADMIN role
// 2. Check existing approval request exists and is pending
// 3. Update: submissionStatus → stays at current (no progression)
// 4. Capture memory: action="action_completed", tags=["submission", "approval", "rejection"]
// 5. Return { success: true }
```

#### POST /api/submission/email-draft

Body: `{ applicationId, regenerate? }`

```typescript
// Flow:
// 1. Validate applicationId
// 2. Build package (fresh)
// 3. Call generateSubmissionEmailDraft(ctx, user.id, packageData)
// 4. If regenerate=true and previous draft exists, pass previousDraftId
// 5. Capture memory with draft summary
// 6. Return SubmissionEmailDraft JSON
```

#### GET /api/submission/tracker

Query params: `applicationId` (required), `format` (optional, "json" or "csv")

```typescript
// Flow:
// 1. Validate applicationId
// 2. Build package (fresh)
// 3. Call buildTrackerRow()
// 4. If format=csv: set Content-Type: text/csv; header Content-Disposition: attachment
// 5. Return TrackerRow or CSV string
```

#### POST /api/submission/confirm

Body: `{ applicationId, action: "confirm" | "cancel" }`

```typescript
// Flow:
// 1. Validate applicationId + action
// 2. If action === "confirm":
//    - Set Application.submittedAt = new Date()
//    - Update Application.stage = "SUBMITTED"
//    - Set submissionStatus = "submitted" in metadata
//    - Capture memory: action="stage_changed", tags=["submission", "submitted", "success"]
// 3. If action === "cancel":
//    - Set submissionStatus back to "not_submitted"
//    - Capture memory: action="stage_changed", tags=["submission", "cancelled"]
// 4. Return { success: true }
```

#### GET /api/submission/history

Query params: `applicationId` (required)

```typescript
// Flow:
// 1. Validate applicationId
// 2. Call getSubmissionHistory(ctx, applicationId)
// 3. Return MemoryEntry[] filtered by submission tags
```

### 10.4 Middleware

The matcher already includes `/api/screening/:path*` and `/api/memory/:path*`. Add `/api/submission/:path*`:

```typescript
// middleware.ts — add to matcher array
"/api/submission/:path*",
```

### 10.5 Error Responses

| HTTP | Condition |
|------|-----------|
| 404 | Feature disabled, application not found, no tenant context |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role) |
| 409 | Caution level without force flag |
| 400 | Missing required params |

---

## 11. Tests (60+ test cases)

### 11.1 Test Structure

```
tests/week8-submission-intelligence.test.ts

Group 1: Submission Package (8 tests)
  - buildSubmissionPackage returns valid package for known application
  - buildSubmissionPackage returns null for unknown application
  - Package contains all required fields
  - Package contains screening facts
  - Package contains company profile
  - Package respects force flag for caution readiness
  - Package handles missing candidate data gracefully
  - Package is read-only (no DB mutations)

Group 2: Fit-Gap Explanation (10 tests)
  - generateFitGapExplanation returns "strong_fit" for ready_for_interview
  - generateFitGapExplanation returns "good_fit" for likely_fit
  - generateFitGapExplanation returns "moderate_fit" for needs_review
  - generateFitGapExplanation returns "weak_fit" for caution
  - Skill dimension correctly reports fit from facts
  - Experience dimension correctly reports fit from facts
  - Compensation dimension correctly reports fit from facts
  - Location dimension correctly reports fit from facts
  - Notice period dimension correctly reports fit from facts
  - Summary paragraph is non-empty and coherent

Group 3: Risk Disclosure (8 tests)
  - generateRiskDisclosure returns hasRisks=false for empty risks
  - generateRiskDisclosure maps each risk to client-facing language
  - generateRiskDisclosure identifies no-go flags correctly
  - generateRiskDisclosure excluded dismissed risks
  - Mitigation suggestion exists for each risk type
  - Executive summary reflects risk counts correctly
  - Disclaimer text is present
  - All 8 risk types have disclosure templates

Group 4: Email Draft (8 tests)
  - generateSubmissionEmailDraft returns valid subject + body
  - Draft includes candidate name
  - Draft includes job title
  - Draft includes company branding
  - Draft includes recruiter name
  - Draft includes risk disclosure when risks present
  - Draft includes recruiter note when provided
  - Draft model and timestamp are captured in metadata

Group 5: Tracker Row (8 tests)
  - buildTrackerRow returns all required fields
  - CSV format has header row
  - CSV format has data row
  - CSV escapes commas and quotes
  - CSV includes UTF-8 BOM
  - JSON format has full TrackerRow structure
  - Tracker row contains candidate name
  - Tracker row contains submission date

Group 6: Approval Workflow (8 tests)
  - requiresApproval returns false by default
  - requiresApproval returns true when configured
  - createApprovalRequest returns request ID
  - approve updates status, captures memory
  - reject updates status, captures memory
  - getApprovalStatus returns pending for unapproved
  - getApprovalStatus returns approved after approval
  - Approval only by ADMIN role

Group 7: Decision Memory Capture (6 tests)
  - captureSubmissionMemory stores entry with submission tag
  - getSubmissionHistory returns submission-related entries
  - Submission initiated captured correctly
  - Candidate submitted captured correctly
  - Client feedback captured correctly
  - Override caution captured correctly

Group 8: API Routes (6 tests)
  - GET /api/submission/package returns 401 without auth
  - GET /api/submission/package returns 400 without applicationId
  - GET /api/submission/package returns 404 for unknown applicationId
  - POST /api/submission/confirm updates stage to SUBMITTED
  - POST /api/submission/submit creates draft or pending_approval
  - GET /api/submission/tracker returns CSV format when requested
```

### 11.2 Test Implementation Pattern

All tests follow the established pattern from `week7-screening-intelligence.test.ts`:

```typescript
import assert from "node:assert/strict";
import { buildSubmissionPackage } from "../lib/submission/package";
import { generateFitGapExplanation } from "../lib/submission/fit-gap";
import { generateRiskDisclosure } from "../lib/submission/risk-disclosure";
// ... other imports

// Test data using the same baseApplication from Week 7
// Plus new test fixtures for submission scenarios

assert.equal(submissionIntelligenceEnabled, true);

// Group 1 tests
const pkg = await buildSubmissionPackage(ctx, "app_1");
assert.ok(pkg);
assert.equal(pkg.fitGapExplanation.overall, "strong_fit");

// ... (60+ total assertions)

console.log("Week 8 submission intelligence tests passed");
```

### 11.3 Test Fixtures

Reuse and extend the existing Week 7 `baseApplication` fixture with:
- A `SUBMITTED` stage application fixture
- An `OFFER_EXTENDED` stage application fixture
- A caution-level readiness fixture (for rejection scenarios)
- An application with client feedback already recorded
- An application needing approval configured

---

## 12. Rollback Plan

### 12.1 Reversibility

All Week 8 changes are additive and reversible:

| Change | Reversal |
|--------|----------|
| New `lib/submission/` directory | Delete directory |
| New `/api/submission/` routes | Delete directory |
| New test file `week8-submission-intelligence.test.ts` | Delete file |
| `middleware.ts` matcher addition | Remove `/api/submission/:path*` from matcher |
| `.env` feature flag | Remove `SUBMISSION_INTELLIGENCE_ENABLED` from env |
| Existing code modifications (screening service, memory types) | Revert with `git checkout` |

### 12.2 No-Schema-Change Guarantee

Week 8 introduces **zero** schema changes:
- No new Prisma models
- No new columns
- No new migrations
- All state stored in existing `Application.metadata` (JSON) or `ActivityLog` entries

### 12.3 Safe Rollback Sequence

```bash
# Step 1: Disable feature flag
# Set SUBMISSION_INTELLIGENCE_ENABLED=false in .env

# Step 2: Verify no impact
# All existing API routes continue working
# No compilation errors (feature flag gates all new code)

# Step 3: Remove code (optional)
git checkout -- lib/submission/
git checkout -- app/api/submission/
git checkout -- tests/week8-submission-intelligence.test.ts
# Manually revert middleware.ts matcher addition

# Step 4: Verify build
npm run build
```

### 12.4 Rollback Success Criteria

- [ ] `npm run build` passes
- [ ] Existing `/api/screening/workbench` works
- [ ] Existing `/api/memory/*` works
- [ ] Existing `/api/conversations/timeline` works
- [ ] Existing pipeline stage changes work
- [ ] No dangling imports pointing to deleted modules

---

## 13. Acceptance Criteria (58 total)

### 13.1 Submission Package (AC-1 to AC-8)

- [ ] AC-1: GET `/api/submission/package` returns structured package for valid applicationId
- [ ] AC-2: Package includes candidate name, email, phone, company, designation, experience, skills
- [ ] AC-3: Package includes job title, location, experience range, skills, salary range
- [ ] AC-4: Package includes client name and contact info
- [ ] AC-5: Package includes ScreeningFacts, MissingInfo, RiskSignal, ReadinessScore from Week 7
- [ ] AC-6: Package includes company profile branding data
- [ ] AC-7: Package returns 409 if readiness is "caution" and force flag is not set
- [ ] AC-8: Package returns 200 with force=true even for caution readiness

### 13.2 Fit-Gap Explanation (AC-9 to AC-16)

- [ ] AC-9: Fit-gap explanation includes overall fit level (strong/good/moderate/weak)
- [ ] AC-10: Fit-gap explanation includes per-dimension assessments for skills, experience, compensation, location, notice period, education
- [ ] AC-11: Each dimension includes fit level, explanation, and evidence array
- [ ] AC-12: Fit-gap explanation includes a human-readable summary paragraph
- [ ] AC-13: Fit-gap explanation includes a recommended action string
- [ ] AC-14: "strong_fit" maps to readiness level "ready_for_interview"
- [ ] AC-15: "weak_fit" maps to readiness level "caution"
- [ ] AC-16: Evidence array contains specific data points, not generic text

### 13.3 Risk Disclosure (AC-17 to AC-25)

- [ ] AC-17: Risk disclosure has `hasRisks` boolean
- [ ] AC-18: Risk disclosure includes per-risk items with client-facing language
- [ ] AC-19: Each risk item includes a mitigation suggestion
- [ ] AC-20: Dismissed risks are excluded from disclosure
- [ ] AC-21: `noGoFlags` lists only high-severity + high-likelihood risks
- [ ] AC-22: Executive summary mentions risk counts by severity
- [ ] AC-23: Mitigation plan is a non-empty string when risks exist
- [ ] AC-24: Disclaimer text is always included
- [ ] AC-25: All 8 risk types have disclosure + mitigation templates

### 13.4 Email Draft (AC-26 to AC-33)

- [ ] AC-26: POST `/api/submission/email-draft` returns valid draft with subject and body
- [ ] AC-27: Draft subject includes candidate name and job title
- [ ] AC-28: Draft body is HTML formatted
- [ ] AC-29: Draft includes company branding (name, phone, email)
- [ ] AC-30: Draft includes recruiter name
- [ ] AC-31: Draft includes risk disclosure section when `hasRisks` is true
- [ ] AC-32: Draft includes recruiter note if provided
- [ ] AC-33: Draft metadata includes generation timestamp and model

### 13.5 Tracker Row (AC-34 to AC-40)

- [ ] AC-34: Tracker row includes all 30+ required fields
- [ ] AC-35: JSON format returns structured `TrackerRow` object
- [ ] AC-36: CSV format returns text with header and data rows
- [ ] AC-37: CSV properly escapes special characters
- [ ] AC-38: CSV includes UTF-8 BOM
- [ ] AC-39: Submit date is set to current date
- [ ] AC-40: TalentPulse profile URL is included

### 13.6 Approval Workflow (AC-41 to AC-48)

- [ ] AC-41: Approval is not required by default
- [ ] AC-42: Approval can be configured per-organization
- [ ] AC-43: `ready_for_interview` level auto-skips approval if configured
- [ ] AC-44: POST `/api/submission/submit` returns `pending_approval` when approval required
- [ ] AC-45: Only ADMIN role can approve/reject
- [ ] AC-46: Approved submissions can proceed to confirmation
- [ ] AC-47: Rejected submissions stay at current status
- [ ] AC-48: Approval requests are stored in memory for audit trail

### 13.7 Submission Flow (AC-49 to AC-53)

- [ ] AC-49: POST `/api/submission/confirm` with action="confirm" sets `submittedAt` and stage="SUBMITTED"
- [ ] AC-50: POST `/api/submission/confirm` with action="cancel" resets submission status
- [ ] AC-51: Submission confirm captures decision memory with tags ["submission", "submitted", "success"]
- [ ] AC-52: Previous submission state is preserved in memory for rollback
- [ ] AC-53: Submitting a second time creates new submission package (not a duplicate)

### 13.8 Memory & Audit (AC-54 to AC-58)

- [ ] AC-54: Every submission action is captured in institutional memory
- [ ] AC-55: Submission history is retrievable via GET `/api/submission/history`
- [ ] AC-56: Memory entries have `tags` including "submission"
- [ ] AC-57: Client feedback is stored on Application.clientFeedback
- [ ] AC-58: All memory captures are fire-and-forget (non-blocking)

---

## Appendix A: File Manifest

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `lib/submission/types.ts` | 180 | All types: SubmissionPackage, FitGapExplanation, RiskDisclosure, SubmissionEmailDraft, TrackerRow, etc. |
| `lib/submission/flag.ts` | 2 | Feature flag |
| `lib/submission/package.ts` | 120 | buildSubmissionPackage() orchestrator |
| `lib/submission/fit-gap.ts` | 150 | generateFitGapExplanation() + dimension builders |
| `lib/submission/risk-disclosure.ts` | 130 | generateRiskDisclosure() + disclosure templates |
| `lib/submission/summary.ts` | 90 | buildClientReadySummary() |
| `lib/submission/email-draft.ts` | 110 | generateSubmissionEmailDraft() |
| `lib/submission/tracker.ts` | 100 | buildTrackerRow() + CSV formatter |
| `lib/submission/approval.ts` | 130 | ApprovalService class |
| `lib/submission/memory.ts` | 60 | captureSubmissionMemory() + getSubmissionHistory() |
| `lib/submission/service.ts` | 100 | submitCandidate(), getSubmissionPackage(), approveSubmission(), rejectSubmission() |
| `app/api/submission/package/route.ts` | 55 | GET /api/submission/package |
| `app/api/submission/submit/route.ts` | 55 | POST /api/submission/submit |
| `app/api/submission/approve/route.ts` | 45 | POST /api/submission/approve |
| `app/api/submission/reject/route.ts` | 45 | POST /api/submission/reject |
| `app/api/submission/email-draft/route.ts` | 50 | POST /api/submission/email-draft |
| `app/api/submission/tracker/route.ts` | 55 | GET /api/submission/tracker |
| `app/api/submission/confirm/route.ts` | 55 | POST /api/submission/confirm |
| `app/api/submission/history/route.ts` | 35 | GET /api/submission/history |
| `tests/week8-submission-intelligence.test.ts` | 350 | 60+ test cases across 8 groups |
| `middleware.ts` | +1 line | Add `/api/submission/:path*` to matcher |

**Total estimated: ~2,000 lines added, 0 lines modified in existing files (except middleware.ts)**

---

## Appendix B: Integration Points

### B.1 Week 7 Screening Intelligence

| Week 7 Source | Used By Week 8 |
|---------------|----------------|
| `computeScreeningFacts()` | Submission package, fit-gap dimensions, risk disclosure |
| `computeMissingInfo()` | Fit-gap explanation evidence, summary concerns |
| `computeJoiningRisks()` | Risk disclosure input, no-go flag computation |
| `computeReadinessScore()` | Submission gating, fit-gap mapping |
| `generateNextQuestions()` | (not needed directly for submission — recruiter uses separately) |
| `buildClientSummary()` | Base for ClientReadySummary, client-facing sections |
| `getScreeningWorkbench()` | Core input to buildSubmissionPackage() |
| `confirmScreeningVerdict()` | Used for caution override capture |
| `dismissScreeningRisk()` | Risk disclosure filters out dismissed risks |

### B.2 Week 6 Conversation Capture

| Week 6 Source | Used By Week 8 |
|---------------|----------------|
| `captureConversationMemory()` | Pattern for submission memory capture |
| `ConversationChannel` | Channel set to `"screening"` for submission actions |
| `getConversationId()` | (not needed — submission is not a conversation channel) |

### B.3 Week 5 Institutional Memory

| Week 5 Source | Used By Week 8 |
|---------------|----------------|
| `captureMemoryWithContext()` | All submission decision capture |
| `getMemory()` / `getMemoryTimeline()` | Submission history retrieval, dismissed risk check |
| `MemoryMetadata` | Extended with submission-specific `tags` and `memoryType` |
| `MemoryInput` | Standard interface for all submission captures |

### B.4 Week 4 Tenant Enforcement

| Week 4 Source | Used By Week 8 |
|---------------|----------------|
| `tenantPrisma.model.withContext(ctx)` | All database access in submission endpoints |
| `TenantContext` | Passed through all submission service functions |
| `resolveTenantContext()` | Called at start of every submission API route |

### B.5 Existing Utilities

| Utility | Used By Week 8 |
|---------|---------------|
| `lib/company.ts` → `getCompanyProfile()` | Email draft branding, package company info |
| `lib/candidate-utils.ts` → `getDisplayEmail()` | Sanitizing candidate email for tracker |
| `lib/format.ts` → `formatCurrency()` | Compensation display in email and tracker |
| `lib/format.ts` → `formatDate()` | Date formatting in tracker |
| `lib/ai-screening.ts` → `computeHeuristicScore()` | (Already used by Week 7; inherited via screening service) |

---

## Appendix C: Error Handling Strategy

All submission service functions follow the **never throw, always return** pattern used by Weeks 5-7:

```typescript
// Expectation: functions return null / structured error rather than throwing
const pkg = await buildSubmissionPackage(ctx, applicationId);
if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });

// Readiness gate: return specific error for caution level
if (pkg.readiness.level === "caution" && !force) {
  return NextResponse.json({
    error: "Candidate readiness is 'caution'. Please review risks before submitting.",
    readiness: pkg.readiness,
    risks: pkg.risks,
    canOverride: true,
  }, { status: 409 });
}
```

## Appendix D: Dependencies

Week 8 depends on these existing modules (all already implemented):

- `lib/screening/service.ts` (getScreeningWorkbench) — Week 7
- `lib/screening/types.ts` — Week 7
- `lib/screening/facts.ts` — Week 7
- `lib/screening/gaps.ts` — Week 7
- `lib/screening/risks.ts` — Week 7
- `lib/screening/readiness.ts` — Week 7
- `lib/screening/summary.ts` — Week 7
- `lib/memory/service.ts` (captureMemoryWithContext, getMemory) — Week 5
- `lib/memory/types.ts` — Week 5
- `lib/tenant/context.ts` — Week 4
- `lib/tenant/prisma.ts` — Week 4
- `lib/company.ts` — Pre-existing
- `lib/format.ts` — Pre-existing
- `lib/candidate-utils.ts` — Pre-existing
- `lib/guards.ts` — Pre-existing

No changes required to any of these existing modules.
