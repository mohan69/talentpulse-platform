import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "RECRUITER"] as string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const source = url.searchParams.get("source");
  const skill = url.searchParams.get("skill");
  const minExp = url.searchParams.get("minExp");
  const maxExp = url.searchParams.get("maxExp");

  const where: any = {};
  if (source) where.source = source;
  if (skill) where.skills = { has: skill };
  if (minExp || maxExp) {
    where.totalExperience = {};
    if (minExp) where.totalExperience.gte = Number(minExp);
    if (maxExp) where.totalExperience.lte = Number(maxExp);
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { currentCompany: { contains: q, mode: "insensitive" } },
      { skills: { has: q } },
    ];
  }
  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { applications: true } },
    },
    take: 200,
  });
  return NextResponse.json(candidates);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "RECRUITER"] as string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  try {
    const email = String(body.email).toLowerCase().trim();
    const existing = await prisma.candidate.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Duplicate candidate", existingId: existing.id, existing },
        { status: 409 },
      );
    }
    const candidate = await prisma.candidate.create({
      data: {
        name: body.name,
        email,
        phone: body.phone ?? null,
        altPhone: body.altPhone ?? null,
        currentCity: body.currentCity ?? null,
        preferredLocations: body.preferredLocations ?? [],
        willRelocate: !!body.willRelocate,
        currentCompany: body.currentCompany ?? null,
        currentDesignation: body.currentDesignation ?? null,
        totalExperience: Number(body.totalExperience ?? 0),
        relevantExperience: Number(body.relevantExperience ?? 0),
        skills: Array.isArray(body.skills) ? body.skills : [],
        degree: body.degree ?? null,
        institution: body.institution ?? null,
        graduationYear: body.graduationYear ? Number(body.graduationYear) : null,
        currentCtc: body.currentCtc ? Number(body.currentCtc) : null,
        expectedCtc: body.expectedCtc ? Number(body.expectedCtc) : null,
        ctcFixed: body.ctcFixed ? Number(body.ctcFixed) : null,
        ctcVariable: body.ctcVariable ? Number(body.ctcVariable) : null,
        noticePeriod: body.noticePeriod ? Number(body.noticePeriod) : null,
        source: body.source ?? "OTHER",
        linkedinUrl: body.linkedinUrl ?? null,
        employmentGapNotes: body.employmentGapNotes ?? null,
        resumeUrl: body.resumeUrl ?? null,
        resumeKey: body.resumeKey ?? null,
        ownerId: user.id,
        projects: body.projects && body.projects.length ? {
          create: body.projects.map((p: any) => ({
            projectName: p.projectName ?? "",
            role: p.role ?? "",
            skillsUsed: p.skillsUsed ?? [],
            description: p.description ?? "",
            contribution: p.contribution ?? "",
          })),
        } : undefined,
      },
    });
    await logActivity({ userId: user.id, entityType: "candidate", entityId: candidate.id, action: "created" });
    return NextResponse.json(candidate);
  } catch (e: any) {
    console.error("candidate create", e);
    return NextResponse.json({ error: e?.message ?? "Create failed" }, { status: 500 });
  }
}
