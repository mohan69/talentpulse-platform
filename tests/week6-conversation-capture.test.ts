import assert from "node:assert/strict";
import { buildConversationId } from "../lib/conversation/ids";
import { extractInsightsFromNote } from "../lib/conversation/note-insights";
import { extractInsightsFromTranscript } from "../lib/conversation/voice-insights";
import { extractInsightsFromScreening } from "../lib/conversation/screening-insights";
import { deriveFollowUpTasks } from "../lib/conversation/follow-up";
import { buildConversationMetadata, conversationInsightsEnabled } from "../lib/conversation/capture";
import { summarizeConversationEntries } from "../lib/conversation/service";

assert.equal(conversationInsightsEnabled, true);

const noteText = "Candidate prefers remote or hybrid, expects 30 LPA, notice period is 45 days. Follow up tomorrow.";
const noteInsights = extractInsightsFromNote(noteText);
assert.ok(noteInsights.some((insight) => insight.type === "salary_expectation"));
assert.ok(noteInsights.some((insight) => insight.type === "notice_period"));
assert.ok(noteInsights.some((insight) => insight.type === "remote_preference"));

const whatsappInsights = extractInsightsFromNote("Hi, I am keen but need to discuss counter offer and joining timeline.", "whatsapp_message");
assert.ok(whatsappInsights.some((insight) => insight.source === "whatsapp_message"));
assert.ok(whatsappInsights.some((insight) => insight.type === "risk_signal" || insight.type === "interest_level"));

const transcriptInsights = extractInsightsFromTranscript(
  "Agent: Are you open to Bengaluru? Candidate: Prefer remote. Expected CTC is 28 LPA and notice is immediate.",
  "Candidate is positive and ready to proceed.",
  86,
  { communication: 90 },
);
assert.ok(transcriptInsights.some((insight) => insight.type === "screening_score"));
assert.ok(transcriptInsights.some((insight) => insight.type === "salary_expectation"));

const screeningInsights = extractInsightsFromScreening({
  score: 82,
  report: {
    ai: {
      assessments: { jdFitment: { score: 78 }, ctcAnalysis: { notes: "within budget" } },
      redFlags: ["May need relocation confirmation"],
    },
  },
});
assert.ok(screeningInsights.some((insight) => insight.type === "screening_score"));
assert.ok(screeningInsights.some((insight) => insight.type === "risk_signal"));

const tasks = deriveFollowUpTasks([...noteInsights, ...whatsappInsights], noteText);
assert.ok(tasks.some((task) => task.title.toLowerCase().includes("follow")));
assert.ok(tasks.some((task) => task.title.toLowerCase().includes("compensation")));

const conversationId = buildConversationId("cand_1", "note", new Date("2026-06-17T10:00:00Z"));
assert.equal(conversationId, "conv_cand_1_note_20260617");

const metadata = buildConversationMetadata({
  candidateId: "cand_1",
  channel: "note",
  conversationId,
  sourceModel: "note",
  sourceId: "note_1",
  summary: "Note captured",
  details: noteText,
  insights: noteInsights,
  followUpTasks: tasks,
});
assert.equal(metadata.conversationId, conversationId);
assert.equal(metadata.channel, "note");
assert.ok((metadata.extractedInsights ?? []).length >= 3);
assert.ok((metadata.followUpTasks ?? []).length >= 1);

const summaries = summarizeConversationEntries([
  {
    id: "a1",
    conversationId,
    channel: "note",
    action: "note_added",
    entityType: "note",
    entityId: "note_1",
    summary: "First note",
    metadata: { ...metadata, newValue: { candidateId: "cand_1" } },
    createdAt: new Date("2026-06-17T10:00:00Z"),
  },
  {
    id: "a2",
    conversationId,
    channel: "note",
    action: "summary_updated",
    entityType: "note",
    entityId: "note_1",
    summary: "Latest insight",
    metadata: { ...metadata, newValue: { candidateId: "cand_1" } },
    createdAt: new Date("2026-06-17T10:05:00Z"),
  },
]);
assert.equal(summaries.length, 1);
assert.equal(summaries[0].latestSummary, "Latest insight");
assert.equal(summaries[0].entryCount, 2);

console.log("Week 6 conversation capture tests passed");

