# WEEK 5 — INSTITUTIONAL MEMORY PLAN

## Purpose

Week 5 builds an **institutional memory layer** that captures, structures, and surfaces every meaningful signal flowing through the TalentPulse platform. The platform already generates rich data across notes, activities, screenings, messages, emails, pipeline changes, interviews, and offers — but this data is fragmented across models with no unified access pattern for "what do we know about this candidate/client/job/recruiter."

Week 5 introduces a **memory service** that aggregates signals from all existing sources into a structured, queryable timeline using only the existing schema. No new tables, no migrations, no schema changes.

## Principles

1. **No schema changes** — All memory is stored in existing models (`ActivityLog`, `Note`) using standardized conventions.
2. **Tenant-safe** — All memory queries go through the Week 3/4 repository layer.
3. **Signal over storage** — Memory is derived from existing data; we do not duplicate data into new tables.
4. **Human-in-the-loop** — Memory entries can be confirmed, corrected, or dismissed.
5. **Source-grounded** — Every memory entry references its source record (activity ID, note ID, screening ID, etc.) for auditability.

---

## 1. Memory Model (Existing Schema)

Institutional memory is not a new table. It is a **view** over existing tenant-owned records, unified by a set of canonical `entityType` values and a structured `metadata` payload in `ActivityLog`.

### Core Memory Types

| Memory Type | Primary Source(s) | Entity Type(s) | Canonical Actions |
|-------------|-------------------|----------------|-------------------|
| **Decision** | ActivityLog, Interview, Offer | `application`, `offer` | `stage_changed`, `offer_extended`, `offer_accepted`, `offer_rejected`, `interview_outcome` |
| **Candidate** | Note, VoiceScreening, WhatsAppMessage, EmailLog | `candidate`, `note`, `voiceScreening`, `whatsapp`, `email` | `note_added`, `screening_completed`, `message_sent`, `email_sent`, `summary_updated` |
| **Client** | ActivityLog, Note, Job | `client`, `job` | `client_created`, `job_created`, `feedback_received`, `interaction_logged` |
| **Requirement** | ActivityLog, Job | `job`, `application` | `job_created`, `job_updated`, `requirement_changed`, `pipeline_velocity` |
| **Recruiter** | ActivityLog, Note, Interview | `user` | `note_written`, `interview_scheduled`, `action_completed`, `outcome_achieved` |
| **Outcome** | Offer, ActivityLog | `offer`, `application` | `offer_extended`, `offer_accepted`, `offer_rejected`, `candidate_joined`, `candidate_declined`, `time_to_hire` |

### Memory Record Shape

Every memory entry is represented as an `ActivityLog` record with standardized metadata:

```typescript
// Core fields on ActivityLog
{
  id: "string",
  organizationId: "string",
  workspaceId: "string",
  userId: "string | null",        // Who performed the action
  entityType: "string",            // Canonical type (see conventions below)
  entityId: "string",              // Which entity this memory is about
  action: "string",                // Canonical action (see conventions below)
  metadata: {                      // Structured payload
    memoryType: "decision" | "candidate" | "client" | "requirement" | "recruiter" | "outcome",
    summary: string,               // Human-readable one-liner
    details: string | null,        // Longer description
    sourceModel: string,           // e.g. "note", "voiceScreening", "interview"
    sourceId: string,              // The actual record ID
    sourceUrl: string | null,      // Link to the source in the app
    tags: string[],                // Free-form tags for filtering
    confidence: "auto" | "confirmed" | "corrected" | "dismissed",
    correctionOfId: string | null, // If corrected, the original memory entry ID
    correctedByUserId: string | null,
    correctedAt: string | null,
    humanNote: string | null,      // Free-text note from human reviewer
    previousValue: any,            // For change events: what it was
    newValue: any,                 // For change events: what it became
    sentiment: "positive" | "negative" | "neutral" | null,
    importance: "low" | "medium" | "high" | null,
  },
  createdAt: "DateTime",
}
```

### Canonical Entity Types

| `entityType` | Refers To | Entity ID Semantics |
|-------------|-----------|---------------------|
| `"candidate"` | Candidate | `Candidate.id` |
| `"client"` | Client | `Client.id` |
| `"job"` | Job / Requisition | `Job.id` |
| `"application"` | Application (candidate-job link) | `Application.id` |
| `"interview"` | Interview | `Interview.id` |
| `"offer"` | Offer | `Offer.id` |
| `"note"` | Note on any entity | `Note.id` |
| `"voiceScreening"` | Voice screening | `VoiceScreening.id` |
| `"whatsapp"` | WhatsApp message | `WhatsAppMessage.id` |
| `"email"` | Email log | `EmailLog.id` |
| `"prospect"` | Prospect | `Prospect.id` |
| `"user"` | Recruiter/team member | `User.id` |

### Canonical Actions

| `action` | Meaning |
|----------|---------|
| `"created"` | Record was created |
| `"updated"` | Record was updated (generic) |
| `"stage_changed"` | Pipeline stage changed |
| `"match_scored"` | AI match score computed |
| `"interview_scheduled"` | Interview was scheduled |
| `"interview_completed"` | Interview took place |
| `"interview_outcome"` | Interview outcome recorded (rating, feedback) |
| `"offer_extended"` | Offer was extended |
| `"offer_accepted"` | Candidate accepted offer |
| `"offer_rejected"` | Candidate rejected offer |
| `"candidate_joined"` | Candidate joined (actual start) |
| `"candidate_declined"` | Candidate declined after accepting |
| `"note_added"` | Note was written about an entity |
| `"screening_completed"` | AI screening finished |
| `"message_sent"` | WhatsApp message sent |
| `"email_sent"` | Email sent |
| `"client_feedback"` | Client feedback recorded |
| `"requirement_changed"` | Job requirement changed |
| `"summary_updated"` | AI summary regenerated |
| `"action_completed"` | Recruiter completed an action |
| `"prospect_converted"` | Prospect became a candidate |
| `"call_outcome"` | Voice screening call outcome |

