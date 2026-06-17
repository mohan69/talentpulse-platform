import { tenantPrisma } from "@/lib/tenant/prisma";
import type { TenantContext } from "@/lib/tenant/context";
import type { MemoryMetadata } from "@/lib/memory/types";

async function getMetadata(ctx: TenantContext, id: string): Promise<MemoryMetadata | null> {
  const entry = await (tenantPrisma.activityLog as any).withContext(ctx).findUnique({
    where: { id },
    select: { metadata: true },
  });
  if (!entry) return null;
  return entry.metadata as MemoryMetadata;
}

export async function confirmMemory(ctx: TenantContext, id: string): Promise<boolean> {
  const metadata = await getMetadata(ctx, id);
  if (!metadata) return false;

  await (tenantPrisma.activityLog as any).withContext(ctx).update({
    where: { id },
    data: { metadata: { ...metadata, confidence: "confirmed" } },
  });

  await (tenantPrisma.activityLog as any).withContext(ctx).create({
    data: {
      userId: ctx.userId,
      entityType: "activityLog",
      entityId: id,
      action: "confirmed",
      metadata: {
        memoryType: "recruiter",
        summary: "Memory entry confirmed by user",
        sourceModel: "activityLog",
        sourceId: id,
        tags: ["memory", "confirmation"],
        confidence: "auto",
      },
    },
  });

  return true;
}

export async function correctMemory(
  ctx: TenantContext,
  id: string,
  corrections: { summary?: string; details?: string; tags?: string[] },
): Promise<string | null> {
  const metadata = await getMetadata(ctx, id);
  if (!metadata) return null;

  await (tenantPrisma.activityLog as any).withContext(ctx).update({
    where: { id },
    data: { metadata: { ...metadata, confidence: "corrected" } },
  });

  const newMetadata: MemoryMetadata = {
    ...metadata,
    confidence: "corrected",
    correctionOfId: id,
    correctedByUserId: ctx.userId,
    correctedAt: new Date().toISOString(),
    summary: corrections.summary ?? metadata.summary,
    details: corrections.details ?? metadata.details,
    tags: corrections.tags ?? metadata.tags,
  };

  const newEntry = await (tenantPrisma.activityLog as any).withContext(ctx).create({
    data: {
      userId: ctx.userId,
      entityType: "activityLog",
      entityId: id,
      action: "corrected",
      metadata: newMetadata,
    },
  });

  return newEntry.id;
}

export async function dismissMemory(ctx: TenantContext, id: string, reason?: string): Promise<boolean> {
  const metadata = await getMetadata(ctx, id);
  if (!metadata) return false;

  await (tenantPrisma.activityLog as any).withContext(ctx).update({
    where: { id },
    data: {
      metadata: {
        ...metadata,
        confidence: "dismissed",
        humanNote: reason ? (metadata.humanNote ? `${metadata.humanNote}\n${reason}` : reason) : metadata.humanNote,
      },
    },
  });

  return true;
}

export async function addMemoryNote(ctx: TenantContext, id: string, note: string): Promise<boolean> {
  const metadata = await getMetadata(ctx, id);
  if (!metadata) return false;

  const currentNote = metadata.humanNote ?? "";
  const appended = currentNote ? `${currentNote}\n${note}` : note;

  await (tenantPrisma.activityLog as any).withContext(ctx).update({
    where: { id },
    data: { metadata: { ...metadata, humanNote: appended } },
  });

  return true;
}
