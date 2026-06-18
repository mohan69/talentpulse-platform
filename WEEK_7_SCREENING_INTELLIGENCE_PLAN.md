# WEEK 7 — SCREENING INTELLIGENCE PLAN

## Purpose

Week 7 builds a **screening intelligence layer** that unifies every candidate signal — resume data, AI match scores, voice screening results, recruiter notes, WhatsApp messages, email exchanges, pipeline decisions, and offer outcomes — into a single structured assessment per candidate-requisition pair. Today each signal lives in its own model. Week 7 aggregates them into a **screening workbench** that answers: *Is this candidate ready? What's missing? What should the recruiter do next?*

No new tables. No schema changes. No migrations. All screening intelligence is derived at query time from existing data using the Week 5 memory service and Week 6 conversation capture layer.

## Principles

1. **No schema changes** — All screening intelligence is computed at query time or stored in `ActivityLog.metadata` as structured screening facts. No new columns, tables, or indexes.
2. **Signal aggregation** — Every existing signal (AI score, voice insight, note observation, pipeline history, offer outcome) contributes to the screening picture.
3. **Gap-first design** — The workbench highlights what is *unknown* about a candidate before recommending any action.
4. **Action-oriented** — Every screening fact comes with a recommended recruiter action or question.
5. **Client-ready output** — The screening summary is designed to be shared with hiring managers without editing.
6. **Human confirmation** — All auto-derived facts can be confirmed, corrected, or dismissed using the Week 5 confidence workflow.

---

## 1. Screening Workbench Architecture

### 1.1 Virtual Screening Document

A "screening" is not a database row. It is a **query-time aggregation** over existing records for a given candidate + job combination. The workbench reads from:

```
Screening Workbench for (candidateId, jobId)
        │
        ├── Candidate.*          (name, skills, experience, CTC, notice, education, etc.)
        ├── Job.*                (title, skills, experience range, salary range, location)
        ├── Application          (matchScore, noShowRisk, aiReport, stage, clientFeedback)
        │     └── aiReport       (LLM assessments across 7 dimensions)
        ├── VoiceScreening[]     (transcripts, scores, summaries)
        ├── Note[]               (recruiter observations, extracted insights)
        ├── WhatsAppMessage[]    (candidate communications, extracted signals)
        ├── Interview[]          (outcomes, ratings, feedback)
        ├── Offer                (status, CTC, joining date)
        └── ActivityLog[]        (memory entries: insights, tasks, conversation history)
```

### 1.2 Screening Intelligence Service

**`lib/screening/service.ts`** — The central query-time aggregation:

```typescript
export async function getScreeningWorkbench(
  ctx: TenantContext,
  applicationId: string,
): Promise<ScreeningWorkbench> {
  // 1. Fetch core records
  const application = await (tenantPrisma.application as any).withContext(ctx).findUnique({
    where: { id: applicationId },
    include: {
      candidate: {
        include: {
          notes: { orderBy: { createdAt: "desc" }, take: 20 },
          voiceScreenings: { orderBy: { createdAt: "desc" }, take: 5 },
          whatsappMessages: { orderBy: { createdAt: "desc" }, take: 20 },
          interviews: {
            where: { applicationId },
            orderBy: { createdAt: "desc" },
          },
          offers: { where: { applicationId } },
        },
      },
      job: true,
    },
  });

  if (!application) return null;

  // 2. Fetch memory entries (insights, tasks, conversation history)
  const memoryEntries = await getMemoryTimeline(ctx, "application", applicationId, { limit: 100 });

  // 3. Fetch candidate-level memory
  const candidateMemory = await getMemoryByEntity(ctx, "candidate", application.candidate.id);

  // 4. Compute screening facts
  const facts = computeScreeningFacts(application, memoryEntries, candidateMemory);

  // 5. Compute missing information checklist
  const gaps = computeMissingInfo(application);

  // 6. Compute risk signals
  const risks = computeJoiningRisks(application, memoryEntries, candidateMemory);

  // 7. Compute fit/readiness score
  const readiness = computeReadinessScore(facts, risks, application);

  // 8. Generate next-best questions
  const questions = generateNextQuestions(facts, gaps, application);

  // 9. Build client-ready summary
  const summary = buildClientSummary(application, facts, readiness);

  return {
    application,
    facts,
    gaps,
    risks,
    readiness,
    questions,
    summary,
    memory: memoryEntries,
  };
}
```

### 1.3 Screening Workbench Type

**`lib/screening/types.ts`**:

```typescript
export interface ScreeningWorkbench {
  application: ApplicationWithIncludes;
  facts: ScreeningFacts;
  gaps: MissingInfo[];
  risks: RiskSignal[];
  readiness: ReadinessScore;
  questions: RecruiterQuestion[];
  summary: ClientScreeningSummary;
  memory: MemoryQueryResult;
}

export interface ScreeningFacts {
  skillFit: { score: number; matched: string[]; missing: string[] };
  experienceFit: { score: number; candidateYears: number; requiredMin: number; requiredMax: number };
  ctcFit: { status: "ok" | "stretch" | "mismatch" | "unknown"; candidateCtc: number | null; budgetMax: number | null };
  locationFit: { status: "match" | "mismatch" | "relocation_possible" | "unknown"; candidateCity: string | null; jobLocation: string };
  noticePeriod: { days: number | null; status: "immediate" | "short" | "long" | "unknown" };
  educationFit: { degree: string | null; institution: string | null; graduationYear: number | null; assessed: boolean };
  voiceScreeningSummary: { completed: boolean; score: number | null; keyFindings: string[] } | null;
  recruiterNotesSummary: string[];
  pipelineHistory: { stageChanges: number; currentStage: string; daysInStage: number; totalDaysInPipeline: number };
  interviewOutcomes: { total: number; proceeded: number; rejected: number; averageRating: number | null };
}
```

### 1.4 Query-Time vs. Pre-Computed

All screening facts are computed **at query time** from existing data. The only storage is:

- `ActivityLog` entries (created by existing Week 5/6 capture flow) for structured insights
- The existing `Application.aiReport` JSON for LLM assessment dimensions
- Existing `Candidate`, `Job`, `VoiceScreening`, `Note`, `WhatsAppMessage`, `Interview`, `Offer` records

No pre-computation, no background jobs, no new storage. This keeps the architecture simple and avoids stale data.

---

## 2. Candidate + Requirement Screening View

### 2.1 Unified View Endpoint

**`GET /api/screening/workbench?applicationId=<id>`** — Returns the complete screening workbench.

**`GET /api/screening/workbench?candidateId=<id>&jobId=<id>`** — Alternative lookup by candidate + job.

Response shape (abbreviated):