---

## 2. Decision Memory

### What It Captures

Every hiring decision point across the pipeline: stage progressions, interview outcomes, offer results.

### Sources

| Source Signal | Capture Trigger | Memory Action | Entity |
|--------------|----------------|--------------|--------|
| Application stage changes (via API) | `PATCH /api/applications/[id]` — stage field changes | `stage_changed` | `application` |
| Interview outcome recorded (via API) | `PATCH /api/interviews/[id]` — outcome, rating, feedback set | `interview_outcome` | `application` (also `interview`) |
| Offer extended | `POST /api/offers` — status set to EXTENDED | `offer_extended` | `application` (also `offer`) |
| Offer accepted | `PATCH /api/offers/[id]` — status → ACCEPTED | `offer_accepted` | `application` (also `offer`) |
| Offer rejected | `PATCH /api/offers/[id]` — status → REJECTED | `offer_rejected` | `application` (also `offer`) |
| Candidate joined | `PATCH /api/offers/[id]` — actualJoinedAt set | `candidate_joined` | `application` (also `offer`) |
| AI match score | `POST /api/ai/screen` — score computed | `match_scored` | `application` |

### Memory Content

```typescript
// Example: stage_changed on application
{
  entityType: "application",
  entityId: appId,
  action: "stage_changed",
  metadata: {
    memoryType: "decision",
    summary: "Moved to Interview - L1 (from AI Screening)",
    sourceModel: "application",
    sourceId: appId,
    tags: ["pipeline", "stage-change"],
    confidence: "auto",
    previousValue: "AI_SCREENING",
    newValue: "INTERVIEW_SCHEDULED",
    importance: "high",
  },
}

// Example: interview_outcome
{
  entityType: "application",
  entityId: appId,
  action: "interview_outcome",
  metadata: {
    memoryType: "decision",
    summary: "L1 Interview: PROCEED (rating: 4/5) — Strong technical background",
    details: "Interviewer noted excellent communication and problem-solving skills.",
    sourceModel: "interview",
    sourceId: interviewId,
    tags: ["interview", "L1", "proceed"],
    confidence: "auto",
    previousValue: "PENDING",
    newValue: "PROCEED",
    sentiment: "positive",
    importance: "high",
  },
}
```

---

## 3. Candidate Memory

### What It Captures

Every signal about a candidate: notes, AI summaries, screenings, communications, feedback.

### Sources

| Source Signal | Capture Trigger | Memory Action | Entity |
|--------------|----------------|--------------|--------|
| Note added on candidate | `POST /api/candidates/[id]/notes` | `note_added` | `note` (related to `candidate`) |
| AI screening completed | `POST /api/ai/screen` — screening finished | `screening_completed` | `candidate` (also `application`, `voiceScreening`) |
| AI summary regenerated | Candidate profile save / AI re-summarize | `summary_updated` | `candidate` |
| WhatsApp message sent | `POST /api/whatsapp/send` | `message_sent` | `whatsapp` (related to `candidate`) |
| Email sent | `POST /api/email/send` | `email_sent` | `email` (related to `candidate`) |
| Voice screening call outcome | Callback from provider | `call_outcome` | `voiceScreening` (related to `candidate`) |
| Prospect converted to candidate | `POST /api/prospects/convert` | `prospect_converted` | `candidate` |

### Memory Content

```typescript
// Example: note_added on candidate
{
  entityType: "note",
  entityId: noteId,
  action: "note_added",
  metadata: {
    memoryType: "candidate",
    summary: "Note: Candidate prefers remote-first roles",
    details: "Full note text here...",
    sourceModel: "note",
    sourceId: noteId,
    tags: ["preference", "remote", "recruiter-insight"],
    confidence: "auto",
    importance: "medium",
  },
}

// Example: screening_completed
{
  entityType: "candidate",
  entityId: candidateId,
  action: "screening_completed",
  metadata: {
    memoryType: "candidate",
    summary: "AI Screening: Score 85/100 — Strong match for SAP Program Manager",
    details: "Skills match: 90%. Experience match: 85%. CTC fit: Within range.",
    sourceModel: "application",
    sourceId: applicationId,
    tags: ["ai-screening", "match-score"],
    confidence: "auto",
    sentiment: "positive",
    importance: "high",
  },
}
```

---

## 4. Client Memory

### What It Captures

Interactions, feedback, and decisions at the client level.

### Sources

| Source Signal | Capture Trigger | Memory Action | Entity |
|--------------|----------------|--------------|--------|
| Client created | `POST /api/clients` | `created` | `client` |
| Client updated | `PATCH /api/clients/[id]` | `updated` | `client` |
| Job created for client | `POST /api/jobs` (linked to client) | `job_created` | `job` (related to `client`) |
| Client feedback on candidate | `PATCH /api/applications/[id]` — clientFeedback set | `client_feedback` | `application` (related to `client`) |
| Note about client (future) | Add note entity with `entityType: "client"` | `note_added` | `note` (related to `client`) |

### Memory Content

