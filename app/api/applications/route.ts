import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { computeHeuristicScore } from "@/lib/ai-screening";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const candidateId = url.searchParams.get("candidateId");
  const where: any = {};
  if (jobId) where.jobId = jobId;
  if (candidateId) where.candidateId = candidateId;
  if (user.role === "CLIENT") where.job = { clientId: user.clientId };
  if (user.role === "CANDIDATE") where.candidateId = user.candidateId;
  const apps = await prisma.application.findMany({
    where,
    include: {
      candidate: true,
      job: { include: { client: true } },
      interviews: { orderBy: { scheduledAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(apps);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "RECRUITER"] as string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { candidateId, jobId } = body ?? {};
  if (!candidateId || !jobId) return NextResponse.json({ error: "candidateId and jobId required" }, { status: 400 });

  const existing = await prisma.application.findUnique({
    where: { candidateId_jobId: { candidateId, jobId } },
  });
  if (existing) return NextResponse.json({ error: "Application already exists", applicationId: existing.id }, { status: 409 });

  const [candidate, job] = await Promise.all([
    prisma.candidate.findUnique({ where: { id: candidateId } }),
    prisma.job.findUnique({ where: { id: jobId } }),
  ]);
  if (!candidate || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const score = computeHeuristicScore(candidate, job);
  const app = await prisma.application.create({
    data: {
      candidateId,
      jobId,
      matchScore: score.matchScore,
      noShowRisk: score.noShowRisk,
      aiReport: score as any,
    },
  });
  await logActivity({ userId: user.id, entityType: "application", entityId: app.id, action: "created" });
  return NextResponse.json(app);
}
