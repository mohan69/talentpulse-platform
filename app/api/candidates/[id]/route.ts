import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Fetch current candidate to compare values and avoid unnecessary unique constraint issues
    const existing = await prisma.candidate.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const data: any = {};

    // Map all allowed fields from the request body
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.currentCity !== undefined) data.currentCity = body.currentCity;
    if (body.currentCompany !== undefined) data.currentCompany = body.currentCompany;
    if (body.currentDesignation !== undefined) data.currentDesignation = body.currentDesignation;
    if (body.totalExperience !== undefined) data.totalExperience = body.totalExperience;
    if (body.relevantExperience !== undefined) data.relevantExperience = body.relevantExperience;
    if (body.skills !== undefined) data.skills = body.skills;
    if (body.degree !== undefined) data.degree = body.degree;
    if (body.institution !== undefined) data.institution = body.institution;
    if (body.graduationYear !== undefined) data.graduationYear = body.graduationYear;
    if (body.currentCtc !== undefined) data.currentCtc = body.currentCtc;
    if (body.expectedCtc !== undefined) data.expectedCtc = body.expectedCtc;
    if (body.noticePeriod !== undefined) data.noticePeriod = body.noticePeriod;
    if (body.linkedinUrl !== undefined) data.linkedinUrl = body.linkedinUrl;
    if (body.employmentGapNotes !== undefined) data.employmentGapNotes = body.employmentGapNotes;

    // Handle email separately — only include if actually changed to avoid unique constraint errors
    if (body.email !== undefined && body.email !== existing.email) {
      // Check if the new email is already taken by another candidate
      if (body.email) {
        const emailTaken = await prisma.candidate.findFirst({
          where: { email: body.email, id: { not: params.id } },
        });
        if (emailTaken) {
          return NextResponse.json({ error: "This email is already used by another candidate" }, { status: 409 });
        }
      }
      data.email = body.email;
    }

    const updated = await prisma.candidate.update({
      where: { id: params.id },
      data,
    });

    await logActivity({
      userId: user.id,
      entityType: "candidate",
      entityId: updated.id,
      action: "updated",
      metadata: { fields: Object.keys(data) },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating candidate:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "This email is already used by another candidate" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Failed to update candidate" }, { status: 500 });
  }
}