```typescript
// Example: client_feedback
{
  entityType: "application",
  entityId: appId,
  action: "client_feedback",
  metadata: {
    memoryType: "client",
    summary: "Client feedback on Suresh Rao: 'Strong candidate, proceed to final round'",
    details: null,
    sourceModel: "application",
    sourceId: appId,
    relatedEntityType: "client",
    relatedEntityId: clientId,
    tags: ["feedback", "client-interaction"],
    confidence: "auto",
    sentiment: "positive",
    importance: "high",
  },
}
```

---

## 5. Requirement / Job Memory

### What It Captures

Evolution of a job requisition: creation, requirement changes, pipeline health.

### Sources

| Source Signal | Capture Trigger | Memory Action | Entity |
|--------------|----------------|--------------|--------|
| Job created | `POST /api/jobs` | `created` | `job` |
| Job updated (requirements changed) | `PATCH /api/jobs/[id]` — skills, description, salary | `requirement_changed` | `job` |
| Application added to job | `POST /api/applications` | `created` (application under job) | `application` (related to `job`) |
| Stage progression on any application | `PATCH /api/applications/[id]` | `stage_changed` | `application` (related to `job`) |

### Memory Content

```typescript
// Example: requirement_changed
{
  entityType: "job",
  entityId: jobId,
  action: "requirement_changed",
  metadata: {
    memoryType: "requirement",
    summary: "Salary range updated: ₹35-50L → ₹40-55L",
    sourceModel: "job",
    sourceId: jobId,
    tags: ["salary", "update"],
    confidence: "auto",
    previousValue: { salaryMin: 3500000, salaryMax: 5000000 },
    newValue: { salaryMin: 4000000, salaryMax: 5500000 },
    importance: "high",
  },
}
```

---

## 6. Recruiter Memory

### What It Captures

Every action a recruiter takes: notes written, interviews scheduled, outcomes achieved.

### Sources

| Source Signal | Capture Trigger | Memory Action | Entity |
|--------------|----------------|--------------|--------|
| Any action by a user | All previous capture triggers (recruiter is the `userId`) | varies | varies |
| Interview scheduled | `POST /api/interviews` | `interview_scheduled` | `interview` |
| Note written | `POST /api/candidates/[id]/notes` | `note_added` | `note` |
| Offer outcome | `PATCH /api/offers/[id]` — status change | `offer_extended`, `offer_accepted`, `offer_rejected` | `offer` |
| Candidate sourcing | Prospect → candidate, or candidate created | `prospect_converted` or `created` | `candidate` |

### Memory Content

```typescript
// Recruiter memory is aggregated from the userId on all memory entries.
// No separate capture — it is a view: "what did this user do?"
// The memory service provides a query: getMemoryByUser(userId, filters)
```

---

## 7. Outcome Memory

### What It Captures

Results of the hiring process: hires, rejects, time metrics, source effectiveness.

### Sources

| Source Signal | Capture Trigger | Memory Action | Entity |
|--------------|----------------|--------------|--------|
| Offer accepted | `PATCH /api/offers/[id]` → ACCEPTED | `offer_accepted` | `application` |
| Candidate joined | `PATCH /api/offers/[id]` → actualJoinedAt set | `candidate_joined` | `application` |
| Candidate declined | `PATCH /api/offers/[id]` → REJECTED by candidate | `candidate_declined` | `application` |
| Rejection at any stage | `PATCH /api/applications/[id]` → REJECTED stage | `stage_changed` with `newValue: "REJECTED"` | `application` |
| Time-to-hire computed | Derived: candidate created → offer accepted | Computed on query, not stored |

### Memory Content

```typescript
// Example: candidate_joined
{
  entityType: "application",
  entityId: appId,
  action: "candidate_joined",
  metadata: {
    memoryType: "outcome",
    summary: "Suresh Rao joined as SAP Program Manager at TechCorp India",
    details: "Offer CTC: ₹52L. Joining date: 2026-07-01. Time-to-hire: 45 days.",
    sourceModel: "offer",
    sourceId: offerId,
    tags: ["hire", "success"],
    confidence: "auto",
    sentiment: "positive",
    importance: "high",
  },
}
```

---

## 8. Memory Capture Sources (Implementation)

All memory capture happens in **service-layer functions** that are called from API route handlers *after* the primary write completes. This is a **fire-and-forget** pattern — memory capture failures must never block the primary operation.

### Capture Service

**`lib/memory/service.ts`** — Central memory ingestion function:

```typescript
import { tenantPrisma } from "@/lib/tenant/prisma";
import { logActivity } from "@/lib/activity";
import type { TenantContext } from "@/lib/tenant/context";

type MemoryInput = {
  tenantContext: TenantContext;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, any>;
};

export async function captureMemory(input: MemoryInput): Promise<void> {
  try {
    await logActivity({
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      metadata: input.metadata,
    });
  } catch (error) {
    // Memory capture must never fail the primary operation
    console.error("[memory] capture failed", {
      error: String(error),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
    });
  }
}
```

### Source-by-Source Integration Points

#### 8.1 Notes → Memory

**Integration point:** `POST /api/candidates/[id]/notes`, `PATCH /api/notes/[id]`

After a note is created/updated, call `captureMemory`:

```typescript
await captureMemory({
  tenantContext,
  userId: user.id,
  entityType: "note",
  entityId: note.id,
  action: noteBody.changed ? "updated" : "note_added",
  metadata: {
    memoryType: "candidate",
    summary: `Note: ${noteBody.body.slice(0, 100)}${noteBody.body.length > 100 ? "..." : ""}`,
    details: noteBody.body,
    sourceModel: "note",
    sourceId: note.id,
    tags: extractTags(noteBody.body),
    confidence: "auto",
    importance: "medium",
  },
});
```

