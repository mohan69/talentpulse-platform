import { extractInsightsFromNote } from "@/lib/conversation/note-insights";
import type { ExtractedInsight } from "@/lib/conversation/types";

export function extractInsightsFromTranscript(
  transcript: string,
  aiSummary?: string | null,
  overallScore?: number | null,
  scoreBreakdown?: Record<string, number> | null,
): ExtractedInsight[] {
  const combined = [transcript, aiSummary].filter(Boolean).join("\n\n");
  const insights = extractInsightsFromNote(combined, "voice_transcript");

  if (overallScore != null) {
    insights.push({
      type: "screening_score",
      value: `Voice screening score: ${overallScore}/100`,
      source: "voice_transcript",
      confidence: 0.9,
      sentiment: overallScore >= 75 ? "positive" : overallScore < 50 ? "negative" : "neutral",
    });
  }

  if (scoreBreakdown) {
    for (const [key, value] of Object.entries(scoreBreakdown).slice(0, 5)) {
      insights.push({
        type: "fit_signal",
        value: `${key}: ${value}/100`,
        source: "voice_transcript",
        confidence: 0.82,
        sentiment: value >= 75 ? "positive" : value < 50 ? "negative" : "neutral",
      });
    }
  }

  return insights;
}

