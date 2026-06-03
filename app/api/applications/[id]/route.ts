import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: any = {};
  if (body.stage) {
    data.stage = body.stage;
    if (body.stage === "SUBMITTED") data.submittedAt = new Date();
  }
  if (body.clientFeedback != null) data.clientFeedback = body.clientFeedback;
  const updated = await prisma.application.update({ where: { id: params.id }, data });
  await logActivity({
    userId: user.id,
    entityType: "application",
    entityId: updated.id,
    action: body.stage ? "stage_changed" : "updated",
    metadata: { stage: body.stage },
  });
  return NextResponse.json(updated);
}
