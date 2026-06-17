import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!((["ADMIN", "RECRUITER"] as string[]).includes(user.role)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const ownerId = url.searchParams.get("ownerId");
  const tag = url.searchParams.get("tag");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")));

  const where: any = {};
  if (user.role === "RECRUITER") where.ownerId = user.id;
  if (status) where.status = status;
  if (source) where.source = source;
  if (ownerId && user.role === "ADMIN") where.ownerId = ownerId;
  if (tag) where.tags = { has: tag };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { currentCompany: { contains: q, mode: "insensitive" } },
      { currentDesignation: { contains: q, mode: "insensitive" } },
      { currentCity: { contains: q, mode: "insensitive" } },
    ];
  }

  const [prospects, total] = await Promise.all([
    tenantPrisma.prospect.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { owner: { select: { id: true, name: true } } },
    }),
    tenantPrisma.prospect.count({ where }),
  ]);

  // Status counts for filters
  const statusCounts = await tenantPrisma.prospect.groupBy({
    by: ["status"],
    _count: true,
    where: user.role === "RECRUITER" ? { ownerId: user.id } : {},
  });

  return NextResponse.json({
    prospects,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count })),
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!((["ADMIN", "RECRUITER"] as string[]).includes(user.role)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, phone, altPhone, currentCity, currentCompany, currentDesignation,
    totalExperience, skills, degree, institution, currentCtc, expectedCtc,
    noticePeriod, linkedinUrl, source, sourceDetail, notes, tags, ownerId } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Check for duplicate by email if provided
  if (email) {
    const existing = await tenantPrisma.prospect.findFirst({ where: { email } });
    if (existing) return NextResponse.json({ error: "A prospect with this email already exists", existingId: existing.id }, { status: 409 });
    // Also check if already a candidate
    const existingCandidate = await tenantPrisma.candidate.findFirst({ where: { email } });
    if (existingCandidate) return NextResponse.json({ error: "This person is already a candidate", candidateId: existingCandidate.id }, { status: 409 });
  }

  const prospect = await tenantPrisma.prospect.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      altPhone: altPhone?.trim() || null,
      currentCity: currentCity?.trim() || null,
      currentCompany: currentCompany?.trim() || null,
      currentDesignation: currentDesignation?.trim() || null,
      totalExperience: totalExperience ? parseFloat(totalExperience) : null,
      skills: skills ?? [],
      degree: degree?.trim() || null,
      institution: institution?.trim() || null,
      currentCtc: currentCtc ? parseFloat(currentCtc) : null,
      expectedCtc: expectedCtc ? parseFloat(expectedCtc) : null,
      noticePeriod: noticePeriod ? parseInt(noticePeriod) : null,
      linkedinUrl: linkedinUrl?.trim() || null,
      source: source || "OTHER",
      sourceDetail: sourceDetail?.trim() || null,
      notes: notes?.trim() || null,
      tags: tags ?? [],
      ownerId: ownerId || user.id,
    },
  });

  await logActivity({ userId: user.id, entityType: "prospect", entityId: prospect.id, action: "created", metadata: { name: prospect.name } });

  return NextResponse.json(prospect, { status: 201 });
}
