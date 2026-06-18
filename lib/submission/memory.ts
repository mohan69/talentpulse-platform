import { captureMemoryWithContext, getMemory } from "@/lib/memory/service";
import type { CanonicalAction, MemoryEntry, MemoryType } from "@/lib/memory/types";
import type { TenantContext } from "@/lib/tenant/context";

export async function captureSubmissionMemory(
  ctx: TenantContext,
  params: {
    userId: string | null;
    applicationId: string;
    action: CanonicalAction;
    summary: string;
    details?: string | null;
    tags?: string[];
    memoryType?: MemoryType;
    importance?: "low" | "medium" | "high";
    previousValue?: any;
    newValue?: any;
  },
) {
  await captureMemoryWithContext(ctx, {
    userId: params.userId,
    entityType: "application",
    entityId: params.applicationId,
    action: params.action,
    metadata: {
      memoryType: params.memoryType ?? "decision",
      summary: params.summary,
      details: params.details ?? null,
      sourceModel: "application",
      sourceId: params.applicationId,
      tags: ["submission", ...(params.tags ?? [])],
      confidence: "confirmed",
      importance: params.importance ?? "medium",
      channel: "screening",
      previousValue: params.previousValue,
      newValue: params.newValue,
    },
  });
}

export async function getSubmissionHistory(ctx: TenantContext, applicationId: string): Promise<MemoryEntry[]> {
  const result = await getMemory(ctx, {
    entityType: "application",
    entityId: applicationId,
    tags: ["submission"],
    includeDismissed: true,
    limit: 100,
  });
  return result.entries;
}

export function getSubmissionStatusFromHistory(history: MemoryEntry[], submittedAt?: Date | string | null): string {
  if (submittedAt) return "submitted";
  const latest = history.find((entry) => (entry.metadata?.newValue as any)?.submissionStatus);
  return (latest?.metadata?.newValue as any)?.submissionStatus ?? "not_submitted";
}

