# WEEK 6 — CONVERSATION CAPTURE PLAN

## Purpose

Week 6 builds a **conversation capture layer** that unifies every recruiter–candidate interaction into a structured, queryable, and tenant-safe timeline. The platform already generates rich conversation artifacts across voice screenings, WhatsApp messages, emails, and recruiter notes — but each channel stores data in isolation with no unified conversation model, no cross-channel timeline, and no structured insight extraction.

Week 6 does **not** introduce a new `Conversation` table, inbound WhatsApp webhooks, live call recording, or automated outbound messaging. Instead, it models conversations as a **virtual aggregation** over existing records, captures structured insights from each channel, and surfaces actionable follow-up tasks — all within the existing schema.

## Principles

1. **No schema changes** — All conversation data is stored in existing models (`ActivityLog`, `Note`, `VoiceScreening`, `WhatsAppMessage`, `EmailLog`) using standardized `metadata` conventions.
2. **Tenant-safe** — All conversation queries and captures go through the Week 3/4 repository layer.
3. **Capture-first, conversation-second** — Insights are derived from existing data as it arrives; no new ingestion pipelines.
4. **Channel-agnostic** — Voice, WhatsApp, email, and notes are unified under a single `conversationId` convention in metadata, not in a new table.
5. **Human-in-the-loop** — Every auto-extracted insight can be confirmed, corrected, or dismissed using the Week 5 confidence workflow.
6. **No outbound automation** — No automatic WhatsApp sends, no automatic call placing. Capture only.

---

## 1. Conversation Capture Architecture

### 1.1 Virtual Conversation Model