#### 8.2 ActivityLog → Memory (Self-Feeding)

The `logActivity` helper already writes to `ActivityLog`. The memory service reads from ActivityLog. This means:

- Existing `logActivity` calls automatically become memory entries if they use canonical `entityType` and `action` values.
- For legacy `logActivity` calls that do not use canonical values, the memory service gracefully skips them or includes them as generic entries.

**No double-write needed.** The memory service queries `ActivityLog` with canonical filters. New code paths call `captureMemory` (which calls `logActivity`). Existing code paths already call `logActivity` — they naturally feed into memory once the memory service reads canonical activity types.

#### 8.3 Voice Screening → Memory

**Integration points:**
- Callback endpoint (screening complete) → `captureMemory`
- `PATCH /api/voice-screening/[id]` (AI summary saved) → `captureMemory`

```typescript
// After screening completes (via webhook/callback):
await captureMemory({
  tenantContext,
  userId: null, // system action
  entityType: "voiceScreening",
  entityId: screening.id,
  action: "screening_completed",
  metadata: {
    memoryType: "candidate",
    summary: `Voice Screening: Score ${screening.aiScore}/100`,
    details: screening.aiSummary ?? undefined,
    sourceModel: "voiceScreening",
    sourceId: screening.id,
    tags: ["voice-screening", `score-${screening.aiScore}`],
    confidence: "auto",
    importance: screening.aiScore >= 80 ? "high" : "medium",
  },
});
```

#### 8.4 WhatsApp → Memory

**Integration points:**
- `POST /api/whatsapp/send` → `captureMemory`
- Webhook for delivery/read receipts → `captureMemory`

```typescript
// After sending:
await captureMemory({
  tenantContext,
  userId: user.id,
  entityType: "whatsapp",
  entityId: message.id,
  action: "message_sent",
  metadata: {
    memoryType: "candidate",
    summary: `WhatsApp sent to ${candidateName}: "${messageBody.slice(0, 80)}..."`,
    sourceModel: "whatsAppMessage",
    sourceId: message.id,
    tags: ["whatsapp", "outreach"],
    confidence: "auto",
    importance: "low",
  },
});
```

#### 8.5 Email → Memory

**Integration points:**
- `POST /api/email/send` → `captureMemory`
- `POST /api/email-campaigns/[id]/send` (batch send) → `captureMemory` per recipient

```typescript
// After sending:
await captureMemory({
  tenantContext,
  userId: user.id,
  entityType: "email",
  entityId: emailLog.id,
  action: "email_sent",
  metadata: {
    memoryType: "candidate",
    summary: `Email sent to ${recipient}: "${subject}"`,
    sourceModel: "emailLog",
    sourceId: emailLog.id,
    tags: ["email", "outreach"],
    confidence: "auto",
    importance: "low",
  },
});
```

#### 8.6 Pipeline Stage Changes → Memory

**Integration point:** `PATCH /api/applications/[id]` — when `stage` field changes:

```typescript
// During the update, after detecting stage change:
await captureMemory({
  tenantContext,
  userId: user.id,
  entityType: "application",
  entityId: application.id,
  action: "stage_changed",
  metadata: {
    memoryType: "decision",
    summary: `Moved to ${newStage} (from ${oldStage})`,
    sourceModel: "application",
    sourceId: application.id,
    tags: ["pipeline", "stage-change", newStage.toLowerCase()],
    confidence: "auto",
    previousValue: oldStage,
    newValue: newStage,
    sentiment: isPositiveStageChange(newStage) ? "positive" : isNegativeStageChange(newStage) ? "negative" : "neutral",
    importance: "high",
  },
});
```

#### 8.7 Interview Outcomes → Memory

**Integration point:** `PATCH /api/interviews/[id]` — when outcome, rating, or feedback changes:

```typescript
await captureMemory({
  tenantContext,
  userId: user.id,
  entityType: "application", // Stored against the application, not the interview
  entityId: interview.applicationId,
  action: "interview_outcome",
  metadata: {
    memoryType: "decision",
    summary: `${interview.round} Interview: ${outcome} (rating: ${rating}/5)`,
    details: interview.feedback ?? undefined,
    sourceModel: "interview",
    sourceId: interview.id,
    tags: ["interview", interview.round.toLowerCase(), outcome.toLowerCase()],
    confidence: "auto",
    previousValue: oldOutcome,
    newValue: outcome,
    sentiment: outcome === "PROCEED" ? "positive" : outcome === "REJECT" ? "negative" : "neutral",
    importance: "high",
  },
});
```

#### 8.8 Offer Outcomes → Memory

**Integration point:** `PATCH /api/offers/[id]` — when status changes:

```typescript
await captureMemory({
  tenantContext,
  userId: user.id,
  entityType: "application",
  entityId: offer.applicationId,
  action: determineOfferAction(newStatus),
  metadata: {
    memoryType: "outcome",
    summary: `${offerActionLabel}: ${offer.offeredCtc} CTC`,
    details: `Offered CTC: ₹${(offer.offeredCtc / 100000).toFixed(1)}L. Fixed: ₹${(offer.fixedCtc / 100000).toFixed(1)}L. Variable: ₹${(offer.variableCtc / 100000).toFixed(1)}L.`,
    sourceModel: "offer",
    sourceId: offer.id,
    tags: ["offer", newStatus.toLowerCase()],
    confidence: "auto",
    previousValue: oldStatus,
    newValue: newStatus,
    sentiment: newStatus === "ACCEPTED" ? "positive" : newStatus === "REJECTED" ? "negative" : "neutral",
    importance: "high",
  },
});
```

