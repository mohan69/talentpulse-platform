import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!((["ADMIN", "RECRUITER"] as string[]).includes(user.role)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { prospectIds, jobId } = body;

  if (!prospectIds?.length) return NextResponse.json({ error: "No prospects selected" }, { status: 400 });

  const prospects = await prisma.prospect.findMany({
    where: { id: { in: prospectIds }, status: { not: "CONVERTED" } },
  });

  if (prospects.length === 0) return NextResponse.json({ error: "No eligible prospects found" }, { status: 400 });

  const results: { prospectId: string; name: string; candidateId?: string; error?: string }[] = [];

  for (const p of prospects) {
    try {
      // Check if candidate already exists by email
      let candidate = p.email ? await prisma.candidate.findFirst({ where: { email: p.email } }) : null;

      if (candidate) {
        // Update the prospect to link to existing candidate
        await prisma.prospect.update({
          where: { id: p.id },
          data: {
            status: "CONVERTED",
            convertedCandidateId: candidate.id,
            statusNote: `Linked to existing candidate (${candidate.email})`,
          },
        });
        results.push({ prospectId: p.id, name: p.name, candidateId: candidate.id });
      } else {
        // Create new candidate from prospect
        candidate = await prisma.candidate.create({
          data: {
            name: p.name,
            email: p.email || `prospect-${p.id}@placeholder.local`,
            phone: p.phone,
            altPhone: p.altPhone,
            currentCity: p.currentCity,
            currentCompany: p.currentCompany,
            currentDesignation: p.currentDesignation,
            totalExperience: p.totalExperience ?? 0,
            skills: p.skills,
            degree: p.degree,
            institution: p.institution,
            currentCtc: p.currentCtc,
            expectedCtc: p.expectedCtc,
            noticePeriod: p.noticePeriod,
            linkedinUrl: p.linkedinUrl,
            resumeUrl: p.resumeUrl,
            resumeKey: p.resumeKey,
            source: p.source,
            ownerId: p.ownerId || user.id,
          },
        });

        // Update prospect status
        await prisma.prospect.update({
          where: { id: p.id },
          data: {
            status: "CONVERTED",
            convertedCandidateId: candidate.id,
            statusNote: `Converted to candidate on ${new Date().toLocaleDateString("en-IN")}`,
          },
        });

        results.push({ prospectId: p.id, name: p.name, candidateId: candidate.id });
      }

      // If a job is specified, create application
      if (jobId && candidate) {
        const existingApp = await prisma.application.findFirst({
          where: { candidateId: candidate.id, jobId },
        });
        if (!existingApp) {
          await prisma.application.create({
            data: {
              candidateId: candidate.id,
              jobId,
              stage: "NEW",
            },
          });
        }
      }

      await logActivity({ userId: user.id, entityType: "prospect", entityId: p.id, action: "converted_to_candidate", metadata: {
        prospectName: p.name,
        candidateId: candidate.id,
      } });
    } catch (err: any) {
      console.error(`Failed to convert prospect ${p.id}:`, err);
      results.push({ prospectId: p.id, name: p.name, error: err.message });
    }
  }

  const converted = results.filter((r) => r.candidateId).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({ converted, failed, results });
}
