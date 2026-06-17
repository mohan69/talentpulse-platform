import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";
import { tenantPrisma } from "@/lib/repositories";

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
  }
  if (body.actualJoinedAt) {
    await tenantPrisma.application.update({ where: { id: updated.applicationId }, data: { stage: "JOINED" } });
  }
  await logActivity({ userId: user.id, entityType: "offer", entityId: updated.id, action: "updated" });
  return NextResponse.json(updated);
}
