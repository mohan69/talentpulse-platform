import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      recruiter: { select: { id: true, name: true, email: true } },
      applications: {
        include: {
          candidate: true,
          interviews: { orderBy: { scheduledAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "CLIENT" && job.clientId !== user.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(job);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "RECRUITER", "CLIENT"] as string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const updated = await prisma.job.update({
    where: { id: params.id },
    data: {
      title: body.title,
      location: body.location,
      jobType: body.jobType,
      experienceMin: body.experienceMin != null ? Number(body.experienceMin) : undefined,
      experienceMax: body.experienceMax != null ? Number(body.experienceMax) : undefined,
      skills: Array.isArray(body.skills) ? body.skills : undefined,
      description: body.description,
      salaryMin: body.salaryMin != null ? Number(body.salaryMin) : undefined,
      salaryMax: body.salaryMax != null ? Number(body.salaryMax) : undefined,
      openings: body.openings != null ? Number(body.openings) : undefined,
      priority: body.priority,
      status: body.status,
      recruiterId: body.recruiterId,
      clientId: body.clientId || undefined,
    },
  });
  await logActivity({ userId: user.id, entityType: "job", entityId: updated.id, action: "updated" });
  return NextResponse.json(updated);
}
