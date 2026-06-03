import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const app = await prisma.application.findUnique({ where: { id: body.applicationId } });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const offer = await prisma.offer.create({
    data: {
      applicationId: body.applicationId,
      candidateId: app.candidateId,
      offeredCtc: Number(body.offeredCtc ?? 0),
      fixedCtc: body.fixedCtc != null ? Number(body.fixedCtc) : null,
      variableCtc: body.variableCtc != null ? Number(body.variableCtc) : null,
      joiningDate: body.joiningDate ? new Date(body.joiningDate) : null,
      status: body.status ?? "EXTENDED",
      notes: body.notes ?? null,
      feePercent: body.feePercent != null ? Number(body.feePercent) : null,
    },
  });
  await prisma.application.update({
    where: { id: app.id },
    data: { stage: "OFFER_EXTENDED" },
  });
  await logActivity({ userId: user.id, entityType: "offer", entityId: offer.id, action: "created" });
  return NextResponse.json(offer);
}