#### 8.9 Prospect Conversion → Memory

**Integration point:** `POST /api/prospects/convert` → after successful conversion:

```typescript
await captureMemory({
  tenantContext,
  userId: user.id,
  entityType: "candidate",
  entityId: candidate.id,
  action: "prospect_converted",
  metadata: {
    memoryType: "candidate",
    summary: `Prospect converted to candidate (source: ${prospect.source})`,
    sourceModel: "prospect",
    sourceId: prospect.id,
    tags: ["prospect-conversion", prospect.source.toLowerCase()],
    confidence: "auto",
    importance: "medium",
  },
});
```

#### 8.10 Job Requirement Changes → Memory

**Integration point:** `PATCH /api/jobs/[id]` — when skills, description, salary, or requirements change:

```typescript
await captureMemory({
  tenantContext,
  userId: user.id,
  entityType: "job",
  entityId: job.id,
  action: "requirement_changed",
  metadata: {
    memoryType: "requirement",
    summary: changeSummary, // computed diff
    sourceModel: "job",
    sourceId: job.id,
    tags: ["requirement", "update"],
    confidence: "auto",
    previousValue: oldFields,
    newValue: newFields,
    importance: "high",
  },
});
```

---

## 9. Human Confirmation / Correction Workflow

### Why This Matters

Auto-captured memory is useful but may contain noise, errors, or low-signal entries. Recruiters and admins need to:
1. Confirm a memory entry as accurate.
2. Correct a memory entry with better information.
3. Dismiss a memory entry as irrelevant or wrong.
4. Add a human note to supplement auto-captured data.

### Memory Confidence States

```
auto ─────────────────► confirmed
  │                         │
  ├──► corrected ──────────►│ (corrected creates new entry linked via correctionOfId)
  │                         │
  └──► dismissed            │
                            │
                     auto ──┘ (new auto entry after confirmed — remains confirmed)
```

### API Endpoints

#### `POST /api/memory/[id]/confirm`

Sets `metadata.confidence = "confirmed"` on the memory entry.

```typescript
// Body: { }
// Response: { success: true }
// Side effect: log this confirmation as a new activity entry
```

#### `POST /api/memory/[id]/correct`

Creates a **new** memory entry with `confidence = "corrected"` and `correctionOfId = originalId`. The original entry remains with `confidence = "corrected"` (updated retroactively).

```typescript
// Body: { summary, details, tags }
// Response: { id: newMemoryEntryId }
// Side effect: original entry's confidence updated to "corrected"
// Side effect: new entry created with corrected metadata values
```

#### `POST /api/memory/[id]/dismiss`

Sets `metadata.confidence = "dismissed"` on the memory entry. Dismissed entries are excluded from default memory queries but remain for audit.

```typescript
// Body: { reason?: string }
// Response: { success: true }
// Side effect: if reason provided, stored in metadata.humanNote
```

#### `POST /api/memory/[id]/note`

Adds a human-authored note to an existing memory entry without changing its confidence.

```typescript
// Body: { note: string }
// Response: { success: true }
// Side effect: appends to metadata.humanNote
```

### UI Considerations (Not Implemented in Week 5)

- Small icon on each memory card: ✓ (confirmed), ✎ (correct), ✕ (dismiss), 💬 (add note)
- Confirmed entries float higher in relevance sorting.
- Dismissed entries hidden by default, shown in an "include dismissed" toggle.
- Corrections show the original value struck through with the correction below it.

---

## 10. Tenant-Safe Memory Service

### Architecture

```text
lib/
  memory/
    service.ts          ← captureMemory(), getMemory(), getMemoryTimeline()
    types.ts            ← TypeScript types for memory entries
    confidence.ts       ← Human confirmation workflow functions
    tags.ts             ← Tag extraction and normalization helpers
  repositories/         ← Week 3/4 repositories (unchanged)
  tenant/
    context.ts          ← Week 3 tenant context (unchanged)
    prisma.ts           ← Week 4 expanded proxy (unchanged)
```

### Memory Query Service

**`lib/memory/service.ts`** — Read-side service:

```typescript
import { tenantPrisma } from "@/lib/tenant/prisma";
import type { TenantContext } from "@/lib/tenant/context";

type MemoryQuery = {
  entityType?: string | string[];
  entityId?: string;
  action?: string | string[];
  memoryType?: string;
  confidence?: string | string[];
  tags?: string[];
  userId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
  includeDismissed?: boolean;
  sortBy?: "createdAt" | "importance";
  sortOrder?: "asc" | "desc";
};

export async function getMemory(ctx: TenantContext, query: MemoryQuery) {
  const where: any = {};

  if (query.entityType) {
    where.entityType = Array.isArray(query.entityType)
      ? { in: query.entityType }
      : query.entityType;
  }
  if (query.entityId) where.entityId = query.entityId;
  if (query.action) {
    where.action = Array.isArray(query.action)
      ? { in: query.action }
      : query.action;
  }
  if (query.userId) where.userId = query.userId;
  if (query.since || query.until) {
    where.createdAt = {};
    if (query.since) where.createdAt.gte = query.since;
    if (query.until) where.createdAt.lte = query.until;
  }

  // Filter by memoryType in metadata JSON
  if (query.memoryType) {
    where.metadata = {
      path: ["memoryType"],
      equals: query.memoryType,
    };
  }

  // Filter by tags in metadata JSON
  if (query.tags && query.tags.length > 0) {
    where.metadata = {
      ...where.metadata,
      path: ["tags"],
      array_contains: query.tags,
    };
  }

  // Exclude dismissed by default
  if (!query.includeDismissed) {
    where.NOT = {
      metadata: {
        path: ["confidence"],
        equals: "dismissed",
      },
    };
  }

  const [entries, total] = await Promise.all([
    tenantPrisma.activityLog.findMany({
      where,
      orderBy: { [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc" },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    }),
    tenantPrisma.activityLog.count({ where }),
  ]);

  return { entries, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
}

export async function getMemoryTimeline(
  ctx: TenantContext,
  entityType: string,
  entityId: string,
  options?: { includeDismissed?: boolean; limit?: number },
) {
  return getMemory(ctx, {
    entityType,
    entityId,
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: options?.limit ?? 100,
    includeDismissed: options?.includeDismissed,
  });
}

export async function getMemoryByEntity(
  ctx: TenantContext,
  entityType: string,
  entityId: string,
): Promise<ActivityLogEntry[]> {
  const result = await getMemoryTimeline(ctx, entityType, entityId, { limit: 200 });
  return result.entries;
}

export async function getMemoryByUser(
  ctx: TenantContext,
  userId: string,
  options?: { limit?: number },
) {
  return getMemory(ctx, {
    userId,
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: options?.limit ?? 50,
  });
}
```

