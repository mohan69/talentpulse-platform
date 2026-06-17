import { prisma } from "@/lib/db";
import { tenantPrisma } from "@/lib/repositories";

export async function logActivity(params: {
  userId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: any;
}) {
  try {
    await tenantPrisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (e) {
    console.error("activity log failed", e);
  }
}
