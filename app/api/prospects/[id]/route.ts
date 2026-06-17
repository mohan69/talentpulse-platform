import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prospect = await tenantPrisma.prospect.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      convertedCandidate: { select: { id: true, name: true, email: true } },
    },
  });
  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(prospect);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!((["ADMIN", "RECRUITER"] as string[]).includes(user.role)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, phone, altPhone, currentCity, currentCompany, currentDesignation,
    totalExperience, skills, degree, institution, currentCtc, expectedCtc,
    noticePeriod, linkedinUrl, source, sourceDetail, notes, tags, status, statusNote, ownerId } = body;

  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email?.trim() || null;
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (altPhone !== undefined) data.altPhone = altPhone?.trim() || null;
  if (currentCity !== undefined) data.currentCity = currentCity?.trim() || null;
  if (currentCompany !== undefined) data.currentCompany = currentCompany?.trim() || null;
  if (currentDesignation !== undefined) data.currentDesignation = currentDesignation?.trim() || null;
  if (totalExperience !== undefined) data.totalExperience = totalExperience ? parseFloat(totalExperience) : null;
  if (skills !== undefined) data.skills = skills;
  if (degree !== undefined) data.degree = degree?.trim() || null;
  if (institution !== undefined) data.institution = institution?.trim() || null;
  if (currentCtc !== undefined) data.currentCtc = currentCtc ? parseFloat(currentCtc) : null;
  if (expectedCtc !== undefined) data.expectedCtc = expectedCtc ? parseFloat(expectedCtc) : null;
  if (noticePeriod !== undefined) data.noticePeriod = noticePeriod ? parseInt(noticePeriod) : null;
  if (linkedinUrl !== undefined) data.linkedinUrl = linkedinUrl?.trim() || null;
  if (source !== undefined) data.source = source;
  if (sourceDetail !== undefined) data.sourceDetail = sourceDetail?.trim() || null;
  if (notes !== undefined) data.notes = notes?.trim() || null;
  if (tags !== undefined) data.tags = tags;
  if (status !== undefined) data.status = status;
  if (statusNote !== undefined) data.statusNote = statusNote?.trim() || null;
  if (ownerId !== undefined) data.ownerId = ownerId || null;

  const prospect = await tenantPrisma.prospect.update({ where: { id: params.id }, data });
  if (status) {
    await logActivity({ userId: user.id, entityType: "prospect", entityId: prospect.id, action: "status_changed", metadata: { status, name: prospect.name } });
  }
  return NextResponse.json(prospect);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  await tenantPrisma.prospect.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
