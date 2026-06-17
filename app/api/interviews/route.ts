import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const upcoming = url.searchParams.get("upcoming") === "1";
  const where: any = {};
  if (upcoming) where.scheduledAt = { gte: new Date() };
  if (user.role === "CLIENT") where.application = { job: { clientId: user.clientId } };
  if (user.role === "CANDIDATE") where.candidateId = user.candidateId;
  const interviews = await tenantPrisma.interview.findMany({
    where,
    include: {
      candidate: true,
      application: { include: { job: { include: { client: true } } } },
      interviewer: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: upcoming ? "asc" : "desc" },
    take: 100,
  });
  return NextResponse.json(interviews);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "RECRUITER", "CLIENT"] as string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const app = await tenantPrisma.application.findUnique({ where: { id: body.applicationId } });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const interview = await tenantPrisma.interview.create({
    data: {
      applicationId: body.applicationId,
      candidateId: app.candidateId,
      round: body.round ?? "L1",
      scheduledAt: new Date(body.scheduledAt),
      durationMins: Number(body.durationMins ?? 60),
      interviewerId: body.interviewerId ?? null,
      interviewerName: body.interviewerName ?? null,
      meetingLink: body.meetingLink ?? null,
      mode: body.mode ?? "Video",
    },
  });
  if (app.stage !== "INTERVIEW_SCHEDULED" && app.stage !== "INTERVIEW_COMPLETE") {
    await tenantPrisma.application.update({
      where: { id: app.id },
      data: { stage: "INTERVIEW_SCHEDULED" },
    });
  }
  await logActivity({ userId: user.id, entityType: "interview", entityId: interview.id, action: "scheduled" });
  return NextResponse.json(interview);
}
