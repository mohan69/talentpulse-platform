import { tenantPrisma } from "@/lib/tenant/prisma";
import { resolveTenantContext } from "@/lib/tenant/context";
import type { TenantContext } from "@/lib/tenant/context";
import type { MemoryInput, MemoryQuery, MemoryQueryResult, MemoryEntry, MemoryMetadata } from "@/lib/memory/types";

const isEnabled = () => process.env.INSTITUTIONAL_MEMORY_ENABLED !== "false";

export async function captureMemory(input: MemoryInput): Promise<void> {
  if (!isEnabled()) return;

  try {
    const ctx = await resolveTenantContext();
    if (!ctx) return;

    await (tenantPrisma.activityLog as any).withContext(ctx).create({
      data: {
        userId: input.userId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        metadata: input.metadata as any,
      },
    });
  } catch (error) {
    console.error("[memory] capture failed", {
      error: String(error),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
    });
  }
}

export async function captureMemoryWithContext(ctx: TenantContext, input: MemoryInput): Promise<void> {
  if (!isEnabled()) return;

  try {
    await (tenantPrisma.activityLog as any).withContext(ctx).create({
      data: {
        userId: input.userId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        metadata: input.metadata as any,
      },
    });
  } catch (error) {
    console.error("[memory] capture failed", {
      error: String(error),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
    });
  }
}

export async function getMemory(ctx: TenantContext, query: MemoryQuery): Promise<MemoryQueryResult> {
  const where: Record<string, any> = {};

  if (query.entityType) {
    where.entityType = Array.isArray(query.entityType) ? { in: query.entityType } : query.entityType;
  }
  if (query.entityId) where.entityId = query.entityId;
  if (query.action) {
    where.action = Array.isArray(query.action) ? { in: query.action } : query.action;
  }
  if (query.userId) where.userId = query.userId;
  if (query.since || query.until) {
    where.createdAt = {};
    if (query.since) where.createdAt.gte = query.since;
    if (query.until) where.createdAt.lte = query.until;
  }

  if (query.memoryType) {
    where.metadata = { path: ["memoryType"], equals: query.memoryType };
  }

  if (query.tags && query.tags.length > 0) {
    const tagConditions = query.tags.map((tag) => ({
      metadata: { path: ["tags"], array_contains: tag },
    }));
    where.AND = tagConditions;
  }

  if (!query.includeDismissed) {
    const notCondition: Record<string, any> = {
      metadata: { path: ["confidence"], equals: "dismissed" },
    };
    where.NOT = where.NOT ? { ...where.NOT, ...notCondition } : notCondition;
  }

  const orderField = query.sortBy === "importance" ? "metadata" : "createdAt";

  const [entries, total] = await Promise.all([
    (tenantPrisma.activityLog as any).withContext(ctx).findMany({
      where,
      orderBy: { [orderField]: query.sortOrder ?? "desc" },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    }),
    (tenantPrisma.activityLog as any).withContext(ctx).count({ where }),
  ]);

  return { entries: entries as MemoryEntry[], total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
}

export async function getMemoryTimeline(
  ctx: TenantContext,
  entityType: string,
  entityId: string,
  options?: { includeDismissed?: boolean; limit?: number },
): Promise<MemoryQueryResult> {
  return getMemory(ctx, {
    entityType,
    entityId,
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: options?.limit ?? 100,
    includeDismissed: options?.includeDismissed,
  });
}

export async function getMemoryByUser(
  ctx: TenantContext,
  userId: string,
  options?: { limit?: number },
): Promise<MemoryQueryResult> {
  return getMemory(ctx, {
    userId,
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: options?.limit ?? 50,
  });
}

export type { MemoryInput, MemoryQuery, MemoryQueryResult, MemoryEntry, MemoryMetadata };
