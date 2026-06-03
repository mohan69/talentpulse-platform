import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  const mine = url.searchParams.get("mine") === "1";

  const where: any = {};
  if (user.role === "CLIENT") where.clientId = user.clientId;
  if (user.role === "RECRUITER" && mine) where.recruiterId = user.id;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ];
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      client: true,
      recruiter: { select: { id: true, name: true, email: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "RECRUITER", "CLIENT"] as string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  try {
    let clientId = body.clientId;
    if (user.role === "CLIENT") clientId = user.clientId;
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

    const job = await prisma.job.create({
      data: {
        title: body.title,
        clientId,
        location: body.location ?? "",
        jobType: body.jobType ?? "Full-time",
        experienceMin: Number(body.experienceMin ?? 0),
        experienceMax: Number(body.experienceMax ?? 0),
        skills: Array.isArray(body.skills) ? body.skills : [],
        description: body.description ?? "",
        salaryMin: body.salaryMin ? Number(body.salaryMin) : null,
        salaryMax: body.salaryMax ? Number(body.salaryMax) : null,
        currency: body.currency ?? "INR",
        openings: Number(body.openings ?? 1),
        priority: body.priority ?? "MEDIUM",
        sourcePrefs: Array.isArray(body.sourcePrefs) ? body.sourcePrefs : [],
        createdById: user.id,
        recruiterId: body.recruiterId ?? (user.role === "RECRUITER" ? user.id : null),
      },
    });
    await logActivity({ userId: user.id, entityType: "job", entityId: job.id, action: "created" });

    // Auto-create PENDING posting entries for all active platforms
    try {
      const activePlatforms = await prisma.recruitingPlatform.findMany({ where: { isActive: true }, select: { id: true } });
      if (activePlatforms.length > 0) {
        await prisma.jobPosting.createMany({
          data: activePlatforms.map((p) => ({ jobId: job.id, platformId: p.id, status: "PENDING" as const, autoPosted: true })),
          skipDuplicates: true,
        });
      }
    } catch (e) {
      console.error("Auto-create job postings failed (non-critical):", e);
    }

    return NextResponse.json(job);
  } catch (e: any) {
    console.error("job create", e);
    return NextResponse.json({ error: e?.message ?? "Create failed" }, { status: 500 });
  }
}