```json
{
  "facts": {
    "skillFit": { "score": 85, "matched": ["SAP", "Program Management", "Stakeholder Management"], "missing": ["S/4HANA"] },
    "experienceFit": { "score": 90, "candidateYears": 12, "requiredMin": 8, "requiredMax": 15 },
    "ctcFit": { "status": "ok", "candidateCtc": 4500000, "budgetMax": 5000000 },
    "locationFit": { "status": "relocation_possible", "candidateCity": "Bangalore", "jobLocation": "Pune" },
    "noticePeriod": { "days": 60, "status": "short" },
    "educationFit": { "degree": "B.Tech", "institution": "IIT Madras", "graduationYear": 2014, "assessed": true },
    "voiceScreeningSummary": {
      "completed": true,
      "score": 82,
      "keyFindings": ["Strong communication", "Available for immediate join", "Expects ₹48L"]
    },
    "recruiterNotesSummary": ["Prefers remote-first", "Strong SAP background"],
    "pipelineHistory": {
      "stageChanges": 4,
      "currentStage": "INTERVIEW_SCHEDULED",
      "daysInStage": 3,
      "totalDaysInPipeline": 14
    },
    "interviewOutcomes": {
      "total": 1,
      "proceeded": 1,
      "rejected": 0,
      "averageRating": 4.5
    }
  },
  "gaps": [
    { "category": "reference_check", "label": "Reference check not completed", "severity": "medium" },
    { "category": "salary_details", "label": "Fixed vs variable CTC split unknown", "severity": "low" }
  ],
  "risks": [
    { "type": "counter_offer", "label": "Counter-offer risk", "severity": "medium", "source": "recruiter_note", "likelihood": 35 }
  ],
  "readiness": {
    "overall": 78,
    "level": "ready_for_interview",
    "categories": {
      "skillFit": 85,
      "experienceFit": 90,
      "ctcFit": 100,
      "locationFit": 60,
      "noticeFit": 80,
      "voiceSignal": 75,
      "recruiterSignal": 70,
      "pipelineVelocity": 80
    }
  },
  "questions": [
    {
      "question": "Can you describe your experience with S/4HANA migrations?",
      "reason": "Missing from candidate skills, required for role",
      "priority": "high"
    }
  ],
  "summary": {
    "verdict": "Strong fit — proceed to next round",
    "strengths": ["12 years SAP experience", "Within CTC budget", "Strong voice screening score"],
    "concerns": ["No S/4HANA experience", "60-day notice period"],
    "recommendation": "Schedule technical round focused on S/4HANA exposure"
  }
}
```

### 2.2 Application Detail Enhancement

**`PATCH /api/applications/[id]`** — Add a `screeningNotes` field in the request body (stored as memory, not a DB field):

```typescript
// In addition to existing stage/clientFeedback handling:
if (body.screeningNotes) {
  captureMemory({
    userId: user.id,
    entityType: "application",
    entityId: params.id,
    action: "screening_note_added",
    metadata: {
      memoryType: "candidate",
      summary: `Screening note: ${body.screeningNotes.slice(0, 150)}`,
      details: body.screeningNotes,
      sourceModel: "application",
      sourceId: params.id,
      tags: ["screening", "recruiter-note"],
      confidence: "auto",
      importance: "medium",
    },
  });
}
```

---

## 3. Missing Information Checklist

### 3.1 Problem

Recruiters manually track what they don't know about a candidate: CTC split, notice period buyout, reference contacts, education details, location flexibility. This information is scattered or absent.

### 3.2 Solution

**`lib/screening/gaps.ts`** — Computes a checklist of missing information by comparing available fields against a completeness model:

```typescript
export function computeMissingInfo(app: ApplicationWithIncludes): MissingInfo[] {
  const gaps: MissingInfo[] = [];
  const { candidate, job } = app;

  // CTC details
  if (candidate.currentCtc == null) {
    gaps.push({ category: "current_ctc", label: "Current CTC not provided", severity: "high", field: "currentCtc" });
  }
  if (candidate.expectedCtc == null && candidate.currentCtc == null) {
    gaps.push({ category: "expected_ctc", label: "Expected CTC not provided", severity: "high", field: "expectedCtc" });
  }
  if (candidate.currentCtc != null && candidate.ctcFixed == null && candidate.ctcVariable == null) {
    gaps.push({ category: "ctc_split", label: "Fixed vs variable CTC split unknown", severity: "low", field: "ctcFixed" });
  }

  // Notice period
  if (candidate.noticePeriod == null) {
    gaps.push({ category: "notice_period", label: "Notice period not specified", severity: "high", field: "noticePeriod" });
  }
  if (candidate.noticePeriod != null && candidate.lastWorkingDay == null && candidate.canBuyOut == null) {
    gaps.push({ category: "notice_buyout", label: "Notice period buyout possibility unknown", severity: "medium", field: "canBuyOut" });
  }

  // Education
  if (!candidate.degree) {
    gaps.push({ category: "education", label: "Highest degree not specified", severity: "medium", field: "degree" });
  }
  if (!candidate.institution) {
    gaps.push({ category: "education", label: "Institution not specified", severity: "low", field: "institution" });
  }

  // Location
  if (!candidate.currentCity && !job.location) {
    gaps.push({ category: "location", label: "Current location not specified", severity: "medium", field: "currentCity" });
  }
  if (candidate.currentCity && job.location && candidate.currentCity !== job.location && !candidate.willRelocate) {
    gaps.push({ category: "relocation", label: "Relocation willingness not confirmed", severity: "high", field: "willRelocate" });
  }

  // Experience
  if (candidate.totalExperience === 0 && candidate.relevantExperience === 0) {
    gaps.push({ category: "experience", label: "Total experience not specified", severity: "high", field: "totalExperience" });
  }

  // Skills
  if (!candidate.skills || candidate.skills.length === 0) {
    gaps.push({ category: "skills", label: "Skills not listed", severity: "high", field: "skills" });
  }

  // Reference check (derived — no reference model exists)
  // Check if any note or memory entry references reference checks
  // This is a derived gap based on pipeline stage
  if (app.stage === "OFFER_EXTENDED" || app.stage === "OFFER_ACCEPTED") {
    // At offer stage, references should ideally be done
    gaps.push({
      category: "reference_check",
      label: "Reference check status unknown — recommended before offer finalization",
      severity: "medium",
      field: null,
    });
  }

  // Resume
  if (!candidate.resumeUrl && !candidate.resumeKey) {
    gaps.push({ category: "resume", label: "Resume not uploaded", severity: "medium", field: "resumeUrl" });
  }

  // LinkedIn
  if (!candidate.linkedinUrl) {
    gaps.push({ category: "linkedin", label: "LinkedIn profile not linked", severity: "low", field: "linkedinUrl" });
  }

  return gaps;
}
```

### 3.3 Gap Severity Levels

| Severity | Meaning | Example |
|----------|---------|---------|
| `high` | Blocks screening progression | No CTC, no notice period, no skills |
| `medium` | Needed before offer | No relocation confirmation, no resume |
| `low` | Nice to have | No LinkedIn, no institution name |
| `info` | Informational | No buyout confirmed, no employment gap notes |

### 3.4 Gap Resolution Tracking

Gaps are resolved implicitly when the candidate record is updated (PATCH) with the missing field. The `ScreeningWorkbench` API recalculates gaps on every call, so resolved gaps automatically disappear. No explicit gap-tracking table needed.

---

## 4. Structured Screening Facts

### 4.1 Fact Computation Service

**`lib/screening/facts.ts`** — Computes structured facts from candidate + job + application data:

```typescript
export function computeScreeningFacts(
  app: ApplicationWithIncludes,
  memoryEntries: MemoryQueryResult,
  candidateMemory: MemoryQueryResult,
): ScreeningFacts {
  const candidate = app.candidate;
  const job = app.job;
  const aiReport = app.aiReport as AiReport | null;

  return {
    skillFit: computeSkillFit(candidate.skills, job.skills, aiReport),
    experienceFit: computeExperienceFit(candidate.totalExperience, job.experienceMin, job.experienceMax, aiReport),
    ctcFit: computeCtcFit(candidate.currentCtc, candidate.expectedCtc, job.salaryMin, job.salaryMax, aiReport),
    locationFit: computeLocationFit(candidate.currentCity, candidate.preferredLocations, candidate.willRelocate, job.location),
    noticePeriod: computeNoticePeriod(candidate.noticePeriod, candidate.lastWorkingDay, candidate.canBuyOut, aiReport),
    educationFit: computeEducationFit(candidate.degree, candidate.institution, candidate.graduationYear),
    voiceScreeningSummary: computeVoiceSummary(candidate.voiceScreenings),
    recruiterNotesSummary: extractNoteSummaries(candidate.notes),
    pipelineHistory: computePipelineHistory(app),
    interviewOutcomes: computeInterviewOutcomes(candidate.interviews),
  };
}
```