### Tenant Safety

All memory queries go through `tenantPrisma.activityLog`, which:

1. Automatically injects `organizationId` (Week 3 proxy).
2. Automatically injects `workspaceId` for workspace-scoped queries (Week 3 proxy).
3. Throws `P2025` in enforce mode for cross-tenant writes (Week 4).
4. Is fully covered by the Week 4 proxy expansion.

No additional tenant safety is needed for the memory service.

### Memory Integrity

- `captureMemory` is fire-and-forget — it never blocks the caller.
- `captureMemory` logs failures but never throws.
- All memory entries reference their source record via `sourceModel` + `sourceId` for auditability.
- Memory entries are immutable once created (except for `confidence` and `humanNote` fields which are updated in-place by the confirmation workflow).

---

## 11. API Routes

### Route Structure

```
GET  /api/memory                    ← Query memory with filters
GET  /api/memory/timeline           ← Timeline for a specific entity
POST /api/memory/[id]/confirm       ← Confirm a memory entry
POST /api/memory/[id]/correct       ← Correct a memory entry
POST /api/memory/[id]/dismiss       ← Dismiss a memory entry
POST /api/memory/[id]/note          ← Add human note to a memory entry
```

### Route Specifications

#### `GET /api/memory`

Query memory across all entities with filters.

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `entityType` | string | — | Filter by entity type |
| `entityId` | string | — | Filter by entity ID |
| `action` | string | — | Filter by action |
| `memoryType` | string | — | Filter by `metadata.memoryType` |
| `userId` | string | — | Filter by acting user |
| `tags` | string (comma-sep) | — | Filter by tags (AND logic) |
| `since` | ISO date | — | Earliest createdAt |
| `until` | ISO date | — | Latest createdAt |
| `includeDismissed` | boolean | false | Include dismissed entries |
| `limit` | int | 50 | Max results |
| `offset` | int | 0 | Pagination offset |
| `sortBy` | string | createdAt | Sort field |
| `sortOrder` | string | desc | Sort direction |