A "conversation" is not a database row. It is a **grouping key** (`conversationId`) stored in the `metadata` JSON of `ActivityLog` entries (and optionally in channel-specific models' `metadata` fields). All entries sharing the same `conversationId` form a conversation timeline.

```
conversationId = "conv_<candidateId>_<channel>_<date>"
```

Components of `conversationId`:

| Part | Source | Example |
|------|--------|---------|
| Prefix | Literal `"conv_"` | `conv_` |
| Candidate ID | `Candidate.id` | `clx12345` |
| Channel | `"voice"` / `"whatsapp"` / `"email"` / `"note"` | `whatsapp` |
| Date | `YYYYMMDD` of first interaction | `20260617` |

Full example: `conv_clx12345_whatsapp_20260617`

This convention allows:
- Grouping all messages in a WhatsApp exchange under one key
- Associating a voice screening + its transcript capture under one key
- No new table, no schema change, no migration
- Simple lookup: `metadata.path("conversationId").equals("conv_...")`

### 1.2 Conversation Capture Flow

```
Inbound/outbound event
        │
        ▼
┌─────────────────────────────┐
│ Channel handler             │
│ (existing API route)        │
│                             │
│ 1. Detect/create conversation│
│ 2. Store/update channel rec │
│ 3. Extract insights         │
│ 4. captureMemory()          │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ ActivityLog                 │
│ • entityType: channel       │
│ • entityId: channel rec ID  │
│ • action: message_sent /    │
│   screening_completed etc.  │
│ • metadata: {               │
│     conversationId,         │
│     summary,                │
│     extractedInsights,      │
│     followUpTasks,          │
│     ...                     │
│   }                         │
└─────────────────────────────┘
```

### 1.3 Conversation Query Service

A new read-side service (`lib/conversation/service.ts`) provides:

- `getConversation(ctx, conversationId)` — Returns all memory entries sharing a `conversationId`, sorted chronologically. Pulls from `activityLog` only (no cross-model JOIN needed for the timeline).
- `getConversationsByCandidate(ctx, candidateId, options?)` — Returns all unique `conversationId` values for a candidate, with the latest entry's timestamp, channel, and summary.
- `getConversationsByChannel(ctx, channel, options?)` — Filter by entity type (`"voiceScreening"`, `"whatsapp"`, `"email"`, `"note"`).

No new DB queries beyond `tenantPrisma.activityLog` with metadata JSON filters.

### 1.4 Conversation Memory Metadata Shape

Every conversation-derived memory entry follows this `metadata` convention:

```typescript
{
  // Standard memory fields
  memoryType: "candidate",
  summary: string,
  details?: string,
  sourceModel: string,
  sourceId: string,
  tags: string[],
  confidence: "auto",
  importance: "medium",

  // Conversation-specific fields
  conversationId: string,           // Grouping key across channels
  channel: "voice" | "whatsapp" | "email" | "note" | "screening",
  direction: "inbound" | "outbound" | "system",
  participantRole: "recruiter" | "candidate" | "system" | "client",
  extractedInsights?: ExtractedInsight[],  // Structured data from content
  followUpTasks?: FollowUpTask[],          // Derived action items
  hasCallRecording?: boolean,              // For voice channel only
  recordingUrl?: string,                  // For voice channel only
}
```

---

## 2. Typed Recruiter Note Capture

### 2.1 Problem

Today, notes are unstructured text (`Note.body`). Recruiters type free-form observations, preferences, and decisions. The Week 5 memory capture extracts keyword tags but cannot derive structured insights (e.g., "candidate prefers remote", "salary expectation is ₹30L", "notice period is 90 days") from free text.

### 2.2 Solution

Add a **recruiter note enhancement** layer that runs after a note is created. It does not alter the note itself — it extracts structured data from the note body and stores it as memory entries.

**Integration point:** `app/api/candidates/[id]/notes/route.ts` (POST) — after existing `captureMemory` call.

### 2.3 Note Insight Extractor

**`lib/conversation/note-insights.ts`** — Stateless extractor functions:

```typescript
export function extractInsightsFromNote(noteBody: string): ExtractedInsight[] {
  const insights: ExtractedInsight[] = [];
  const lower = noteBody.toLowerCase();

  // Salary expectations
  const salaryPatterns = [
    /(?:expect(?:ed|s)?|looking for|asking|quoted)\s*(?:ctc|salary|compensation|package)?\s*(?:of\s*)?(?:₹|rs\.?|inr)?\s*(\d+)\s*(?:l|lpa|lakhs?|lakhs?\s*per\s*annum)?/gi,
    /(?:ctc|salary|package)\s*(?:of\s*)?(?:₹|rs\.?|inr)?\s*(\d+\.?\d*)\s*(?:l|lpa|lakh)/gi,
  ];
  for (const pattern of salaryPatterns) {
    const match = pattern.exec(noteBody);
    if (match) {
      insights.push({
        type: "salary_expectation",
        value: match[1],
        unit: "L",
        source: "recruiter_note",
        confidence: match[0].length > 20 ? "high" : "medium",
      });
    }
  }

  // Notice period
  const noticePatterns = [
    /(?:notice period|notice|np)\s*(?:is|of|:)?\s*(\d+)\s*(?:days?|months?|weeks?)/gi,
    /(\d+)\s*(?:days?|months?|weeks?)\s*(?:notice|notice period)/gi,
  ];
  for (const pattern of noticePatterns) {
    const match = pattern.exec(noteBody);
    if (match) {
      insights.push({
        type: "notice_period",
        value: match[1],
        unit: match[0].toLowerCase().includes("month") ? "months" : match[0].toLowerCase().includes("week") ? "weeks" : "days",
        source: "recruiter_note",
        confidence: "medium",
      });
    }
  }

  // Relocation preference
  if (/relocate|relocation|willing to move|not willing to move|open to relocate/i.test(lower)) {
    const willing = /(?:willing|open|ready|flexible|can).*(?:relocate|move|relocation)/i.test(lower);
    const notWilling = /(?:not willing|not open|unable|cannot|can't).*(?:relocate|move|relocation)/i.test(lower);
    insights.push({
      type: "relocation_preference",
      value: notWilling ? "not_willing" : willing ? "willing" : "mentioned",
      source: "recruiter_note",
      confidence: "medium",
    });
  }

  // Preferred location / city
  const cityPattern = /(?:prefer|looking for|location|based in|in)\s*(?:remote|bangalore|mumbai|pune|delhi|chennai|hyderabad|gurgaon|noida|kolkata|ahmedabad)/gi;
  const cityMatch = cityPattern.exec(noteBody);
  if (cityMatch) {
    insights.push({
      type: "preferred_location",
      value: cityMatch[0].split(/\s+/).pop()!,
      source: "recruiter_note",
      confidence: "medium",
    });
  }

  // Skill mentions
  const skillKeywords = ["excellent", "strong", "good", "proficient", "expert", "skilled", "experienced in"];
  for (const kw of skillKeywords) {
    const kwRegex = new RegExp(`\\b${kw}\\b[^.]*\\.`, "gi");
    const match = kwRegex.exec(noteBody);
    if (match) {
      // Extract the sentence after the keyword as a skill signal
      insights.push({
        type: "skill_signal",
        value: match[0].trim(),
        source: "recruiter_note",
        confidence: "low",
      });
    }
  }

  // Communication rating
  if (/communication|english|verbal|spoken/i.test(lower)) {
    const ratingMatch = /(?:communication|english)\s*(?:is|:)?\s*(good|excellent|average|poor|fluent|basic)/i.exec(noteBody);
    insights.push({
      type: "communication_assessment",
      value: ratingMatch?.[1] ?? "mentioned",
      source: "recruiter_note",
      confidence: ratingMatch ? "medium" : "low",
    });
  }

  return insights;
}
```

### 2.4 Insight Memory Capture

After a note is created and its existing `captureMemory` call fires, also call:

```typescript
const insights = extractInsightsFromNote(body.body ?? "");
if (insights.length > 0) {
  for (const insight of insights) {
    captureMemory({
      userId: user.id,
      entityType: "note",
      entityId: note.id,
      action: "insight_extracted",
      metadata: {
        memoryType: "candidate",
        summary: `Insight: ${insight.type} = ${insight.value}`,
        sourceModel: "note",
        sourceId: note.id,
        tags: ["insight", insight.type, insight.confidence],
        confidence: "auto",
        extractedInsight: insight,
        importance: insight.confidence === "high" ? "high" : "medium",
      },
    });
  }
}
```

### 2.5 ExtractedInsight Type

Add to `lib/conversation/types.ts`:

```typescript
export type ExtractedInsight = {
  type: InsightType;
  value: string;
  unit?: string;
  source: "recruiter_note" | "voice_transcript" | "whatsapp_message" | "email_body" | "ai_screening";
  confidence: "high" | "medium" | "low";
};

export type InsightType =
  | "salary_expectation"
  | "notice_period"
  | "relocation_preference"
  | "preferred_location"
  | "skill_signal"
  | "communication_assessment"
  | "availability"
  | "interview_feedback"
  | "candidate_preference"
  | "client_feedback_signal"
  | "offer_concern"
  | "general_observation";
```

---

## 3. WhatsApp-Style Note Capture

### 3.1 Problem

WhatsApp messages are the richest source of informal candidate signals — preferences, availability, counter-offers, concerns — but the current code only logs outgoing messages with `captureMemory({ memoryType: "candidate", action: "message_sent" })`. No insight extraction happens from WhatsApp content.

### 3.2 Solution

After a WhatsApp message is sent (and logged), run the same insight extractor on the message body. The same `extractInsightsFromNote()` function works for WhatsApp text because both are natural language.

**Integration point:** `app/api/whatsapp/send/route.ts` (POST) — after existing `captureMemory` call.

```typescript
const insights = extractInsightsFromNote(messageBody ?? "");
if (insights.length > 0) {
  for (const insight of insights) {
    captureMemory({
      userId: user.id,
      entityType: "whatsapp",
      entityId: message.id,
      action: "message_sent",
      metadata: {
        memoryType: "candidate",
        summary: `Insight from WhatsApp: ${insight.type} = ${insight.value}`,
        conversationId: `conv_${candidateId}_whatsapp_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
        channel: "whatsapp",
        direction: "outbound",
        participantRole: "recruiter",
        sourceModel: "whatsAppMessage",
        sourceId: message.id,
        tags: ["insight", insight.type, "whatsapp"],
        confidence: "auto",
        extractedInsight: insight,
        importance: "medium",
      },
    });
  }
}
```

### 3.3 No Inbound Webhook

Inbound WhatsApp messages are **not implemented** in Week 6. The plan assumes a future webhook handler will follow the same pattern:

```
Inbound webhook → create WhatsAppMessage(direction: "INBOUND") → extractInsights → captureMemory
```

The `direction: "INBOUND"` enum value already exists on `WhatsAppMessage` and is ready for this future integration. Week 6 only adds insight extraction for outgoing messages.

---

## 4. Voice Transcript Capture

### 4.1 Problem

Voice screening callbacks (`/api/voice-screening/callback`) already fetch ElevenLabs transcripts and store `transcript`, `aiSummary`, `aiScore`, and `aiScoreBreakdown` on the `VoiceScreening` record. However, no memory entries are created from this data, and no structured insights are extracted from the transcript.

### 4.2 Solution

Add insight extraction from voice screening transcripts when they arrive via the callback or fetch-transcript endpoint.

**`lib/conversation/voice-insights.ts`** — Transcript-specific extractor:

```typescript
import type { ExtractedInsight } from "@/lib/conversation/types";