### 4.2 Individual Fact Functions

**`computeSkillFit(candidateSkills, jobSkills, aiReport?)`**:

```typescript
function computeSkillFit(
  candidateSkills: string[],
  jobSkills: string[],
  aiReport?: AiReport | null,
): { score: number; matched: string[]; missing: string[] } {
  const norm = (s: string) => s.toLowerCase().trim();
  const cSkills = candidateSkills.map(norm);
  const jSkills = jobSkills.map(norm);

  const matched = jSkills.filter((js) => cSkills.some((cs) => cs.includes(js) || js.includes(cs)));
  const missing = jSkills.filter((js) => !matched.includes(js));
  const score = jSkills.length > 0 ? Math.round((matched.length / jSkills.length) * 100) : 50;

  // Boost/correct using AI report if available
  if (aiReport?.assessments?.jdFitment?.score != null) {
    const aiScore = aiReport.assessments.jdFitment.score;
    return {
      score: Math.round((score * 0.4 + aiScore * 0.6)),
      matched: [...new Set([...matched, ...(aiReport.assessments.jdFitment.matchedSkills ?? [])])],
      missing: [...new Set([...missing, ...(aiReport.assessments.jdFitment.missingSkills ?? [])])],
    };
  }

  return { score, matched, missing };
}
```

**`computeExperienceFit(candidateYears, reqMin, reqMax, aiReport?)`**:

```typescript
function computeExperienceFit(
  candidateYears: number,
  reqMin: number,
  reqMax: number,
  aiReport?: AiReport | null,
): { score: number; candidateYears: number; requiredMin: number; requiredMax: number } {
  const effectiveMax = reqMax || reqMin + 5;
  let score: number;

  if (candidateYears < reqMin) {
    score = Math.max(0, Math.round((candidateYears / reqMin) * 60));
  } else if (candidateYears <= effectiveMax) {
    score = 100;
  } else {
    // Over-experienced: still good but diminishing
    score = Math.max(70, Math.round(100 - ((candidateYears - effectiveMax) / effectiveMax) * 30));
  }

  // Blend with AI assessment if available
  if (aiReport?.assessments?.basicProfile?.score != null) {
    score = Math.round(score * 0.5 + aiReport.assessments.basicProfile.score * 0.5);
  }

  return { score, candidateYears, requiredMin: reqMin, requiredMax: reqMax || reqMin + 5 };
}
```

**`computeCtcFit(candidateCtc, expectedCtc, salaryMin, salaryMax, aiReport?)`**:

```typescript
function computeCtcFit(
  currentCtc: number | null,
  expectedCtc: number | null,
  salaryMin: number | null,
  salaryMax: number | null,
  aiReport?: AiReport | null,
): { status: "ok" | "stretch" | "mismatch" | "unknown"; candidateCtc: number | null; budgetMax: number | null } {
  const budget = salaryMax ?? salaryMin ?? null;
  const ctc = expectedCtc ?? currentCtc ?? null;

  if (!ctc || !budget) {
    // Fallback to AI report if available
    if (aiReport?.assessments?.ctcAnalysis?.status) {
      const statusMap: Record<string, "ok" | "stretch" | "mismatch" | "unknown"> = {
        ok: "ok", stretch: "stretch", mismatch: "mismatch", unknown: "unknown",
      };
      return { status: statusMap[aiReport.assessments.ctcAnalysis.status] ?? "unknown", candidateCtc: ctc, budgetMax: budget };
    }
    return { status: "unknown", candidateCtc: ctc, budgetMax: budget };
  }

  if (ctc <= budget) return { status: "ok", candidateCtc: ctc, budgetMax: budget };
  if (ctc <= budget * 1.15) return { status: "stretch", candidateCtc: ctc, budgetMax: budget };
  return { status: "mismatch", candidateCtc: ctc, budgetMax: budget };
}
```

**`computeLocationFit(city, preferredLocations, willRelocate, jobLocation)`**:

```typescript
function computeLocationFit(
  city: string | null,
  preferredLocations: string[],
  willRelocate: boolean,
  jobLocation: string,
): { status: "match" | "mismatch" | "relocation_possible" | "unknown"; candidateCity: string | null; jobLocation: string } {
  if (!city) return { status: "unknown", candidateCity: null, jobLocation };

  const norm = (s: string) => s.toLowerCase().trim();
  const cCity = norm(city);
  const jLoc = norm(jobLocation);

  if (cCity === jLoc || preferredLocations.some((p) => norm(p) === jLoc)) {
    return { status: "match", candidateCity: city, jobLocation };
  }
  if (willRelocate) {
    return { status: "relocation_possible", candidateCity: city, jobLocation };
  }
  return { status: "mismatch", candidateCity: city, jobLocation };
}
```

**`computeNoticePeriod(noticeDays, lastWorkingDay, canBuyOut, aiReport?)`**:

```typescript
function computeNoticePeriod(
  noticeDays: number | null,
  lastWorkingDay: Date | null,
  canBuyOut: boolean | null,
  aiReport?: AiReport | null,
): { days: number | null; status: "immediate" | "short" | "long" | "unknown" } {
  if (noticeDays == null) {
    // Fallback to AI report
    if (aiReport?.assessments?.noticePeriod?.status) {
      const statusMap: Record<string, "immediate" | "short" | "long" | "unknown"> = {
        immediate: "immediate", short: "short", long: "long", unknown: "unknown",
      };
      return { days: null, status: statusMap[aiReport.assessments.noticePeriod.status] ?? "unknown" };
    }
    return { days: null, status: "unknown" };
  }

  if (noticeDays === 0 || canBuyOut) return { days: noticeDays, status: "immediate" };
  if (noticeDays <= 30) return { days: noticeDays, status: "short" };
  if (noticeDays <= 60) return { days: noticeDays, status: "short" };
  return { days: noticeDays, status: "long" };
}
```

**`computeVoiceSummary(screenings)`**:

```typescript
function computeVoiceSummary(
  screenings: VoiceScreening[],
): { completed: boolean; score: number | null; keyFindings: string[] } | null {
  const latest = screenings
    .filter((s) => s.callStatus === "COMPLETED")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  if (!latest) return null;

  const keyFindings: string[] = [];
  if (latest.aiSummary) keyFindings.push(latest.aiSummary.slice(0, 200));
  if (latest.aiScore != null) {
    if (latest.aiScore >= 80) keyFindings.push("Strong voice screening score");
    else if (latest.aiScore >= 50) keyFindings.push("Moderate voice screening score");
    else keyFindings.push("Low voice screening score — review transcript");
  }
  // Extract key findings from voice screening memory insights
  if (latest.aiScoreBreakdown) {
    const breakdown = latest.aiScoreBreakdown as Record<string, number>;
    const topCriteria = Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    for (const [criterion] of topCriteria) {
      keyFindings.push(`Strong in ${criterion}`);
    }
  }

  return { completed: true, score: latest.aiScore ?? null, keyFindings };
}
```

**`computePipelineHistory(application)`**:

```typescript
function computePipelineHistory(
  app: ApplicationWithIncludes,
): { stageChanges: number; currentStage: string; daysInStage: number; totalDaysInPipeline: number } {
  const now = Date.now();
  const created = app.createdAt.getTime();
  const totalDays = Math.round((now - created) / (1000 * 60 * 60 * 24));
  const lastChange = app.updatedAt.getTime();
  const daysInStage = Math.round((now - lastChange) / (1000 * 60 * 60 * 24));

  return {
    stageChanges: app.stageChanges ?? 0,
    currentStage: app.stage,
    daysInStage,
    totalDaysInPipeline: totalDays,
  };
}
```

**`computeInterviewOutcomes(interviews)`**:

```typescript
function computeInterviewOutcomes(
  interviews: Interview[],
): { total: number; proceeded: number; rejected: number; averageRating: number | null } {
  const completed = interviews.filter((i) => i.status === "COMPLETED");
  const proceeded = completed.filter((i) => i.outcome === "PROCEED").length;
  const rejected = completed.filter((i) => i.outcome === "REJECT").length;
  const ratings = completed.filter((i) => i.rating != null).map((i) => i.rating!);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return { total: completed.length, proceeded, rejected, averageRating: avgRating };
}
```

---

## 5. Joining Risk Signals

### 5.1 Risk Signal Types

**`lib/screening/risks.ts`** — Derives risk signals from all available data:

```typescript
export function computeJoiningRisks(
  app: ApplicationWithIncludes,
  memoryEntries: MemoryQueryResult,
  candidateMemory: MemoryQueryResult,
): RiskSignal[] {
  const risks: RiskSignal[] = [];
  const candidate = app.candidate;

  // 1. Counter-offer risk: derived from notes mentioning counter-offer, or high-value profile
  const counterOfferMentions = [...memoryEntries.entries, ...candidateMemory.entries].filter(
    (e) =>
      e.metadata?.extractedInsights?.some(
        (i: any) => i.type === "risk_signal" && /counter.?offer/i.test(i.value ?? ""),
      ) ||
      (e.metadata?.details ?? "").toLowerCase().includes("counter offer"),
  );
  if (counterOfferMentions.length > 0) {
    risks.push({
      type: "counter_offer",
      label: "Counter-offer risk mentioned in recruiter notes",
      severity: "medium",
      source: "recruiter_note",
      likelihood: 40,
      evidence: counterOfferMentions.map((m) => ({ id: m.id, summary: m.metadata?.summary ?? "" })),
    });
  }

  // 2. Notice period risk
  if (candidate.noticePeriod != null && candidate.noticePeriod > 60 && !candidate.canBuyOut) {
    risks.push({
      type: "long_notice",
      label: `Long notice period (${candidate.noticePeriod} days) — delayed joining`,
      severity: candidate.noticePeriod > 90 ? "high" : "medium",
      source: "candidate_profile",
      likelihood: candidate.noticePeriod > 90 ? 80 : 60,
      evidence: [],
    });
  }

  // 3. CTC mismatch risk
  if (app.aiReport?.assessments?.ctcAnalysis?.status === "mismatch") {
    risks.push({
      type: "ctc_mismatch",
      label: "CTC expectation exceeds budget",
      severity: "high",
      source: "ai_screening",
      likelihood: 70,
      evidence: [{ id: app.id, summary: `CTC analysis: ${app.aiReport.assessments.ctcAnalysis.notes}` }],
    });
  }

  // 4. No-show risk (from heuristic score)
  if (app.noShowRisk != null && app.noShowRisk > 60) {
    risks.push({
      type: "no_show",
      label: `High no-show risk (${Math.round(app.noShowRisk)}/100)`,
      severity: app.noShowRisk > 80 ? "high" : "medium",
      source: "ai_screening",
      likelihood: Math.round(app.noShowRisk),
      evidence: [],
    });
  }

  // 5. Location mismatch risk
  if (candidate.currentCity && candidate.currentCity !== app.job.location && !candidate.willRelocate) {
    risks.push({
      type: "location_mismatch",
      label: `Located in ${candidate.currentCity}, job in ${app.job.location} — no relocation willingness`,
      severity: "high",
      source: "candidate_profile",
      likelihood: 60,
      evidence: [],
    });
  }

  // 6. Multiple active applications (candidate shopping around)
  // Already implicit but can be surfaced if the candidate has multiple active applications
  // This would need a separate query — noted for future.

  // 7. Voice screening red flags
  const latestVoice = candidate.voiceScreenings
    ?.filter((s: any) => s.callStatus === "COMPLETED")
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (latestVoice?.aiScore != null && latestVoice.aiScore < 50) {
    risks.push({
      type: "voice_screening_concern",
      label: `Low voice screening score (${latestVoice.aiScore}/100)`,
      severity: "medium",
      source: "voice_screening",
      likelihood: Math.round((100 - latestVoice.aiScore) * 0.8),
      evidence: [{ id: latestVoice.id, summary: latestVoice.aiSummary ?? "" }],
    });
  }

  // 8. Rejection in previous interview rounds
  const interviews = candidate.interviews ?? [];
  const rejectedCount = interviews.filter((i: any) => i.outcome === "REJECT").length;
  if (rejectedCount > 0) {
    risks.push({
      type: "prior_rejection",
      label: `Rejected in ${rejectedCount} previous interview round(s)`,
      severity: "medium",
      source: "interview",
      likelihood: Math.min(rejectedCount * 20, 80),
      evidence: interviews
        .filter((i: any) => i.outcome === "REJECT")
        .map((i: any) => ({ id: i.id, summary: `${i.round}: ${i.feedback ?? "No feedback"}` })),
    });
  }

  // 9. Employment gap risk
  if (candidate.employmentGapNotes) {
    risks.push({
      type: "employment_gap",
      label: `Employment gap noted: ${candidate.employmentGapNotes.slice(0, 100)}`,
      severity: "low",
      source: "candidate_profile",
      likelihood: 30,
      evidence: [],
    });
  }

  // 10. Low match score risk
  if (app.matchScore != null && app.matchScore < 50) {
    risks.push({
      type: "low_match",
      label: `Low AI match score (${Math.round(app.matchScore)}/100)`,
      severity: "high",
      source: "ai_screening",
      likelihood: Math.round((100 - app.matchScore) * 0.7),
      evidence: [{ id: app.id, summary: `Overall match score: ${Math.round(app.matchScore)}` }],
    });
  }

  return risks;
}
```

### 5.2 Risk Signal Type

```typescript
export interface RiskSignal {
  type: RiskType;
  label: string;
  severity: "low" | "medium" | "high";
  source: "candidate_profile" | "ai_screening" | "voice_screening" | "recruiter_note" | "interview" | "whatsapp" | "email";
  likelihood: number; // 0-100 estimated probability
  evidence: { id: string; summary: string }[];
}

export type RiskType =
  | "counter_offer"
  | "long_notice"
  | "ctc_mismatch"
  | "no_show"
  | "location_mismatch"
  | "voice_screening_concern"
  | "prior_rejection"
  | "employment_gap"
  | "low_match"
  | "multiple_offers"
  | "cultural_fit_concern"
  | "reference_concern";
```

---

## 6. Fit / Readiness Score

### 6.1 Composite Score

**`lib/screening/readiness.ts`** — Computes an overall readiness score from sub-scores:

```typescript
export function computeReadinessScore(
  facts: ScreeningFacts,
  risks: RiskSignal[],
  app: ApplicationWithIncludes,
): ReadinessScore {
  // Base scores from facts
  const categories: Record<string, number> = {
    skillFit: facts.skillFit.score,
    experienceFit: facts.experienceFit.score,
    ctcFit: ctcFitToScore(facts.ctcFit.status),
    locationFit: locationFitToScore(facts.locationFit.status),
    noticeFit: noticeToScore(facts.noticePeriod.status),
    voiceSignal: facts.voiceScreeningSummary?.score ?? 50,
    recruiterSignal: noteSentimentToScore(facts.recruiterNotesSummary),
    pipelineVelocity: velocityToScore(facts.pipelineHistory),
  };

  // Risk penalty
  const highRisks = risks.filter((r) => r.severity === "high").length;
  const medRisks = risks.filter((r) => r.severity === "medium").length;
  const riskPenalty = Math.min(highRisks * 15 + medRisks * 5, 50);

  // Weighted average
  const weights: Record<string, number> = {
    skillFit: 0.25,
    experienceFit: 0.15,
    ctcFit: 0.15,
    locationFit: 0.10,
    noticeFit: 0.10,
    voiceSignal: 0.10,
    recruiterSignal: 0.10,
    pipelineVelocity: 0.05,
  };

  let weighted = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (categories[key] != null) {
      weighted += categories[key] * weight;
      totalWeight += weight;
    }
  }
  const baseScore = totalWeight > 0 ? Math.round(weighted / totalWeight) : 50;

  const overall = Math.max(0, Math.min(100, baseScore - riskPenalty));

  // Readiness level
  let level: ReadinessLevel;
  if (overall >= 80 && highRisks === 0) level = "ready_for_interview";
  else if (overall >= 60 && highRisks <= 1) level = "likely_fit";
  else if (overall >= 40) level = "needs_review";
  else level = "caution";

  return {
    overall,
    level,
    categories,
    riskPenalty,
    highRiskCount: highRisks,
    mediumRiskCount: medRisks,
  };
}

function ctcFitToScore(status: string): number {
  const map: Record<string, number> = { ok: 100, stretch: 60, mismatch: 20, unknown: 50 };
  return map[status] ?? 50;
}

function locationFitToScore(status: string): number {
  const map: Record<string, number> = { match: 100, relocation_possible: 70, mismatch: 20, unknown: 50 };
  return map[status] ?? 50;
}

function noticeToScore(status: string): number {
  const map: Record<string, number> = { immediate: 100, short: 80, long: 40, unknown: 50 };
  return map[status] ?? 50;
}

function noteSentimentToScore(notes: string[]): number {
  if (notes.length === 0) return 50;
  const positive = notes.filter((n) => /strong|excellent|good fit|impressive|proceed/i.test(n)).length;
  const negative = notes.filter((n) => /concern|risk|weak|poor|not suitable/i.test(n)).length;
  if (positive + negative === 0) return 50;
  return Math.round((positive / (positive + negative)) * 100);
}

function velocityToScore(history: { daysInStage: number; totalDaysInPipeline: number }): number {
  // Faster pipeline = better signal (candidate is engaged)
  if (history.totalDaysInPipeline <= 7) return 90;
  if (history.totalDaysInPipeline <= 14) return 80;
  if (history.totalDaysInPipeline <= 30) return 60;
  if (history.totalDaysInPipeline <= 60) return 40;
  return 20;
}
```

### 6.2 Readiness Level Meanings

| Level | Score Range | Meaning |
|-------|------------|---------|
| `ready_for_interview` | 80–100 | All signals positive; proceed to next stage |
| `likely_fit` | 60–79 | Mostly positive; address medium risks before proceeding |
| `needs_review` | 40–59 | Mixed signals; recruiter should review all facts before deciding |
| `caution` | 0–39 | Significant risks or gaps; discuss with team before proceeding |

---

## 7. Next-Best Recruiter Questions

### 7.1 Question Generator

**`lib/screening/questions.ts`** — Generates recommended recruiter questions based on gaps, risks, and facts:

```typescript
export function generateNextQuestions(
  facts: ScreeningFacts,
  gaps: MissingInfo[],
  app: ApplicationWithIncludes,
): RecruiterQuestion[] {
  const questions: RecruiterQuestion[] = [];

  // 1. Questions from missing skills (high priority)
  for (const skill of facts.skillFit.missing.slice(0, 3)) {
    questions.push({
      question: `Can you describe your experience with ${skill}?`,
      reason: `Missing from candidate skills, required for ${app.job.title}`,
      priority: "high",
      category: "skill_clarification",
    });
  }

  // 2. Questions from gaps (medium to high priority)
  for (const gap of gaps.filter((g) => g.severity !== "low").slice(0, 3)) {
    if (gap.category === "relocation") {
      questions.push({
        question: `The role is based in ${app.job.location}. Are you open to relocating?`,
        reason: "Location mismatch — relocation willingness not confirmed",
        priority: "high",
        category: "logistics",
      });
    }
    if (gap.category === "ctc_split") {
      questions.push({
        question: "Could you share the split between fixed and variable components of your current CTC?",
        reason: "CTC split unknown — needed for offer planning",
        priority: "medium",
        category: "compensation",
      });
    }
    if (gap.category === "notice_buyout") {
      questions.push({
        question: "Is there any possibility of buyout or early release from your current notice period?",
        reason: `Notice period is ${facts.noticePeriod.days} days — buyout possibility unknown`,
        priority: "medium",
        category: "logistics",
      });
    }
  }

  // 3. Questions from risk signals
  const counterOfferRisk = app.candidate.voiceScreenings?.length > 0
    || app.candidate.notes?.some((n) => /counter.?offer/i.test(n.body));
  if (counterOfferRisk) {
    questions.push({
      question: "Are you currently in conversation with any other companies?",
      reason: "Understand counter-offer risk and commitment level",
      priority: "medium",
      category: "engagement",
    });
  }

  // 4. Questions from interview history
  const rejectedInterviews = (app.candidate.interviews ?? [])
    .filter((i: any) => i.outcome === "REJECT");
  if (rejectedInterviews.length > 0) {
    for (const ri of rejectedInterviews.slice(0, 1)) {
      questions.push({
        question: `Your previous ${ri.round} had a feedback about ${ri.feedback ? `"${ri.feedback.slice(0, 80)}"` : "areas for improvement"}. How have you addressed this since?`,
        reason: "Previous interview rejection — understand growth",
        priority: "high",
        category: "growth",
      });
    }
  }

  // 5. Questions from voice screening gaps
  if (!facts.voiceScreeningSummary) {
    questions.push({
      question: "Schedule a voice screening call to assess communication and motivation",
      reason: "Voice screening not yet completed for this candidate",
      priority: "medium",
      category: "screening",
    });
  }

  return questions;
}
```

### 7.2 Question Type

```typescript
export interface RecruiterQuestion {
  question: string;
  reason: string;
  priority: "high" | "medium" | "low";
  category: QuestionCategory;
}

export type QuestionCategory =
  | "skill_clarification"
  | "compensation"
  | "logistics"
  | "engagement"
  | "growth"
  | "screening"
  | "cultural_fit"
  | "general";
```

---

## 8. Client-Ready Screening Summary

### 8.1 Summary Builder

**`lib/screening/summary.ts`** — Generates a client-ready prose summary:

```typescript
export function buildClientSummary(
  app: ApplicationWithIncludes,
  facts: ScreeningFacts,
  readiness: ReadinessScore,
): ClientScreeningSummary {
  const verdict = readiness.level === "ready_for_interview" ? "Strong fit — proceed to next round"
    : readiness.level === "likely_fit" ? "Moderate fit — review concerns before proceeding"
    : readiness.level === "needs_review" ? "Mixed signals — recruiter review recommended"
    : "Significant concerns — discuss before proceeding";

  const strengths: string[] = [];
  const concerns: string[] = [];

  if (facts.skillFit.score >= 80) strengths.push(`Strong skill match (${facts.skillFit.score}%)`);
  else if (facts.skillFit.score < 50) concerns.push(`Skill match is low (${facts.skillFit.score}%) — missing: ${facts.skillFit.missing.slice(0, 3).join(", ")}`);

  if (facts.experienceFit.score >= 80) strengths.push(`${facts.experienceFit.candidateYears} years experience — within required range`);
  else if (facts.experienceFit.score < 50) concerns.push(`Experience (${facts.experienceFit.candidateYears}yrs) is below requirement (${facts.experienceFit.requiredMin}yrs)`);

  if (facts.ctcFit.status === "ok") strengths.push("Within CTC budget");
  else if (facts.ctcFit.status === "stretch") concerns.push("CTC is a stretch — negotiate");
  else if (facts.ctcFit.status === "mismatch") concerns.push("CTC expectation exceeds budget");

  if (facts.locationFit.status === "match") strengths.push("Location match");
  else if (facts.locationFit.status === "relocation_possible") concerns.push("Candidate needs to relocate");
  else if (facts.locationFit.status === "mismatch") concerns.push("Location mismatch — candidate cannot relocate");

  if (facts.noticePeriod.status === "immediate") strengths.push("Available immediately");
  else if (facts.noticePeriod.status === "short") strengths.push(`Notice period: ${facts.noticePeriod.days} days`);
  else if (facts.noticePeriod.status === "long") concerns.push(`Long notice period: ${facts.noticePeriod.days} days`);

  if (facts.voiceScreeningSummary?.score != null && facts.voiceScreeningSummary.score >= 80) {
    strengths.push("Strong voice screening score");
  }

  if (facts.interviewOutcomes.total > 0 && facts.interviewOutcomes.proceeded > 0) {
    strengths.push(`Proceeded in ${facts.interviewOutcomes.proceeded}/${facts.interviewOutcomes.total} interviews`);
  }

  if (readiness.highRiskCount > 0) concerns.push(`${readiness.highRiskCount} high-severity risk(s) identified`);
  if (readiness.mediumRiskCount > 0) concerns.push(`${readiness.mediumRiskCount} medium-severity risk(s) identified`);

  // Recommendation
  const recommendation = readiness.level === "ready_for_interview"
    ? `Schedule next interview round — focus on ${facts.skillFit.missing.slice(0, 2).join(" and ") || "cultural fit"}`
    : readiness.level === "likely_fit"
    ? `Address ${facts.skillFit.missing.slice(0, 1).join(", ") || "concerns"} before scheduling next round`
    : readiness.level === "needs_review"
    ? "Review skills, risks, and gaps before deciding on next steps"
    : "Discuss with hiring team — significant risks identified";

  return {
    verdict,
    strengths: strengths.slice(0, 5),
    concerns: concerns.slice(0, 5),
    recommendation,
  };
}
```

### 8.2 Summary Endpoint

**`GET /api/screening/workbench?applicationId=<id>&summaryOnly=true`** — Returns only the client-ready summary (lighter response for client-facing views).

```json
{
  "summary": {
    "verdict": "Strong fit — proceed to next round",
    "strengths": ["Strong skill match (85%)", "12 years experience", "Within CTC budget", "Location match"],
    "concerns": ["Missing S/4HANA experience"],
    "recommendation": "Schedule next interview round — focus on S/4HANA experience"
  }
}
```

---

## 9. Human Confirmation Workflow

### 9.1 Reuse Week 5/6 Confidence Workflow

Every auto-computed screening fact, risk signal, and question is stored as a `MemoryInput` with `confidence: "auto"` when explicitly captured. The existing Week 5 routes handle confirmation:

| Existing Route | Applied To | Effect |
|---------------|-----------|--------|
| `POST /api/memory/[id]/confirm` | Screening facts, risks, questions | `confidence → "confirmed"` — fact is accepted |
| `POST /api/memory/[id]/correct` | Screening facts, risks | Original `"corrected"`, new entry with corrected value |
| `POST /api/memory/[id]/dismiss` | Risks, questions | `"dismissed"` — excluded from default views |
| `POST /api/memory/[id]/note` | Any entry | Human annotation appended |

### 9.2 Screening-Specific Confirmations

Beyond individual fact confirmation, the screening workbench supports:

**`POST /api/screening/workbench/confirm`** — Confirm the entire screening verdict:

```typescript
// Body: { applicationId, verdict, notes? }
// Effect: Creates a confirmed summary memory entry
captureMemory({
  userId: user.id,
  entityType: "application",
  entityId: applicationId,
  action: "screening_confirmed",
  metadata: {
    memoryType: "decision",
    summary: `Screening confirmed: ${verdict}`,
    details: notes ?? null,
    sourceModel: "application",
    sourceId: applicationId,
    tags: ["screening", "confirmed"],
    confidence: "confirmed",
    importance: "high",
  },
});
```

**`POST /api/screening/workbench/dismiss-risk`** — Dismiss a specific risk signal:

```typescript
// Body: { applicationId, riskType, reason }
// Effect: Stores the dismissal so computeJoiningRisks() can exclude it
captureMemory({
  userId: user.id,
  entityType: "application",
  entityId: applicationId,
  action: "risk_dismissed",
  metadata: {
    memoryType: "decision",
    summary: `Risk dismissed: ${riskType}`,
    details: reason ?? null,
    sourceModel: "application",
    sourceId: applicationId,
    tags: ["screening", "risk-dismissed", riskType],
    confidence: "dismissed",
    importance: "medium",
  },
});
```

The `computeJoiningRisks()` function checks for matching `"risk_dismissed"` entries and excludes dismissed risks:

```typescript
// In computeJoiningRisks(), check for dismissed risks:
const dismissedRisks = [...memoryEntries.entries, ...candidateMemory.entries]
  .filter((e) => e.action === "risk_dismissed")
  .map((e) => e.metadata?.tags?.find((t: string) => ["counter_offer", "long_notice", "ctc_mismatch", "no_show", "location_mismatch"].includes(t)));

// Skip risks whose type appears in dismissedRisks
```

### 9.3 Recruiter Feedback Loop

When a recruiter updates a screening fact (e.g., corrects a skill fit score or adds missing information), the correction is stored as a memory entry. The next `GET /api/screening/workbench` call reads these corrections and adjusts the computed facts accordingly.

---

## 10. Tenant-Safe APIs

### 10.1 New API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `GET /api/screening/workbench` | GET | Authenticated | Returns full screening workbench for an application |
| `POST /api/screening/workbench/confirm` | POST | ADMIN/RECRUITER | Confirms screening verdict as memory |
| `POST /api/screening/workbench/dismiss-risk` | POST | ADMIN/RECRUITER | Dismisses a specific risk signal |
| `GET /api/screening/candidates` | GET | Authenticated | Lists candidates with screening summaries (for pipeline view) |

### 10.2 Tenant Mechanisms

| Component | Mechanism | Status |
|-----------|-----------|--------|
| All screening queries | `tenantPrisma.application/candidate/job.withContext(ctx)` | ✅ Week 3/4 |
| All memory writes | `captureMemory()` / `captureMemoryWithContext()` | ✅ Week 5 |
| Auth guard | `requireUser()` → session → org/workspace | ✅ Pre-Week 1 |
| Portal sub-scoping | `portalContext` restricts client/candidate to their own records | ✅ Week 4 |
| Enforcement | `P2025` on cross-tenant writes in enforce mode | ✅ Week 4 |
| Background access | `resolveRecordTenantContext()` for async operations | ✅ Week 4 |

### 10.3 No New Tenant Concerns