**Response:**
```json
{
  "entries": [
    {
      "id": "clx...",
      "entityType": "application",
      "entityId": "clx...",
      "action": "stage_changed",
      "userId": "clx...",
      "userName": "Priya Sharma",
      "metadata": { ... },
      "createdAt": "2026-06-17T10:30:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

#### `GET /api/memory/timeline`

Dedicated endpoint for entity timelines (used on candidate profile, job detail, etc.).

**Query parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `entityType` | string | yes | Entity type |
| `entityId` | string | yes | Entity ID |
| `limit` | int | no | Max results (default 100) |
| `includeDismissed` | boolean | no | Include dismissed |

**Response:** Same as `GET /api/memory` but filtered to one entity.

#### `POST /api/memory/[id]/confirm`

**Auth:** Authenticated user with admin or recruiter role.

**Body:** `{}`

**Response:** `{ success: true }`

**Side effects:**
- Sets `metadata.confidence = "confirmed"` on the ActivityLog entry.
- Creates a new activity entry: action = `confirmed`, entityType = `activityLog`, entityId = memory entry ID.

#### `POST /api/memory/[id]/correct`

**Auth:** Authenticated user with admin or recruiter role.

**Body:**
```json
{
  "summary": "Corrected summary text",
  "details": "Corrected details",
  "tags": ["updated", "accurate"]
}
```

**Response:** `{ id: "new-memory-entry-id" }`

**Side effects:**
- Sets `metadata.confidence = "corrected"` on the original entry.
- Creates a new ActivityLog entry with the corrected metadata and `correctionOfId` pointing to the original.

#### `POST /api/memory/[id]/dismiss`

**Auth:** Authenticated user with admin or recruiter role.

**Body:** `{ "reason": "Not relevant to current search" }`

**Response:** `{ success: true }`

**Side effects:**
- Sets `metadata.confidence = "dismissed"`.
- Sets `metadata.humanNote = reason` if provided.

#### `POST /api/memory/[id]/note`

**Auth:** Authenticated user with admin or recruiter role.

**Body:** `{ "note": "Spoke with the candidate — they confirmed this preference." }`

**Response:** `{ success: true }`

**Side effects:**
- Appends to `metadata.humanNote`.

### Route Implementation Pattern (All Routes)

Every memory API route follows this pattern:

```typescript
// app/api/memory/route.ts (GET)
import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenant/context";
import { requireUser } from "@/lib/guards";
import { getMemory } from "@/lib/memory/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const result = await getMemory(ctx, {
    entityType: url.searchParams.get("entityType") ?? undefined,
    entityId: url.searchParams.get("entityId") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    memoryType: url.searchParams.get("memoryType") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    tags: url.searchParams.get("tags")?.split(",").filter(Boolean),
    since: url.searchParams.get("since") ? new Date(url.searchParams.get("since")!) : undefined,
    until: url.searchParams.get("until") ? new Date(url.searchParams.get("until")!) : undefined,
    includeDismissed: url.searchParams.get("includeDismissed") === "true",
    limit: parseInt(url.searchParams.get("limit") ?? "50"),
    offset: parseInt(url.searchParams.get("offset") ?? "0"),
  });

  return NextResponse.json(result);
}
```

---

## 12. Tests

### 12.1 Unit Tests — Memory Service

| Test ID | Description | Expected |
|---------|-------------|----------|
| T5-001 | `captureMemory` creates an ActivityLog record with canonical metadata | ActivityLog record exists with correct `entityType`, `action`, `metadata.memoryType` |
| T5-002 | `captureMemory` does not throw when Prisma write fails | Returns `void`, no exception propagated |
| T5-003 | `getMemory` returns entries filtered by `entityType` | Only matching entity types |
| T5-004 | `getMemory` returns entries filtered by `entityId` | Only matching entity |
| T5-005 | `getMemory` returns entries filtered by `memoryType` in metadata | Only entries with matching `metadata.memoryType` |
| T5-006 | `getMemory` returns entries filtered by tags | Only entries containing all specified tags |
| T5-007 | `getMemory` excludes dismissed entries by default | No entries with `confidence: "dismissed"` |
| T5-008 | `getMemory` includes dismissed entries when `includeDismissed=true` | Dismissed entries present |
| T5-009 | `getMemoryTimeline` returns entries sorted by createdAt desc | Most recent first |
| T5-010 | `getMemoryByUser` returns entries for a specific userId | All entries have matching `userId` |

### 12.2 Unit Tests — Confidence Workflow

| Test ID | Description | Expected |
|---------|-------------|----------|
| T5-020 | `confirmMemory` sets confidence to "confirmed" | Metadata updated in DB |
| T5-021 | `correctMemory` creates new entry with `correctionOfId` | New entry exists, original marked "corrected" |
| T5-022 | `dismissMemory` sets confidence to "dismissed" with optional reason | Metadata confidence + humanNote updated |
| T5-023 | `addMemoryNote` appends to `humanNote` | humanNote contains the appended text |

### 12.3 Integration Tests — Memory Capture from Sources

| Test ID | Description | Expected |
|---------|-------------|----------|
| T5-030 | Creating a note calls `captureMemory` with correct metadata | Note creation API response includes memory entry reference |
| T5-031 | Changing pipeline stage creates memory entry | ActivityLog has `stage_changed` entry |
| T5-032 | Recording interview outcome creates memory entry | ActivityLog has `interview_outcome` entry |
| T5-033 | Extending an offer creates memory entry | ActivityLog has `offer_extended` entry |
| T5-034 | Sending a WhatsApp message creates memory entry | ActivityLog has `message_sent` entry |
| T5-035 | Sending an email creates memory entry | ActivityLog has `email_sent` entry |
| T5-036 | Completing a voice screening creates memory entry | ActivityLog has `screening_completed` entry |
| T5-037 | Converting a prospect creates memory entry | ActivityLog has `prospect_converted` entry |
| T5-038 | Updating job requirements creates memory entry | ActivityLog has `requirement_changed` entry |

### 12.4 Integration Tests — Tenant Isolation

| Test ID | Description | Expected |
|---------|-------------|----------|
| T5-040 | Organization A cannot see Organization B memory entries | 0 cross-org entries returned |
| T5-041 | Memory capture in Org A writes Org A's organizationId | Recorded in tenant scope |
| T5-042 | User with no org membership cannot access memory API | 401 or 403 |

### 12.5 Integration Tests — Memory API Routes

| Test ID | Description | Expected |
|---------|-------------|----------|
| T5-050 | `GET /api/memory` returns paginated results | Response has `entries`, `total`, `limit`, `offset` |
| T5-051 | `GET /api/memory/timeline` returns entries for one entity | All entries match `entityType` + `entityId` |
| T5-052 | `POST /api/memory/[id]/confirm` returns 200 | Memory confidence updated |
| T5-053 | `POST /api/memory/`[id]`/correct` returns new entry ID | Original + new entry both in DB |
| T5-054 | `POST /api/memory/`[id]`/dismiss` returns 200 | Entry hidden from default queries |
| T5-055 | `POST /api/memory/`[id]`/note` returns 200 | humanNote updated |
| T5-056 | Memory routes return 401 for unauthenticated requests | No session → 401 |
| T5-057 | Memory routes return 403 for cross-tenant ID access | Cross-org ID → 404 or 403 |

---

## 13. Rollback Plan

### Soft Rollback (Feature Flag)

Memory capture is additive and non-blocking. Introduce a feature flag to disable memory capture without removing code:

```env
INSTITUTIONAL_MEMORY_ENABLED=false
```

When disabled:
- `captureMemory` is a no-op (returns immediately).
- Memory API routes return `{ enabled: false }` or appropriate empty results.
- All existing data remains in `ActivityLog`.
- The `logActivity` helper continues to work (it writes regardless; only the canonical memory capture is skipped).

### Hard Rollback (Code Revert)

If memory capture causes performance issues or data quality problems:

1. Remove `lib/memory/` directory (service, types, confidence, tags).
2. Remove `app/api/memory/` route directory.
3. Remove all `captureMemory` calls from API route handlers (notes, applications, interviews, offers, voice screening, WhatsApp, email, prospects, jobs).
4. Revert to Week 4 state.

Keep the existing `logActivity` infrastructure — it is the same under the hood and was present before Week 5.

### Rollback Triggers

| Trigger | Action |
|---------|--------|
| Memory capture causes >5% p99 latency increase on any critical API route | Soft rollback: disable capture |
| ActivityLog table grows >1GB/day (excessive for the data volume) | Soft rollback: reduce capture surface |
| Memory API routes show >1% error rate | Hard rollback: remove memory routes |
| Cross-tenant memory leak detected in production | Hard rollback: emergency |
| False positives in auto-captured memory causing recruiter confusion | Soft rollback: disable auto-capture, keep confirmation workflow |

### Data Retention

Memory entries live in `ActivityLog`, which is already part of the platform's data retention policy. No additional cleanup is needed for rollback — existing entries are inert data.

---

## 14. Acceptance Criteria

Week 5 is complete when:

### Memory Capture
1. All 10 source signals produce canonical memory entries (notes, stage changes, interview outcomes, offer outcomes, voice screening, WhatsApp, email, prospect conversion, job requirement changes, and generic activity logging).
2. `captureMemory` is a no-op when `INSTITUTIONAL_MEMORY_ENABLED=false`.
3. `captureMemory` never throws, even when the database write fails.
4. Every memory entry references its source record via `sourceModel` + `sourceId`.

### Memory Query
5. `GET /api/memory` returns paginated, filterable results.
6. `GET /api/memory/timeline` returns a chronologically sorted timeline for one entity.
7. `GET /api/memory` by `memoryType` returns only matching entries.
8. `GET /api/memory` by `tags` returns only entries containing all specified tags.
9. Dismissed entries are excluded by default from all queries.
10. `GET /api/memory?includeDismissed=true` includes dismissed entries.

### Confidence Workflow
11. `POST /api/memory/[id]/confirm` sets confidence to `"confirmed"`.
12. `POST /api/memory/[id]/correct` creates a new entry linked to the original and marks the original as corrected.
13. `POST /api/memory/[id]/dismiss` hides the entry from default queries while preserving it for audit.
14. `POST /api/memory/[id]/note` appends human-authored text without altering confidence.

### Tenant Safety
15. All memory queries are tenant-scoped via `tenantPrisma.activityLog`.
16. Cross-tenant memory access returns empty results (observe) or errors (enforce).
17. Memory capture writes the correct `organizationId` and `workspaceId` from the tenant context.
18. Unauthenticated users cannot access any memory endpoint.

### No Schema Changes
19. Zero new database tables, columns, or indexes added.
20. Zero Prisma schema modifications.
21. Zero migrations created.
22. All memory is stored in the existing `ActivityLog` model with canonical `entityType` and `action` conventions.

### Testing
23. Unit tests pass for `captureMemory`, `getMemory`, `confirmMemory`, `correctMemory`, `dismissMemory`, `addMemoryNote`.
24. Integration tests confirm memory is captured from all 10 source signals.
25. Integration tests confirm tenant isolation for memory entries.
26. Integration tests confirm memory API routes enforce auth and tenant context.

### Build & Deploy
27. `npm run build` passes with zero errors.
28. All existing tests pass (no regressions from Week 3/4).
29. Feature flag `INSTITUTIONAL_MEMORY_ENABLED` defaults to `true` — memory is active by default.

---

## Implementation Order

1. **Core types and service** — `lib/memory/types.ts`, `lib/memory/service.ts` (captureMemory, getMemory, getMemoryTimeline, getMemoryByUser, getMemoryByEntity).
2. **Tag extractor** — `lib/memory/tags.ts` — extract common tags from entity type, action, and metadata values.
3. **Confidence workflow** — `lib/memory/confidence.ts` — confirm, correct, dismiss, addNote functions.
4. **API routes** — `app/api/memory/route.ts` (GET), `app/api/memory/timeline/route.ts` (GET), `app/api/memory/[id]/confirm/route.ts`, `app/api/memory/[id]/correct/route.ts`, `app/api/memory/[id]/dismiss/route.ts`, `app/api/memory/[id]/note/route.ts`.
5. **Source integration — Notes** — Add `captureMemory` call to note create/update handler.
6. **Source integration — Pipeline** — Add `captureMemory` call to application stage change handler.
7. **Source integration — Interviews** — Add `captureMemory` call to interview outcome handler.
8. **Source integration — Offers** — Add `captureMemory` call to offer status change handler.
9. **Source integration — Voice Screening** — Add `captureMemory` call to screening callback and update handlers.
10. **Source integration — WhatsApp** — Add `captureMemory` call to message send handler.
11. **Source integration — Email** — Add `captureMemory` call to email send handler.
12. **Source integration — Prospects** — Add `captureMemory` call to prospect conversion handler.
13. **Source integration — Jobs** — Add `captureMemory` call to job update handler (requirement changes).
14. **Feature flag** — Add `INSTITUTIONAL_MEMORY_ENABLED` env var check in service.
15. **Unit tests** — All 23 memory service and confidence tests.
16. **Integration tests** — All 28 capture, isolation, and API route tests.
17. **Build and smoke test** — `npm run build`, manual memory timeline verification on candidate and job pages.
