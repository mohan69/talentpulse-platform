import { captureMemoryWithContext } from "@/lib/memory/service";
import type { TenantContext } from "@/lib/tenant/context";

export async function captureRevenueMemory(
  ctx: TenantContext,
  params: {
    userId: string | null;
    entityType: "organization" | "user" | "client" | "offer" | "application";
    entityId: string;
    action: string;
    summary: string;
    details?: string | null;
    tags?: string[];
    importance?: "low" | "medium" | "high";
    newValue?: Record<string, any>;
  },
) {
  try {
    await captureMemoryWithContext(ctx, {
      userId: params.userId,
      entityType: params.entityType as any,
      entityId: params.entityId,
      action: params.action as any,
      metadata: {
        memoryType: "recruiter",
        summary: params.summary,
        details: params.details ?? null,
        sourceModel: params.entityType,
        sourceId: params.entityId,
        tags: ["revenue", ...(params.tags ?? [])],
        confidence: "auto",
        importance: params.importance ?? "low",
        channel: "screening",
        direction: "internal",
        newValue: params.newValue ?? undefined,
      },
    });
  } catch {
    // fire-and-forget
  }
}
