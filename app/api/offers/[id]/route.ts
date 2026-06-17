import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";
import { tenantPrisma } from "@/lib/repositories";
import { captureMemory } from "@/lib/memory/service";
import { deriveTagsFromEntityType, deriveTagsFromAction } from "@/lib/memory/tags";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: any = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.offeredCtc !== undefined) data.offeredCtc = Number(body.offeredCtc);
  if (body.fixedCtc !== undefined) data.fixedCtc = body.fixedCtc ? Number(body.fixedCtc) : null;
  if (body.variableCtc !== undefined) data.variableCtc = body.variableCtc ? Number(body.variableCtc) : null;
  if (body.joiningDate !== undefined) data.joiningDate = body.joiningDate ? new Date(body.joiningDate) : null;
  if (body.actualJoinedAt !== undefined) data.actualJoinedAt = body.actualJoinedAt ? new Date(body.actualJoinedAt) : null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.feePercent !== undefined) data.feePercent = body.feePercent ? Number(body.feePercent) : null;
  if (body.feeAmount !== undefined) data.feeAmount = body.feeAmount ? Number(body.feeAmount) : null;
  if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus || null;
  const updated = await tenantPrisma.offer.update({ where: { id: params.id }, data });
  if (body.status === "ACCEPTED") {
    await tenantPrisma.application.update({ where: { id: updated.applicationId }, data: { stage: "OFFER_ACCEPTED" } });
    captureMemory({
      userId: user.id,
      entityType: "application",
      entityId: updated.applicationId,
      action: "offer_accepted",
      metadata: {
        memoryType: "outcome",
        summary: `Offer accepted${updated.offeredCtc ? ` (₹${(updated.offeredCtc / 100000).toFixed(1)}L)` : ""}`,
        details: updated.notes ?? null,
        sourceModel: "offer",
        sourceId: updated.id,
        tags: [...deriveTagsFromEntityType("offer"), ...deriveTagsFromAction("offer_accepted")],
        confidence: "auto",
        sentiment: "positive",
        importance: "high",
      },
    });
  }
  if (body.status === "REJECTED") {
    captureMemory({
      userId: user.id,
      entityType: "application",
      entityId: updated.applicationId,
      action: "offer_rejected",
      metadata: {
        memoryType: "outcome",
        summary: "Offer rejected",
        sourceModel: "offer",
        sourceId: updated.id,
        tags: [...deriveTagsFromEntityType("offer"), ...deriveTagsFromAction("offer_rejected")],
        confidence: "auto",
        sentiment: "negative",
        importance: "high",
      },
    });
  }
  if (body.actualJoinedAt) {
    await tenantPrisma.application.update({ where: { id: updated.applicationId }, data: { stage: "JOINED" } });
    captureMemory({
      userId: user.id,
      entityType: "application",
      entityId: updated.applicationId,
      action: "candidate_joined",
      metadata: {
        memoryType: "outcome",
        summary: `Candidate joined on ${new Date(body.actualJoinedAt).toLocaleDateString("en-IN")}`,
        sourceModel: "offer",
        sourceId: updated.id,
        tags: [...deriveTagsFromEntityType("offer"), ...deriveTagsFromAction("candidate_joined")],
        confidence: "auto",
        sentiment: "positive",
        importance: "high",
      },
    });
  }
  await logActivity({ userId: user.id, entityType: "offer", entityId: updated.id, action: "updated" });
  return NextResponse.json(updated);
}