- All screening data is a query-time aggregation of existing tenant-scoped records.
- The `applicationId` parameter in `GET /api/screening/workbench` is automatically scoped by `tenantPrisma.application.withContext(ctx).findUnique()`.
- Risk signal dismissal memory entries are tenant-scoped via `captureMemory()`.
- Cross-tenant screening access returns `null` (application not found) for the wrong tenant.

---

## 11. Tests

### 11.1 Unit Tests — Screening Facts

| Test ID | Description | Expected |
|---------|-------------|----------|
| T7-001 | `computeSkillFit` with full overlap | score = 100, matched = job skills, missing = [] |
| T7-002 | `computeSkillFit` with partial overlap | score between 1-99 |
| T7-003 | `computeSkillFit` with no overlap | score = 0, missing = job skills |
| T7-004 | `computeSkillFit` with empty candidate skills | score = 0, all job skills missing |
| T7-005 | `computeSkillFit` with AI report boost | Blended score reflects AI assessment |
| T7-006 | `computeExperienceFit` within range | score = 100 |
| T7-007 | `computeExperienceFit` below minimum | score < 60, proportional to gap |
| T7-008 | `computeExperienceFit` over max | score >= 70 |
| T7-009 | `computeCtcFit` within budget | status = "ok" |
| T7-010 | `computeCtcFit` over budget | status = "stretch" or "mismatch" |
| T7-011 | `computeCtcFit` with no CTC data | status = "unknown" |
| T7-012 | `computeCtcFit` with AI report fallback | Uses AI dimension when candidate data missing |
| T7-013 | `computeLocationFit` matching city | status = "match" |
| T7-014 | `computeLocationFit` with relocation | status = "relocation_possible" |
| T7-015 | `computeLocationFit` cannot relocate | status = "mismatch" |
| T7-016 | `computeNoticePeriod` immediate | status = "immediate" |
| T7-017 | `computeNoticePeriod` <= 30 days | status = "short" |
| T7-018 | `computeNoticePeriod` > 60 days | status = "long" |
| T7-019 | `computeNoticePeriod` unknown fallback to AI report | Uses AI assessment |
| T7-020 | `computeVoiceSummary` with completed screening | Returns score and key findings |
| T7-021 | `computeVoiceSummary` with no screenings | Returns null |
| T7-022 | `computePipelineHistory` calculates days correctly | Days are positive integers |
| T7-023 | `computeInterviewOutcomes` with mixed outcomes | Correct proceed/reject/average counts |

### 11.2 Unit Tests — Missing Information

| Test ID | Description | Expected |
|---------|-------------|----------|
| T7-030 | `computeMissingInfo` with empty candidate | Returns gaps for CTC, notice, education, skills, resume |
| T7-031 | `computeMissingInfo` with complete candidate | Returns zero gaps |
| T7-032 | `computeMissingInfo` with partial data | Only returns gaps for truly missing fields |
| T7-033 | `computeMissingInfo` at offer stage includes reference check gap | Returns reference_check gap |

### 11.3 Unit Tests — Risk Signals

| Test ID | Description | Expected |
|---------|-------------|----------|
| T7-040 | `computeJoiningRisks` with counter-offer mention in notes | Returns counter_offer risk |
| T7-041 | `computeJoiningRisks` with long notice period | Returns long_notice risk |
| T7-042 | `computeJoiningRisks` with CTC mismatch | Returns ctc_mismatch risk |
| T7-043 | `computeJoiningRisks` with high no-show risk | Returns no_show risk |
| T7-044 | `computeJoiningRisks` with location mismatch | Returns location_mismatch risk |
| T7-045 | `computeJoiningRisks` with low voice score | Returns voice_screening_concern risk |
| T7-046 | `computeJoiningRisks` with prior rejections | Returns prior_rejection risk |
| T7-047 | `computeJoiningRisks` with no issues | Returns empty array |
| T7-048 | `computeJoiningRisks` respects dismissed risk memory | Excluded from output |

### 11.4 Unit Tests — Readiness Score

| Test ID | Description | Expected |
|---------|-------------|----------|
| T7-050 | `computeReadinessScore` with all positive signals | overall >= 80, level = "ready_for_interview" |
| T7-051 | `computeReadinessScore` with mixed signals | overall between 40-79 |
| T7-052 | `computeReadinessScore` with all negative signals | overall < 40, level = "caution" |
| T7-053 | `computeReadinessScore` with high risks | Risk penalty applied, score reduced |
| T7-054 | `computeReadinessScore` category weights | Weighted average is correct |

### 11.5 Unit Tests — Next-Best Questions

| Test ID | Description | Expected |
|---------|-------------|----------|
| T7-060 | `generateNextQuestions` with missing skills | Returns skill_clarification questions |
| T7-061 | `generateNextQuestions` with relocation gap | Returns logistics question |
| T7-062 | `generateNextQuestions` with previous rejection | Returns growth question |
| T7-063 | `generateNextQuestions` with no gaps | Returns empty or minimal questions |

### 11.6 Unit Tests — Client Summary

| Test ID | Description | Expected |
|---------|-------------|----------|
| T7-070 | `buildClientSummary` with high readiness | verdict = "Strong fit" |
| T7-071 | `buildClientSummary` with low readiness | verdict = "Significant concerns" |
| T7-072 | `buildClientSummary` strengths and concerns | Lists are mutually exclusive and accurate |
| T7-073 | `buildClientSummary` recommendation | Matches readiness level |

### 11.7 Integration Tests — Screening Workbench

| Test ID | Description | Expected |
|---------|-------------|----------|
| T7-080 | `GET /api/screening/workbench?applicationId=...` returns complete workbench | 200, full response with facts, gaps, risks, readiness, questions, summary |
| T7-081 | `GET /api/screening/workbench` without applicationId | 400 |
| T7-082 | `GET /api/screening/workbench` with invalid applicationId | 404 |
| T7-083 | `GET /api/screening/workbench?summaryOnly=true` | Returns only summary, lighter payload |
| T7-084 | `POST /api/screening/workbench/confirm` | Creates confirmed memory entry |
| T7-085 | `POST /api/screening/workbench/dismiss-risk` | Creates dismissed risk memory entry |
| T7-086 | Dismissed risk is excluded from subsequent workbench call | Risk no longer appears |

### 11.8 Tenant Isolation Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| T7-090 | Org A cannot screen Org B's application | 404 or 403 |
| T7-091 | Screening workbench only returns Org A's data | All facts scoped to Org A |
| T7-092 | Confirming a screening writes correct organizationId | Audit trail shows correct org |
| T7-093 | Client portal user sees only their own candidates' screening | Scoped by clientId |

---

## 12. Rollback Plan

### 12.1 Soft Rollback (Feature Flag)

All screening intelligence is additive and read-only (query-time computation). Introduce:

```env
SCREENING_INTELLIGENCE_ENABLED=false
```

When disabled:
- `GET /api/screening/workbench` returns 404 or `{ enabled: false }`.
- `POST /api/screening/workbench/confirm` and `/dismiss-risk` return 404.
- All existing candidate/job/application APIs continue working unchanged.
- All memory entries (confirmed verdicts, dismissed risks) remain in `ActivityLog`.
- The `lib/screening/` directory is not loaded; no impact on any other route.

### 12.2 Hard Rollback (Code Revert)

1. Remove `lib/screening/` directory (types, service, facts, gaps, risks, readiness, questions, summary).
2. Remove `app/api/screening/` route directory.
3. Revert any `PATCH /api/applications/[id]` changes if `screeningNotes` was added.
4. Revert to Week 6 state.

### 12.3 Rollback Triggers

