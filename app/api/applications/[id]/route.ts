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
  if (body.stage) {
    data.stage = body.stage;
    if (body.stage === "SUBMITTED") data.submittedAt = new Date();
  }
  if (body.clientFeedback != null) data.clientFeedback = body.clientFeedback;
  const updated = await tenantPrisma.application.update({ where: { id: params.id }, data });
  await logActivity({
    userId: user.id,
    entityType: "application",
    entityId: updated.id,
    action: body.stage ? "stage_changed" : "updated",
    metadata: { stage: body.stage },
  });
  if (body.stage) {
    const isPositive = ["SUBMITTED", "INTERVIEW_SCHEDULED", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(body.stage);
    const isNegative = ["REJECTED", "ON_HOLD"].includes(body.stage);
    captureMemory({
      userId: user.id,
      entityType: "application",
      entityId: updated.id,
      action: "stage_changed",
      metadata: {
        memoryType: "decision",
        summary: `Stage changed to ${body.stage}`,
        sourceModel: "application",
        sourceId: updated.id,
        tags: [...deriveTagsFromEntityType("application"), ...deriveTagsFromAction("stage_changed"), body.stage.toLowerCase()],
        confidence: "auto",
        previousValue: body._previousStage,
        newValue: body.stage,
        sentiment: isPositive ? "positive" : isNegative ? "negative" : "neutral",
        importance: "high",
      },
    });
  }
  if (body.clientFeedback != null) {
    captureMemory({
      userId: user.id,
      entityType: "application",
      entityId: updated.id,
      action: "client_feedback",
      metadata: {
        memoryType: "client",
        summary: `Client feedback: ${(body.clientFeedback ?? "").slice(0, 120)}`,
        sourceModel: "application",
        sourceId: updated.id,
        tags: ["feedback", "client-interaction"],
        confidence: "auto",
        importance: "high",
      },
    });
  }
  return NextResponse.json(updated);
}
