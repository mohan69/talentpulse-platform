export type MemoryType = "decision" | "candidate" | "client" | "requirement" | "recruiter" | "outcome";

export type MemoryConfidence = "auto" | "confirmed" | "corrected" | "dismissed";

export type MemorySentiment = "positive" | "negative" | "neutral";

export type MemoryImportance = "low" | "medium" | "high";

export type CanonicalEntityType =
  | "candidate"
  | "client"
  | "job"
  | "application"
  | "interview"
  | "offer"
  | "note"
  | "voiceScreening"
  | "whatsapp"
  | "email"
  | "prospect"
  | "user";

export type CanonicalAction =
  | "created"
  | "updated"
  | "stage_changed"
  | "match_scored"
  | "interview_scheduled"
  | "interview_completed"
  | "interview_outcome"
  | "offer_extended"
  | "offer_accepted"
  | "offer_rejected"
  | "candidate_joined"
  | "candidate_declined"
  | "note_added"
  | "screening_completed"
  | "message_sent"
  | "email_sent"
  | "client_feedback"
  | "requirement_changed"
  | "summary_updated"
  | "action_completed"
  | "prospect_converted"
  | "call_outcome";

export interface MemoryMetadata {
  memoryType: MemoryType;
  summary: string;
  details?: string | null;
  sourceModel: string;
  sourceId: string;
  sourceUrl?: string | null;
  tags: string[];
  confidence: MemoryConfidence;
  correctionOfId?: string | null;
  correctedByUserId?: string | null;
  correctedAt?: string | null;
  humanNote?: string | null;
  previousValue?: any;
  newValue?: any;
  sentiment?: MemorySentiment | null;
  importance?: MemoryImportance | null;
}

export interface MemoryEntry {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: MemoryMetadata;
  createdAt: Date;
}

export interface MemoryQuery {
  entityType?: string | string[];
  entityId?: string;
  action?: string | string[];
  memoryType?: MemoryType;
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
}

export interface MemoryQueryResult {
  entries: MemoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface MemoryInput {
  userId: string | null;
  entityType: CanonicalEntityType;
  entityId: string;
  action: CanonicalAction;
  metadata: MemoryMetadata;
}