| Trigger | Action |
|---------|--------|
| Screening workbench p99 latency >2s for typical application | Soft rollback; optimize fact computation |
| Any screening fact computation errors cause the workbench to return 500 | Soft rollback; fix fact function |
| Screening APIs show >1% error rate | Hard rollback; remove screening routes |
| Cross-tenant screening data leak detected | Hard rollback; emergency |
| Client-ready summary contains inaccurate or misleading statements | Soft rollback; disable summary generation |

### 12.4 Data Retention

All Week 7 data lives in `ActivityLog` (confirmed verdicts, dismissed risks) and existing models (Candidate, Application, Job, VoiceScreening, Note, etc.). No new tables. Existing retention policies cover all data.

---

## 13. Acceptance Criteria

### Screening Workbench

1. `GET /api/screening/workbench?applicationId=<id>` returns aggregated screening facts for a candidate-job pair.
2. The workbench includes: skill fit, experience fit, CTC fit, location fit, notice period, education, voice screening summary, recruiter notes summary, pipeline history, and interview outcomes.
3. The workbench returns a missing information checklist identifying fields that would improve screening accuracy.
4. The workbench returns risk signals derived from all available data sources.
5. The workbench returns a composite readiness score (0-100) with a readiness level.
6. The workbench returns next-best recruiter questions based on gaps and risks.
7. The workbench returns a client-ready screening summary with verdict, strengths, concerns, and recommendation.
8. `summaryOnly=true` returns only the client-ready summary.

### Screening Facts

9. Skill fit blends heuristic skill overlap with AI report assessments (when available).
10. Experience fit considers both candidate experience and job requirements.
11. CTC fit uses expected CTC, current CTC, and job salary range with AI fallback.
12. Location fit considers candidate city, preferred locations, and relocation willingness.
13. Notice period uses candidate data with AI report fallback.
14. Voice screening summary uses the most recent completed screening.
15. Pipeline history calculates days in stage and total pipeline duration.
16. Interview outcomes summarize all completed interviews for the application.

### Missing Information

17. Missing information checklist identifies gaps in: CTC, notice period, education, location, experience, skills, resume, LinkedIn.
18. Gaps are categorized by severity (high, medium, low).
19. Gaps automatically resolve when the candidate record is updated with the missing field.
20. At offer stage, reference check gap is included.

### Risk Signals

21. At least 8 risk signal types are detected: counter-offer, long notice, CTC mismatch, no-show, location mismatch, voice screening concern, prior rejection, low match score.
22. Each risk signal has: type, label, severity, source, likelihood (0-100), and evidence references.
23. Dismissed risks are excluded from subsequent workbench queries.
24. Risk signals are derived from candidate profile, AI screening, voice screening, recruiter notes, and interview data.

### Readiness Score

25. Readiness score is a weighted composite of 8 category scores with risk penalty applied.
26. Readiness levels are: ready_for_interview (80+), likely_fit (60-79), needs_review (40-59), caution (0-39).
27. Risk penalty reduces score based on high (15 pts) and medium (5 pts) risks.
28. Score is bounded 0-100.

### Next-Best Questions

29. Questions are generated from: missing skills, information gaps, risk signals, interview history, and missing voice screening.
30. Each question has: question text, reason, priority, and category.
31. Duplicate questions are not generated.

### Client-Ready Summary

32. Summary includes a verdict based on readiness level.
33. Summary lists top 5 strengths with data-driven evidence.
34. Summary lists top 5 concerns with data-driven evidence.
35. Summary includes a recommendation for next steps.

### Human Confirmation

36. Screening verdict can be confirmed via API (creates confirmed memory entry).
37. Individual risk signals can be dismissed via API (stored in memory).
38. Dismissed risks are excluded from subsequent workbench calculations.
39. Existing Week 5 confidence workflow works for individual screening facts.

### Tenant Safety

40. All screening APIs require authentication.
41. All screening data is tenant-scoped via `tenantPrisma.withContext(ctx)`.
42. Cross-tenant screening access returns 404.
43. Screening confirmation and risk dismissal are tenant-scoped.

### No Schema Changes

44. Zero new database tables, columns, or indexes.
45. Zero Prisma schema modifications.
46. Zero migrations created.
47. All screening intelligence is computed at query time from existing models.

### Testing

48. Unit tests pass for all fact computation functions (T7-001 through T7-023).
49. Unit tests pass for missing information checklist (T7-030 through T7-033).
50. Unit tests pass for risk signal computation (T7-040 through T7-048).
51. Unit tests pass for readiness score (T7-050 through T7-054).
52. Unit tests pass for next-best questions (T7-060 through T7-063).
53. Unit tests pass for client summary (T7-070 through T7-073).
54. Integration tests pass for screening workbench APIs (T7-080 through T7-086).
55. Tenant isolation tests confirm no cross-org data leak (T7-090 through T7-093).

### Build & Deploy

56. `npm run build` passes with zero errors.
57. All existing Week 3/4/5/6 tests pass (no regressions).
58. Feature flag `SCREENING_INTELLIGENCE_ENABLED` defaults to `true`.

---

## Implementation Order

1. **Core types** — `lib/screening/types.ts`
   - `ScreeningWorkbench`, `ScreeningFacts`, `MissingInfo`, `RiskSignal`, `ReadinessScore`, `RecruiterQuestion`, `ClientScreeningSummary`, and all supporting types

2. **Screening facts** — `lib/screening/facts.ts`
   - `computeSkillFit()`, `computeExperienceFit()`, `computeCtcFit()`, `computeLocationFit()`, `computeNoticePeriod()`, `computeEducationFit()`, `computeVoiceSummary()`, `extractNoteSummaries()`, `computePipelineHistory()`, `computeInterviewOutcomes()`
   - Each function is independently testable

3. **Missing information** — `lib/screening/gaps.ts`
   - `computeMissingInfo()` with all 12+ gap checks

4. **Risk signals** — `lib/screening/risks.ts`
   - `computeJoiningRisks()` with all 10 risk types
   - Dismissed risk exclusion logic (reads `"risk_dismissed"` memory entries)

5. **Readiness score** — `lib/screening/readiness.ts`
   - `computeReadinessScore()` with weighted categories and risk penalty
   - Category-to-score converters for non-numeric dimensions

6. **Next-best questions** — `lib/screening/questions.ts`
   - `generateNextQuestions()` — derives questions from facts, gaps, risks, and history

7. **Client summary** — `lib/screening/summary.ts`
   - `buildClientSummary()` — generates verdict, strengths, concerns, recommendation

8. **Aggregation service** — `lib/screening/service.ts`
   - `getScreeningWorkbench()` — orchestrates all fact/risk/question/summary computation

9. **Workbench API** — `app/api/screening/workbench/route.ts` (GET)
   - Accepts `applicationId` or `candidateId` + `jobId`
   - `summaryOnly=true` for lighter response
   - Full error handling

10. **Confirm API** — `app/api/screening/workbench/confirm/route.ts` (POST)
    - Accepts `applicationId`, `verdict`, `notes?`
    - Creates confirmed memory entry

11. **Dismiss risk API** — `app/api/screening/workbench/dismiss-risk/route.ts` (POST)
    - Accepts `applicationId`, `riskType`, `reason?`
    - Creates dismissed risk memory entry

12. **Feature flag** — `SCREENING_INTELLIGENCE_ENABLED` env var check
    - All `lib/screening/` functions respect the flag
    - API routes return 404 when disabled

13. **Add to middleware matcher** — `/api/screening/:path*`

14. **Unit tests** — All 54 fact, gap, risk, readiness, question, and summary tests

15. **Integration tests** — All 14 workbench, confirm, dismiss, and tenant isolation tests

16. **Build and smoke test** — `npm run build`, manual screening workbench verification on a real application record
