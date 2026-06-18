export type ConversationChannel = "voice" | "whatsapp" | "email" | "note" | "screening";

export type ConversationInsightSource =
  | "recruiter_note"
  | "voice_transcript"
  | "whatsapp_message"
  | "email_body"
  | "ai_screening";

export type ConversationInsightType =
  | "salary_expectation"
  | "notice_period"
  | "location_preference"
  | "remote_preference"
  | "availability"
  | "skill_signal"
  | "risk_signal"
  | "interest_level"
  | "screening_score"
  | "fit_signal"
  | "follow_up";

export interface ExtractedInsight {
  type: ConversationInsightType;
  value: string;
  source: ConversationInsightSource;
  confidence: number;
  sentiment?: "positive" | "negative" | "neutral";
  evidence?: string;
}

export interface FollowUpTask {
  title: string;
  reason: string;
  dueHint?: string;
  priority: "low" | "medium" | "high";
  source: ConversationInsightSource;
}

export interface ConversationTimelineEntry {
  id: string;
  conversationId: string;
  channel: ConversationChannel | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: any;
  createdAt: Date;
}

export interface ConversationSummary {
  conversationId: string;
  channel: ConversationChannel | null;
  candidateId: string | null;
  latestSummary: string;
  latestAt: Date;
  entryCount: number;
}

