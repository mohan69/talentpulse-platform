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
  if (body.outcome !== undefined) data.outcome = body.outcome;
  if (body.rating != null) data.rating = Number(body.rating);
  if (body.feedback !== undefined) data.feedback = body.feedback;
  if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
  if (body.durationMins != null) data.durationMins = Number(body.durationMins);
  if (body.meetingLink !== undefined) data.meetingLink = body.meetingLink || null;
  if (body.interviewerName !== undefined) data.interviewerName = body.interviewerName || null;
  if (body.round !== undefined) data.round = body.round;
  if (body.mode !== undefined) data.mode = body.mode;
  const updated = await tenantPrisma.interview.update({ where: { id: params.id }, data });
  if (body.status === "COMPLETED") {
    await tenantPrisma.application.update({
      where: { id: updated.applicationId },
      data: { stage: "INTERVIEW_COMPLETE" },
    });
  }
  await logActivity({ userId: user.id, entityType: "interview", entityId: updated.id, action: "updated" });
  if (body.outcome || body.rating != null) {
    const sentiment = body.outcome === "PROCEED" ? "positive" : body.outcome === "REJECT" ? "negative" : "neutral";
    captureMemory({
      userId: user.id,
      entityType: "application",
      entityId: updated.applicationId,
      action: "interview_outcome",
      metadata: {
        memoryType: "decision",
        summary: `${body.round ?? ""} Interview: ${body.outcome ?? "completed"}${body.rating != null ? ` (rating: ${body.rating}/5)` : ""}`,
        details: body.feedback ?? null,
        sourceModel: "interview",
        sourceId: updated.id,
        tags: [...deriveTagsFromEntityType("interview"), ...deriveTagsFromAction("interview_outcome")],
        confidence: "auto",
        newValue: body.outcome,
        sentiment,
        importance: "high",
      },
    });
  }
  return NextResponse.json(updated);
}
