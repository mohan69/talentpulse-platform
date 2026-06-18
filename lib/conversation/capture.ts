import { buildConversationId } from "@/lib/conversation/ids";
import { deriveFollowUpTasks } from "@/lib/conversation/follow-up";
import type { ConversationChannel, ExtractedInsight, FollowUpTask } from "@/lib/conversation/types";
import { captureMemory, captureMemoryWithContext } from "@/lib/memory/service";
import { deriveTagsFromAction, deriveTagsFromEntityType } from "@/lib/memory/tags";
import type { CanonicalAction, CanonicalEntityType, MemoryImportance } from "@/lib/memory/types";
import type { TenantContext } from "@/lib/tenant/context";

export const conversationInsightsEnabled = process.env.CONVERSATION_INSIGHTS_ENABLED !== "false";

export function getConversationId(candidateId: string, channel: ConversationChannel, date = new Date()) {
  return buildConversationId(candidateId, channel, date);
}

function importanceFromInsights(insights: ExtractedInsight[]): MemoryImportance {
  if (insights.some((insight) => insight.type === "risk_signal" || insight.confidence >= 0.85)) return "high";
  if (insights.length > 0) return "medium";
  return "low";
}

export function buildConversationMetadata(params: {
  candidateId?: string | null;
  channel: ConversationChannel;
  conversationId?: string;
  sourceModel: string;
  sourceId: string;
  summary: string;
  details?: string | null;
  direction?: "inbound" | "outbound" | "internal";
  insights?: ExtractedInsight[];
  followUpTasks?: FollowUpTask[];
  tags?: string[];
  importance?: MemoryImportance;
}) {
  const insights = params.insights ?? [];
  const followUpTasks = params.followUpTasks ?? [];
  return {
    memoryType: "candidate" as const,
    summary: params.summary,
    details: params.details ?? null,
    sourceModel: params.sourceModel,
    sourceId: params.sourceId,
    tags: [
      "conversation",
      params.channel,
      ...deriveTagsFromEntityType(params.channel === "whatsapp" ? "whatsapp" : params.sourceModel),
      ...(params.tags ?? []),
    ],
    confidence: "auto" as const,
    importance: params.importance ?? importanceFromInsights(insights),
    conversationId: params.conversationId,
    channel: params.channel,
    direction: params.direction ?? "internal",
    extractedInsights: insights,
    followUpTasks,
    sourceText: params.details ?? null,
    sourceCreatedAt: new Date().toISOString(),
    newValue: params.candidateId ? { candidateId: params.candidateId } : undefined,
  };
}

export async function captureConversationMemory(params: {
  ctx?: TenantContext;
  userId: string | null;
  candidateId?: string | null;
  entityType: CanonicalEntityType;
  entityId: string;
  action: CanonicalAction;
  channel: ConversationChannel;
  sourceModel: string;
  sourceId: string;
  text: string;
  summary: string;
  direction?: "inbound" | "outbound" | "internal";
  insights?: ExtractedInsight[];
  conversationId?: string;
}) {
  if (!conversationInsightsEnabled) return;

  const conversationId =
    params.conversationId ??
    (params.candidateId ? getConversationId(params.candidateId, params.channel) : undefined);
  const insights = params.insights ?? [];
  const followUpTasks = deriveFollowUpTasks(insights, params.text);
  const metadata = buildConversationMetadata({
    candidateId: params.candidateId,
    channel: params.channel,
    conversationId,
    sourceModel: params.sourceModel,
    sourceId: params.sourceId,
    summary: params.summary,
    details: params.text,
    direction: params.direction,
    insights,
    followUpTasks,
    tags: [...deriveTagsFromAction(params.action), ...insights.map((insight) => insight.type)],
  });

  const input = {
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    metadata,
  };

  if (params.ctx) await captureMemoryWithContext(params.ctx, input);
  else await captureMemory(input);
}