export function extractInsightsFromTranscript(
  transcript: string,
  aiSummary?: string | null,
  aiScore?: number | null,
  scoreBreakdown?: Record<string, number> | null,
): ExtractedInsight[] {
  const insights: ExtractedInsight[] = [];

  // Score signal
  if (aiScore != null) {
    insights.push({
      type: aiScore >= 80 ? "candidate_preference" : "general_observation",
      value: `AI Score: ${aiScore}/100`,
      source: "voice_transcript",
      confidence: aiScore >= 80 || aiScore <= 40 ? "high" : "medium",
    });
  }

  // Score breakdown as individual insights
  if (scoreBreakdown) {
    for (const [criterion, score] of Object.entries(scoreBreakdown)) {
      insights.push({
        type: "skill_signal",
        value: `${criterion}: ${score}/100`,
        source: "voice_transcript",
        confidence: "medium",
      });
    }
  }

  // Summary-based extraction
  const combinedText = [transcript, aiSummary].filter(Boolean).join(" ");
  const lower = combinedText.toLowerCase();

  // Salary mentions in transcript
  const salaryMatch = /(?:₹|rs\.?|inr|rupees)?\s*(\d+)\s*(?:l|lpa|lakh|lakhs)/gi.exec(combinedText);
  if (salaryMatch) {
    insights.push({
      type: "salary_expectation",
      value: salaryMatch[1],
      unit: "L",
      source: "voice_transcript",
      confidence: "medium",
    });
  }

  // Notice period mentions
  const noticeMatch = /(\d+)\s*(?:days?|weeks?|months?)\s*(?:notice|notice period)/gi.exec(combinedText);
  if (noticeMatch) {
    insights.push({
      type: "notice_period",
      value: noticeMatch[1],
      unit: noticeMatch[0].toLowerCase().includes("month") ? "months" : noticeMatch[0].toLowerCase().includes("week") ? "weeks" : "days",
      source: "voice_transcript",
      confidence: "medium",
    });
  }

  // Relocation mentions
  if (/relocate|relocation|willing to move|location preference/i.test(lower)) {
    insights.push({
      type: "relocation_preference",
      value: "discussed",
      source: "voice_transcript",
      confidence: "low",
    });
  }

  // Candidate sentiment signals
  if (/excited|interested|enthusiastic|eager|motivated/i.test(lower)) {
    insights.push({
      type: "candidate_preference",
      value: "positive_sentiment",
      source: "voice_transcript",
      confidence: "medium",
    });
  }
  if /(?:not interested|decline|not a good fit|salary issue|too low)/i.test(lower)) {
    insights.push({
      type: "candidate_preference",
      value: "negative_sentiment",
      source: "voice_transcript",
      confidence: "medium",
    });
  }

  return insights;
}
```

### 4.3 Integration Points

**`app/api/voice-screening/callback/route.ts`** — After ElevenLabs conversation data is stored:

```typescript
// Inside fetchElevenLabsConversation(), after updateData is applied:
const insights = extractInsightsFromTranscript(transcriptText, fullSummary, overallScore, scoreBreakdown);
for (const insight of insights) {
  captureMemoryWithContext(tenantContext, {
    userId: null, // system action
    entityType: "voiceScreening",
    entityId: screening.id,
    action: "call_outcome",
    metadata: {
      memoryType: "candidate",
      summary: `Voice insight: ${insight.type} = ${insight.value}`,
      conversationId: `conv_${screening.candidateId}_voice_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      channel: "voice",
      direction: "system",
      participantRole: "candidate",
      sourceModel: "voiceScreening",
      sourceId: screening.id,
      tags: ["insight", insight.type, "voice-transcript"],
      confidence: "auto",
      extractedInsight: insight,
      hasCallRecording: !!screening.recordingUrl,
      recordingUrl: screening.recordingUrl ?? undefined,
      importance: insight.confidence === "high" ? "high" : "medium",
    },
  });
}
```

**`app/api/voice-screening/fetch-transcript/route.ts`** — After transcript is fetched and stored, apply the same extraction.

### 4.4 Transcript Summary Memory

Additionally, create a high-level memory entry for the transcript summary itself (not just individual insights):

```typescript
captureMemoryWithContext(tenantContext, {
  userId: null,
  entityType: "voiceScreening",
  entityId: screening.id,
  action: "screening_completed",
  metadata: {
    memoryType: "candidate",
    summary: `Voice screening: ${fullSummary?.slice(0, 200) ?? "No summary available"}`,
    details: fullSummary ?? null,
    conversationId: `conv_${screening.candidateId}_voice_${dateStr}`,
    channel: "voice",
    direction: "system",
    participantRole: "candidate",
    sourceModel: "voiceScreening",
    sourceId: screening.id,
    tags: ["voice-screening", "transcript", `score-${overallScore ?? "unknown"}`],
    confidence: "auto",
    sentiment: overallScore != null && overallScore >= 80 ? "positive" : overallScore != null && overallScore <= 40 ? "negative" : "neutral",
    importance: overallScore != null && overallScore >= 80 ? "high" : "medium",
  },
});
```

---

## 5. Candidate Screening Extraction

### 5.1 Problem

The AI screening route (`/api/ai/screen`) computes match scores and stores `aiReport` JSON on the `Application` record, but no structured insights are extracted or persisted as memory entries. The existing `captureMemory` call only logs `match_scored` with a summary — no individual skill/experience/salary insights.

### 5.2 Solution

Add a screening insight extractor that parses the `aiReport` JSON (or the computed screening data) and creates individual memory entries for each signal.

**`lib/conversation/screening-insights.ts`**:

```typescript
import type { ExtractedInsight } from "@/lib/conversation/types";

export function extractInsightsFromScreening(screeningData: {
  score?: number;
  skillsMatch?: number;
  experienceMatch?: number;
  salaryFit?: string;
  report?: Record<string, any> | null;
}): ExtractedInsight[] {
  const insights: ExtractedInsight[] = [];

  if (screeningData.score != null) {
    insights.push({
      type: "skill_signal",
      value: `AI Match Score: ${screeningData.score}/100`,
      source: "ai_screening",
      confidence: "high",
    });
  }

  if (screeningData.skillsMatch != null) {
    insights.push({
      type: "skill_signal",
      value: `Skills Match: ${screeningData.skillsMatch}%`,
      source: "ai_screening",
      confidence: "high",
    });
  }

  if (screeningData.experienceMatch != null) {
    insights.push({
      type: "general_observation",
      value: `Experience Match: ${screeningData.experienceMatch}%`,
      source: "ai_screening",
      confidence: "high",
    });
  }

  if (screeningData.salaryFit) {
    const salaryInsightType = screeningData.salaryFit.toLowerCase().includes("within") || screeningData.salaryFit.toLowerCase().includes("fit")
      ? "salary_expectation"
      : "general_observation";
    insights.push({
      type: salaryInsightType,
      value: screeningData.salaryFit,
      source: "ai_screening",
      confidence: "medium",
    });
  }

  // Parse structured report JSON if present
  if (screeningData.report) {
    const report = screeningData.report;
    if (report.matchedSkills && Array.isArray(report.matchedSkills)) {
      for (const skill of report.matchedSkills.slice(0, 5)) {
        insights.push({
          type: "skill_signal",
          value: `Matched Skill: ${skill}`,
          source: "ai_screening",
          confidence: "high",
        });
      }
    }
    if (report.missingSkills && Array.isArray(report.missingSkills)) {
      for (const skill of report.missingSkills.slice(0, 3)) {
        insights.push({
          type: "skill_signal",
          value: `Missing Skill: ${skill}`,
          source: "ai_screening",
          confidence: "medium",
        });
      }
    }
    if (report.gaps && Array.isArray(report.gaps)) {
      for (const gap of report.gaps) {
        insights.push({
          type: "general_observation",
          value: `Gap: ${gap}`,
          source: "ai_screening",
          confidence: "medium",
        });
      }
    }
  }

  return insights;
}
```

### 5.3 Integration Point

**`app/api/ai/screen/route.ts`** — After the screening score is computed and stored:

```typescript
const insights = extractInsightsFromScreening({
  score: screeningResult.score,
  skillsMatch: screeningResult.skillsMatch,
  experienceMatch: screeningResult.experienceMatch,
  salaryFit: screeningResult.salaryFit,
  report: application.aiReport as Record<string, any> | null,
});

for (const insight of insights) {
  captureMemory({
    userId: user.id,
    entityType: "application",
    entityId: application.id,
    action: "match_scored",
    metadata: {
      memoryType: "candidate",
      summary: `Screening insight: ${insight.type} = ${insight.value}`,
      conversationId: `conv_${application.candidateId}_screening_${dateStr}`,
      channel: "screening",
      direction: "system",
      participantRole: "system",
      sourceModel: "application",
      sourceId: application.id,
      tags: ["insight", insight.type, "ai-screening"],
      confidence: "auto",
      extractedInsight: insight,
      importance: insight.confidence === "high" ? "high" : "medium",
    },
  });
}
```

### 5.4 AI Screening Summary Memory

Also create a summary memory entry for the screening overall:

```typescript
captureMemory({
  userId: user.id,
  entityType: "application",
  entityId: application.id,
  action: "match_scored",
  metadata: {
    memoryType: "candidate",
    summary: `AI Screening: Score ${score}/100 — ${candidateName} for ${jobTitle}`,
    details: `Skills: ${skillsMatch}% | Experience: ${experienceMatch}% | Salary: ${salaryFit}`,
    conversationId: `conv_${candidateId}_screening_${dateStr}`,
    channel: "screening",
    direction: "system",
    participantRole: "system",
    sourceModel: "application",
    sourceId: application.id,
    tags: ["ai-screening", "match-score", insightTags],
    confidence: "auto",
    sentiment: score >= 80 ? "positive" : score <= 40 ? "negative" : "neutral",
    importance: score >= 80 ? "high" : "medium",
  },
});
```

---

## 6. Memory Capture from Conversations

### 6.1 Comprehensive Capture Points

Every existing source that touches a candidate should also create a conversation-grouped memory entry. The following table shows the current capture status and the Week 6 additions:

| Source | Current Capture | Week 6 Addition |
|--------|----------------|----------------|
| Note created | `note_added` (memoryType: candidate) | Add `conversationId`, `extractedInsights` to metadata |
| WhatsApp sent | `message_sent` (memoryType: candidate) | Add `conversationId`, `channel`, `direction`, `extractedInsights` |
| Voice screening callback | `call_outcome` (memoryType: candidate) | Add `conversationId`, `channel`, `extractedInsights` from transcript |
| Voice transcript fetched | `screening_completed` (memoryType: candidate) | Add `conversationId`, `extractedInsights` from transcript |
| AI screening scored | `match_scored` (memoryType: candidate) | Add `conversationId`, `channel: "screening"`, `extractedInsights` |
| Email sent | `email_sent` (memoryType: candidate) | Add `conversationId`, `channel`, `direction` |
| Pipeline stage changed | `stage_changed` (memoryType: decision) | Add `conversationId` | 
| Interview outcome | `interview_outcome` (memoryType: decision) | Add `conversationId` |
| Offer outcome | `offer_accepted/rejected` (memoryType: outcome) | Add `conversationId` |
| Prospect converted | `prospect_converted` (memoryType: candidate) | Add `conversationId` |

### 6.2 Conversation Timeline API

**`GET /api/conversations/timeline`** — Returns a chronologically sorted list of memory entries for a given `conversationId` or `candidateId`.

Query parameters:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | string | no | If provided, returns entries for that conversation |
| `candidateId` | string | no | If provided, returns all conversations for the candidate (grouped) |
| `channels` | string (csv) | no | Filter: `voice,whatsapp,email,note,screening` |
| `insightsOnly` | boolean | no | If true, only return entries with `extractedInsights` |
| `limit` | int | no | Default 50 |
| `offset` | int | no | Default 0 |

Response:
```json
{
  "conversations": [
    {
      "conversationId": "conv_clx12345_whatsapp_20260617",
      "channel": "whatsapp",
      "entryCount": 3,
      "latestAt": "2026-06-17T14:30:00Z",
      "latestSummary": "WhatsApp sent: 'We have an exciting opportunity...'",
      "insightCount": 2
    }
  ],
  "totalConversations": 5,
  "entries": [
    {
      "id": "clx...",
      "conversationId": "conv_clx12345_whatsapp_20260617",
      "entityType": "whatsapp",
      "entityId": "clx...",
      "action": "message_sent",
      "summary": "WhatsApp sent...",
      "channel": "whatsapp",
      "direction": "outbound",
      "participantRole": "recruiter",
      "extractedInsights": [...],
      "createdAt": "2026-06-17T14:30:00Z"
    }
  ],
  "totalEntries": 10,
  "limit": 50,
  "offset": 0
}
```

### 6.3 API Route

**`app/api/conversations/timeline/route.ts`** (GET):

Uses `tenantPrisma.activityLog` with metadata JSON filtering:

```typescript
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  const candidateId = url.searchParams.get("candidateId");
  const channels = url.searchParams.get("channels")?.split(",").filter(Boolean);
  const insightsOnly = url.searchParams.get("insightsOnly") === "true";
  const limit = parseInt(url.searchParams.get("limit") ?? "50");
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  if (!conversationId && !candidateId) {
    return NextResponse.json({ error: "conversationId or candidateId required" }, { status: 400 });
  }

  // Build where clause
  const where: any = {};

  if (conversationId) {
    where.metadata = { path: ["conversationId"], equals: conversationId };
  }

  if (candidateId) {
    // entityType = candidate entity types, entityId matches candidate relations
    // OR entityId = candidateId for direct candidate entries
    where.OR = [
      { entityType: { in: ["candidate", "application"] }, entityId: { startsWith: candidateId } },
    ];
    // For candidate activities, we use the candidateId stored in metadata or entityId pattern
    where.metadata = {
      ...where.metadata,
      path: ["conversationId"],
      startsWith: `conv_${candidateId}`,
    };
  }

  if (channels && channels.length > 0) {
    where.entityType = { in: channels };
  }

  if (insightsOnly) {
    where.metadata = {
      ...(where.metadata as any),
      path: ["extractedInsights"],
      not: null,
    };
  }

  const [entries, total] = await Promise.all([
    (tenantPrisma.activityLog as any).withContext(ctx).findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    (tenantPrisma.activityLog as any).withContext(ctx).count({ where }),
  ]);

  return NextResponse.json({
    conversations: [], // Populated by conversation grouping logic
    totalConversations: 0,
    entries,
    totalEntries: total,
    limit,
    offset,
  });
}
```

---

## 7. Follow-Up Task Recommendations

### 7.1 Problem

Recruiters manually track follow-up actions: "call candidate next week", "send salary details", "check reference", "schedule interview". These are currently lost in free-text notes with no structured task system.

### 7.2 Solution

Derive follow-up task recommendations from conversation content. Tasks are not stored in a new table — they are memory entries with `action: "task_recommended"` and a `followUpTask` metadata field.

**`lib/conversation/follow-up.ts`** — Task derivation:

```typescript
import type { ExtractedInsight } from "@/lib/conversation/types";

export type FollowUpTask = {
  type: TaskType;
  summary: string;
  priority: "high" | "medium" | "low";
  dueOffsetDays?: number;
  sourceModel: string;
  sourceId: string;
};

export type TaskType =
  | "schedule_interview"
  | "send_salary_details"
  | "check_references"
  | "follow_up_call"
  | "send_offer"
  | "clarify_requirement"
  | "update_candidate_profile"
  | "share_feedback_with_client"
  | "general_reminder";

export function deriveFollowUpTasks(
  insights: ExtractedInsight[],
  source: { model: string; id: string },
): FollowUpTask[] {
  const tasks: FollowUpTask[] = [];

  for (const insight of insights) {
    // Salary discussed → recommend sending salary details
    if (insight.type === "salary_expectation") {
      tasks.push({
        type: "send_salary_details",
        summary: `Send detailed salary breakup to candidate (expectation: ${insight.value} ${insight.unit ?? ""})`,
        priority: "medium",
        sourceModel: source.model,
        sourceId: source.id,
      });
    }

    // Notice period mentioned → recommend follow-up call near end
    if (insight.type === "notice_period") {
      tasks.push({
        type: "follow_up_call",
        summary: `Follow up near end of ${insight.value} ${insight.unit ?? ""} notice period`,
        priority: "low",
        dueOffsetDays: parseInt(insight.value) * (insight.unit === "months" ? 30 : insight.unit === "weeks" ? 7 : 1) - 7,
        sourceModel: source.model,
        sourceId: source.id,
      });
    }

    // Relocation discussed → clarify details
    if (insight.type === "relocation_preference" && insight.value === "mentioned") {
      tasks.push({
        type: "clarify_requirement",
        summary: "Clarify relocation preference and timeline",
        priority: "medium",
        sourceModel: source.model,
        sourceId: source.id,
      });
    }

    // Positive interview → schedule next round
    if (insight.type === "candidate_preference" && insight.value === "positive_sentiment") {
      tasks.push({
        type: "schedule_interview",
        summary: "Schedule next interview round based on positive outcome",
        priority: "high",
        sourceModel: source.model,
        sourceId: source.id,
      });
    }
  }

  return tasks;
}

export function deriveFollowUpsFromNote(noteBody: string, source: { model: string; id: string }): FollowUpTask[] {
  const tasks: FollowUpTask[] = [];
  const lower = noteBody.toLowerCase();

  // Schedule interview patterns
  if (/schedule|arrange|set up|book/.test(lower) && /interview|call|meeting|discussion/.test(lower)) {
    tasks.push({
      type: "schedule_interview",
      summary: "Schedule interview as discussed",
      priority: "high",
      sourceModel: source.model,
      sourceId: source.id,
    });
  }

  // Follow-up patterns
  if (/follow up|circle back|reach out|touch base|get back/.test(lower)) {
    const timeMatch = /(?:in|within|after)\s+(\d+)\s*(days?|weeks?)/i.exec(noteBody);
    tasks.push({
      type: "follow_up_call",
      summary: "Follow up with candidate as noted",
      priority: "medium",
      dueOffsetDays: timeMatch ? parseInt(timeMatch[1]) * (timeMatch[2].toLowerCase().startsWith("week") ? 7 : 1) : undefined,
      sourceModel: source.model,
      sourceId: source.id,
    });
  }

  // Reference check patterns
  if (/reference|ref check|background|verification/.test(lower)) {
    tasks.push({
      type: "check_references",
      summary: "Complete reference/background check",
      priority: "medium",
      sourceModel: source.model,
      sourceId: source.id,
    });
  }

  // Offer patterns
  if (/offer|roll out|release offer|extend offer/.test(lower)) {
    tasks.push({
      type: "send_offer",
      summary: "Prepare and send offer letter",
      priority: "high",
      sourceModel: source.model,
      sourceId: source.id,
    });
  }

  // Client feedback
  if (/feedback|update|share with client/.test(lower)) {
    tasks.push({
      type: "share_feedback_with_client",
      summary: "Share candidate feedback with client",
      priority: "medium",
      sourceModel: source.model,
      sourceId: source.id,
    });
  }

  return tasks;
}
```

### 7.3 Task Memory Capture

Derive and persist follow-up tasks after any conversation event:

```typescript
// After notes, WhatsApp, voice, screening, etc.
const tasks = deriveFollowUpTasks(insights, { model: "note", id: note.id });
const textTasks = deriveFollowUpsFromNote(body.body ?? "", { model: "note", id: note.id });
const allTasks = [...tasks, ...textTasks];

for (const task of allTasks) {
  captureMemory({
    userId: user.id,
    entityType: "note",
    entityId: note.id,
    action: "task_recommended",
    metadata: {
      memoryType: "recruiter",
      summary: `Task: ${task.summary}`,
      details: null,
      sourceModel: task.sourceModel,
      sourceId: task.sourceId,
      tags: ["task", task.type, task.priority],
      confidence: "auto",
      followUpTask: task,
      importance: task.priority === "high" ? "high" : task.priority === "medium" ? "medium" : "low",
    },
  });
}
```

### 7.4 Task Query API

**`GET /api/conversations/tasks`** — Returns recommended follow-up tasks.

Query parameters:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `candidateId` | string | — | Filter tasks for a specific candidate |
| `priority` | string | — | Filter: `high`, `medium`, `low` |
| `status` | string | `pending` | `pending` or `completed` (completed tasks are those with confidence `"dismissed"` or linked to a correction) |
| `limit` | int | 50 | Max results |
| `offset` | int | 0 | Pagination |

Response:
```json
{
  "tasks": [
    {
      "memoryEntryId": "clx...",
      "task": {
        "type": "schedule_interview",
        "summary": "Schedule interview as discussed",
        "priority": "high",
        "sourceModel": "note",
        "sourceId": "clx..."
      },
      "candidateId": "clx...",
      "createdAt": "2026-06-17T14:30:00Z",
      "confidence": "auto"
    }
  ],
  "total": 3,
  "limit": 50,
  "offset": 0
}
```

---

## 8. Human Review / Confirmation Workflow

### 8.1 Reuse Week 5 Confidence Workflow

Every auto-captured insight and follow-up task is a memory entry with `confidence: "auto"`. Recruiters and admins can confirm, correct, or dismiss them using the existing Week 5 API routes:

| Action | Route | Effect |
|--------|-------|--------|
| Confirm | `POST /api/memory/[id]/confirm` | `confidence → "confirmed"` — insight is accepted as accurate |
| Correct | `POST /api/memory/[id]/correct` | Original marked `"corrected"`, new entry created with corrected values |
| Dismiss | `POST /api/memory/[id]/dismiss` | `confidence → "dismissed"` — excluded from default queries |
| Add note | `POST /api/memory/[id]/note` | Appends human-authored annotation |

### 8.2 Insight-Specific Workflow

For extracted insights in particular, the correction endpoint should accept fields specific to insight data:

```typescript
// POST /api/memory/[id]/correct
// Body for insight corrections:
{
  "summary": "Corrected insight text",
  "details": "Additional context",
  "tags": ["corrected-insight"],
  "extractedInsight": {       // Optional: corrected insight values
    "type": "salary_expectation",
    "value": "35",
    "unit": "L",
    "confidence": "confirmed"
  }
}
```

The correction handler in `lib/memory/confidence.ts` already merges whatever fields are provided. Adding `extractedInsight` to the corrected metadata is handled by the existing generic merge logic — no change needed.

### 8.3 UI Signals (Not Implemented in Week 6)

- Badge on conversation entries: "AI-extracted" vs "Confirmed" vs "Corrected"
- Insight cards with ✓ (confirm), ✎ (correct), ✕ (dismiss) actions
- Task list with checkboxes for "mark as done" (implemented as `dismissMemory` with reason: "completed")
- Hover tooltip showing original auto-extracted value when corrected value differs

---

## 9. Tenant-Safe APIs

### 9.1 Tenant Architecture Reuse

All Week 6 APIs inherit tenant safety from the existing architecture:

| Component | Tenant Mechanism | Status |
|-----------|-----------------|--------|
| `tenantPrisma.activityLog` | Automatic `organizationId` injection + `withContext(ctx)` | ✅ Week 3/4 |
| `resolveTenantContext()` | Session → user → org/workspace resolution | ✅ Week 3 |
| `resolveRecordTenantContext()` | Record-derived context for background jobs | ✅ Week 4 |
| `requireUser()` / `requireRole()` | Session guard + role check | ✅ Pre-Week 1 |
| `getTenantWhere()` | Portal context for client/candidate sub-scoping | ✅ Week 4 |
| Middleware | Auth + organizationId token check | ✅ Week 4 |
| Enforcement mode | `P2025` thrown for cross-tenant update/delete in enforce mode | ✅ Week 4 |

### 9.2 New API Routes (Tenant-Safe)

| Route | Method | Auth | Tenant Mechanism |
|-------|--------|------|-----------------|
| `GET /api/conversations/timeline` | GET | Authenticated | `resolveTenantContext()` → `tenantPrisma.activityLog.withContext(ctx)` |
| `GET /api/conversations/tasks` | GET | Authenticated | `resolveTenantContext()` → `tenantPrisma.activityLog.withContext(ctx)` |
| `GET /api/conversations/candidates` | GET | Authenticated | `resolveTenantContext()` → `tenantPrisma.activityLog.withContext(ctx)` |

### 9.3 No New Tenant Concerns

- All conversation memory entries are `activityLog` records, which already have `organizationId` + `workspaceId` stamped by `tenantPrisma`.
- No cross-tenant data access is possible because `getMemory()` / `getMemoryTimeline()` / all memory queries go through `tenantPrisma.activityLog.withContext(ctx)`.
- Background insight extraction (from voice callbacks, transcript fetches) uses `captureMemoryWithContext(ctx)` where `ctx` comes from `resolveRecordTenantContext()` — always in `"enforce"` mode for provider callbacks.
- The `provider-context.ts` helper already handles the record-derived context for voice screening webhooks.

---

## 10. Tests

### 10.1 Unit Tests — Insight Extraction

| Test ID | Description | Expected |
|---------|-------------|----------|
| T6-001 | `extractInsightsFromNote` extracts salary from "expecting ₹30L" | Returns `salary_expectation` insight with value "30" |
| T6-002 | `extractInsightsFromNote` extracts notice period from "90 days notice" | Returns `notice_period` insight with value "90" |
| T6-003 | `extractInsightsFromNote` detects relocation willingness | Returns `relocation_preference` insight with value "willing" |
| T6-004 | `extractInsightsFromNote` detects relocation unwillingness | Returns `relocation_preference` insight with value "not_willing" |
| T6-005 | `extractInsightsFromNote` returns empty array for empty body | `[]` |
| T6-006 | `extractInsightsFromNote` returns empty array for irrelevant text | `[]` |
| T6-007 | `extractInsightsFromNote` extracts preferred location from text | Returns `preferred_location` insight |
| T6-008 | `extractInsightsFromNote` extracts skill signals | Returns `skill_signal` insights |
| T6-009 | `extractInsightsFromTranscript` extracts score signal | Returns insight with type `candidate_preference` for high score |
| T6-010 | `extractInsightsFromTranscript` returns score breakdown insights | One insight per criterion |
| T6-011 | `extractInsightsFromTranscript` extracts salary from transcript | Returns `salary_expectation` insight |
| T6-012 | `extractInsightsFromScreening` with full data | Returns insights for score, skills, experience, salary |
| T6-013 | `extractInsightsFromScreening` with empty report | Returns only score/experience/skills insights |
| T6-014 | `extractInsightsFromScreening` with structured report JSON | Returns matched/missing skill insights |

### 10.2 Unit Tests — Follow-Up Task Derivation

| Test ID | Description | Expected |
|---------|-------------|----------|
| T6-020 | `deriveFollowUpTasks` from salary insight | Returns `send_salary_details` task |
| T6-021 | `deriveFollowUpTasks` from notice period insight | Returns `follow_up_call` task |
| T6-022 | `deriveFollowUpTasks` from positive sentiment insight | Returns `schedule_interview` task |
| T6-023 | `deriveFollowUpsFromNote` with "schedule interview" text | Returns `schedule_interview` task |
| T6-024 | `deriveFollowUpsFromNote` with "follow up in 2 weeks" text | Returns `follow_up_call` task with `dueOffsetDays: 14` |
| T6-025 | `deriveFollowUpsFromNote` with "check references" text | Returns `check_references` task |
| T6-026 | `deriveFollowUpsFromNote` with offer-related text | Returns `send_offer` task |
| T6-027 | `deriveFollowUpTasks` from empty insights | Returns `[]` |
| T6-028 | `deriveFollowUpsFromNote` from irrelevant text | Returns `[]` |

### 10.3 Unit Tests — Conversation Service

| Test ID | Description | Expected |
|---------|-------------|----------|
| T6-030 | `getConversation(ctx, conversationId)` filters by metadata path | Only entries with matching `conversationId` |
| T6-031 | `getConversation` returns entries sorted by createdAt desc | Most recent first |
| T6-032 | `getConversationsByCandidate(ctx, candidateId)` returns grouped conversations | Multiple conversationId values returned |
| T6-033 | `getConversationsByChannel(ctx, "whatsapp")` filters by entityType | Only whatsapp entries |

### 10.4 Integration Tests — Memory Capture from Sources

| Test ID | Description | Expected |
|---------|-------------|----------|
| T6-040 | Creating a note with "expecting ₹30L" creates salary insight memory | ActivityLog has `insight_extracted` entry with salary data |
| T6-041 | Creating a note with "schedule interview" creates follow-up task memory | ActivityLog has `task_recommended` entry |
| T6-042 | Sending WhatsApp with salary mention creates insight memory | ActivityLog has `insight_extracted` entry |
| T6-043 | Voice screening callback with transcript creates insight memories | ActivityLog has `call_outcome` entries with insights |
| T6-044 | Voice screening callback creates summary memory | ActivityLog has `screening_completed` entry |
| T6-045 | AI screening creates screening insight memories | ActivityLog has `match_scored` entries with insights |
| T6-046 | AI screening creates screening summary memory | ActivityLog has `match_scored` summary entry |
| T6-047 | Email sent includes conversationId in metadata | ActivityLog entry has `metadata.conversationId` |
| T6-048 | Pipeline stage change includes conversationId | ActivityLog has `stage_changed` with `conversationId` |
| T6-049 | Interview outcome includes conversationId | ActivityLog has `interview_outcome` with `conversationId` |

### 10.5 Integration Tests — API Routes

| Test ID | Description | Expected |
|---------|-------------|----------|
| T6-050 | `GET /api/conversations/timeline?conversationId=conv_...` returns entries | 200, entries array |
| T6-051 | `GET /api/conversations/timeline?candidateId=clx...` returns grouped conversations | 200, conversations + entries |
| T6-052 | `GET /api/conversations/timeline?insightsOnly=true` returns only insight entries | Only entries with `extractedInsights` |
| T6-053 | `GET /api/conversations/timeline?channels=whatsapp,email` filters by channel | Only matching entity types |
| T6-054 | `GET /api/conversations/timeline` returns 400 without conversationId or candidateId | 400 |
| T6-055 | `GET /api/conversations/tasks` returns paginated task list | 200, tasks array |
| T6-056 | `GET /api/conversations/tasks?candidateId=clx...` filters tasks | Tasks related to candidate |
| T6-057 | `GET /api/conversations/tasks?priority=high` filters by priority | Only high-priority tasks |

### 10.6 Tenant Isolation Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| T6-060 | Org A cannot see Org B conversation entries | 0 cross-org entries returned |
| T6-061 | Conversation memory capture in Org A writes Org A's organizationId | Recorded in correct tenant scope |
| T6-062 | User with no org membership cannot access conversation APIs | 401 or 403 |
| T6-063 | Provider callback insight capture uses record-derived context | Insight stored in correct organization |

### 10.7 Human Confirmation Workflow Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| T6-070 | Confirm an auto-extracted insight | Confidence → "confirmed" |
| T6-071 | Correct an auto-extracted insight value | Original marked "corrected", new entry with corrected insight |
| T6-072 | Dismiss a false-positive insight | Confidence → "dismissed", excluded from default queries |
| T6-073 | Dismiss a follow-up task (mark complete) | Confidence → "dismissed", reason stored |
| T6-074 | Add human note to an insight without changing confidence | humanNote appended |

---

## 11. Rollback Plan

### 11.1 Soft Rollback (Feature Flag)

Insight extraction and follow-up task generation are additive and non-blocking. Introduce a feature flag to disable these features without removing code:

```env
CONVERSATION_INSIGHTS_ENABLED=false
```

When disabled:
- `extractInsightsFromNote` is not called after note creation.
- `extractInsightsFromTranscript` is not called after voice callbacks.
- `extractInsightsFromScreening` is not called after AI screening.
- `deriveFollowUpTasks` / `deriveFollowUpsFromNote` are not called.
- Conversation timeline and task API routes return empty results.
- All existing `activityLog` entries remain.
- The `captureMemory` calls for non-insight entries continue (Week 5 functionality is unaffected).

### 11.2 Hard Rollback (Code Revert)

If insight extraction causes data quality issues (false positives confuse recruiters) or performance issues:

1. Remove `lib/conversation/` directory (types, note-insights, voice-insights, screening-insights, follow-up).
2. Remove `app/api/conversations/` route directory.
3. Remove all `extractInsightsFrom*` and `deriveFollowUps*` calls from route handlers.
4. Revert to Week 5 state.

### 11.3 Rollback Triggers

| Trigger | Action |
|---------|--------|
| Insight false positive rate >20% in staging observations | Soft rollback: disable insights only |
| Insight extraction causes >5% p99 latency increase on any critical route | Soft rollback: disable insights only |
| Follow-up tasks are perceived as noise by recruiters (>50% dismissed within first hour) | Soft rollback: disable tasks only |
| Conversation timeline API shows >1% error rate | Hard rollback: remove conversation routes |
| Cross-tenant insight leak detected in production | Hard rollback: emergency |
| Memory entries increase 10x due to insight granularity, causing timeline query slowdowns | Soft rollback: reduce insight surface (e.g., only `"high"` confidence) |

### 11.4 Data Retention

All Week 6 data lives in `ActivityLog` (already part of the platform's standard retention). No new tables, no new data lifecycle. Existing retention policies cover all insights and tasks.

---

## 12. Acceptance Criteria

### Conversation Model

1. A `conversationId` convention exists and is used by all conversation-derived memory entries.
2. Conversations can be queried by `conversationId`, `candidateId`, and `channel`.
3. Conversations are grouped logically (all WhatsApp messages with the same candidate on the same day share a `conversationId`).
4. No new database tables, columns, or indexes are created.
5. No migrations are created.

### Insight Extraction

6. `extractInsightsFromNote` detects salary, notice period, relocation preference, preferred location, skill signals, and communication assessment from free-text notes.
7. `extractInsightsFromTranscript` detects AI score signals, score breakdown, salary, notice period, relocation, and sentiment from voice transcripts.
8. `extractInsightsFromScreening` detects AI match score, skills match %, experience match %, salary fit, matched skills, missing skills, and gaps from screening data.
9. All extracted insights are persisted as `ActivityLog` entries with `action: "insight_extracted"` (or `action: "call_outcome"` / `"match_scored"` for existing entry types).
10. Extracted insights are auto-tagged with their type and confidence for filtering.

### Follow-Up Tasks

11. `deriveFollowUpTasks` generates tasks from insight types (salary → send details, notice period → follow up, positive sentiment → schedule interview).
12. `deriveFollowUpsFromNote` generates tasks from free-text patterns (schedule, follow up, references, offer, feedback).
13. Follow-up tasks are persisted as `ActivityLog` entries with `action: "task_recommended"`.
14. Tasks are filterable by priority (`high`, `medium`, `low`) and candidate.

### Conversation and Task APIs

15. `GET /api/conversations/timeline` returns entries filtered by `conversationId`, `candidateId`, `channels`, and `insightsOnly`.
16. `GET /api/conversations/tasks` returns recommended follow-up tasks.
17. Both APIs return 401 for unauthenticated requests.
18. Both APIs are tenant-scoped (no cross-org data access).
19. Both APIs return 400 for missing required parameters.

### Human Confirmation

20. Extracted insights can be confirmed via `POST /api/memory/[id]/confirm`.
21. Extracted insights can be corrected via `POST /api/memory/[id]/correct`.
22. Extracted insights can be dismissed via `POST /api/memory/[id]/dismiss`.
23. Follow-up tasks can be dismissed (marked complete) via `POST /api/memory/[id]/dismiss`.
24. The existing confidence lifecycle (auto → confirmed/corrected/dismissed) works unchanged for insight and task entries.

### Tenant Safety

25. All insight and task memory entries are tenant-scoped via `tenantPrisma.activityLog`.
26. Cross-tenant conversation queries return empty results (observe) or errors (enforce).
27. Background insight extraction (voice callbacks, transcript fetches) uses `resolveRecordTenantContext` for tenant safety.
28. Provider callback insight extraction is tenant-safe even without a user session.

### No Schema Changes

29. Zero new database tables, columns, or indexes.
30. Zero Prisma schema modifications.
31. Zero migrations created.
32. All conversation, insight, and task data is stored in existing `ActivityLog` records with standardized `metadata` conventions.

### Testing

33. Unit tests pass for all insight extractors (T6-001 through T6-014).
34. Unit tests pass for follow-up task derivation (T6-020 through T6-028).
35. Unit tests pass for conversation service (T6-030 through T6-033).
36. Integration tests confirm insight capture from all sources (T6-040 through T6-049).
37. Integration tests confirm conversation/task API routes (T6-050 through T6-057).
38. Tenant isolation tests confirm no cross-org conversation data leak (T6-060 through T6-063).
39. Human confirmation workflow tests pass (T6-070 through T6-074).

### Build & Deploy

40. `npm run build` passes with zero errors.
41. All existing Week 3/4/5 tests pass (no regressions).
42. Feature flag `CONVERSATION_INSIGHTS_ENABLED` defaults to `true`.

---

## Implementation Order

1. **Core types** — `lib/conversation/types.ts`
   - `ExtractedInsight`, `InsightType`, `FollowUpTask`, `TaskType`
2. **Note insight extractor** — `lib/conversation/note-insights.ts`
   - `extractInsightsFromNote()` — regex-based extraction for salary, notice, relocation, location, skills, communication
3. **Voice transcript extractor** — `lib/conversation/voice-insights.ts`
   - `extractInsightsFromTranscript()` — score, breakdown, salary, notice, relocation, sentiment
4. **Screening insight extractor** — `lib/conversation/screening-insights.ts`
   - `extractInsightsFromScreening()` — score, skills, experience, salary, report JSON parsing
5. **Follow-up task derivation** — `lib/conversation/follow-up.ts`
   - `deriveFollowUpTasks()` — from insight types
   - `deriveFollowUpsFromNote()` — from free-text patterns
6. **Conversation service** — `lib/conversation/service.ts`
   - `getConversation()`, `getConversationsByCandidate()`, `getConversationsByChannel()`
7. **Integrate note insights** — Modify `app/api/candidates/[id]/notes/route.ts`
   - Add `conversationId` to existing note memory entry
   - Add `extractInsightsFromNote()` → `captureMemory()` per insight
   - Add `deriveFollowUpsFromNote()` → `captureMemory()` per task
8. **Integrate WhatsApp insights** — Modify `app/api/whatsapp/send/route.ts`
   - Add `conversationId` + `channel` + `direction` to existing memory entry
   - Add `extractInsightsFromNote()` on message body → `captureMemory()`
   - Add `deriveFollowUpTasks()` → `captureMemory()`
9. **Integrate voice transcript insights** — Modify `app/api/voice-screening/callback/route.ts`
   - Add `conversationId` + `channel` to existing `call_outcome` call
   - Add `extractInsightsFromTranscript()` → `captureMemoryWithContext()` per insight
   - Add summary memory entry for transcript
   - Apply same to `app/api/voice-screening/fetch-transcript/route.ts`
10. **Integrate screening insights** — Modify `app/api/ai/screen/route.ts`
    - Add `conversationId` + `channel: "screening"` to existing `match_scored` call
    - Add `extractInsightsFromScreening()` → `captureMemory()` per insight
    - Add summary memory entry for screening
11. **Add conversationId to existing sources** — Modify all other source routes
    - `app/api/email/send/route.ts` — add `conversationId` to `email_sent` entry
    - `app/api/applications/[id]/route.ts` — add `conversationId` to `stage_changed` entry
    - `app/api/interviews/[id]/route.ts` — add `conversationId` to `interview_outcome` entry
    - `app/api/offers/[id]/route.ts` — add `conversationId` to offer outcome entries
    - `app/api/prospects/convert/route.ts` — add `conversationId` to `prospect_converted` entry
12. **Conversation timeline API** — `app/api/conversations/timeline/route.ts` (GET)
13. **Conversation tasks API** — `app/api/conversations/tasks/route.ts` (GET)
14. **Feature flag** — Add `CONVERSATION_INSIGHTS_ENABLED` env var check in all extractors and derivers
15. **Add to middleware matcher** — Add `/api/conversations/:path*` to middleware
16. **Unit tests** — All 34 insight extraction, task derivation, and conversation service tests
17. **Integration tests** — All 25 capture, API route, and tenant isolation tests
18. **Build and smoke test** — `npm run build`, manual conversation timeline verification
