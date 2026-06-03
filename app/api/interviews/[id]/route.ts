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
  const updated = await prisma.interview.update({ where: { id: params.id }, data });
  if (body.status === "COMPLETED") {
    await prisma.application.update({
      where: { id: updated.applicationId },
      data: { stage: "INTERVIEW_COMPLETE" },
    });
  }
  await logActivity({ userId: user.id, entityType: "interview", entityId: updated.id, action: "updated" });
  return NextResponse.json(updated);
}
