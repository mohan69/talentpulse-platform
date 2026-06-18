import { tenantPrisma } from "@/lib/tenant/prisma";
import type { ConversationChannel, ConversationSummary, ConversationTimelineEntry } from "@/lib/conversation/types";
import type { TenantContext } from "@/lib/tenant/context";

function metadataOf(entry: any) {
  return (entry.metadata ?? {}) as Record<string, any>;
}

function toTimelineEntry(entry: any): ConversationTimelineEntry | null {
  const metadata = metadataOf(entry);
  if (!metadata.conversationId) return null;
  return {
    id: entry.id,
    conversationId: metadata.conversationId,
    channel: metadata.channel ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    summary: metadata.summary ?? entry.action,
    metadata,
    createdAt: entry.createdAt,
  };
}

export function summarizeConversationEntries(entries: ConversationTimelineEntry[]): ConversationSummary[] {
  const grouped = new Map<string, ConversationTimelineEntry[]>();
  for (const entry of entries) {
    const bucket = grouped.get(entry.conversationId) ?? [];
    bucket.push(entry);
    grouped.set(entry.conversationId, bucket);
  }

  return [...grouped.entries()].map(([conversationId, items]) => {
    const sorted = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latest = sorted[0];
    const candidateId = latest.metadata?.newValue?.candidateId ?? latest.metadata?.candidateId ?? null;
    return {
      conversationId,
      channel: latest.channel,
      candidateId,
      latestSummary: latest.summary,
      latestAt: latest.createdAt,
      entryCount: items.length,
    };
  }).sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
}

export async function getConversationTimeline(
  ctx: TenantContext,
  options: {
    conversationId?: string | null;
    candidateId?: string | null;
    channels?: ConversationChannel[];
    limit?: number;
  },
) {
  const where: Record<string, any> = {};
  if (options.conversationId) {
    where.metadata = { path: ["conversationId"], equals: options.conversationId };
  } else if (options.candidateId) {
    where.OR = [
      { metadata: { path: ["newValue", "candidateId"], equals: options.candidateId } },
      { metadata: { path: ["candidateId"], equals: options.candidateId } },
    ];
  }

  const entries = await (tenantPrisma.activityLog as any).withContext(ctx).findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: options.limit ?? 200,
  });

  const timeline = (entries as any[])
    .map(toTimelineEntry)
    .filter((entry): entry is ConversationTimelineEntry => !!entry)
    .filter((entry) => !options.channels?.length || (entry.channel && options.channels.includes(entry.channel)));

  return {
    conversations: summarizeConversationEntries(timeline),
    entries: timeline,
    totalConversations: new Set(timeline.map((entry) => entry.conversationId)).size,
    totalEntries: timeline.length,
  };
}
