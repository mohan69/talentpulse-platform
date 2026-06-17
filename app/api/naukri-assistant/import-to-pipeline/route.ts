import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { naukriCandidateIds } = await request.json();
    if (!naukriCandidateIds?.length) {
      return NextResponse.json({ error: "No candidates selected" }, { status: 400 });
    }

    const naukriCandidates = await tenantPrisma.naukriCandidate.findMany({
      where: { id: { in: naukriCandidateIds }, importedToPipeline: false },
    });

    if (naukriCandidates.length === 0) {
      return NextResponse.json({ error: "All selected candidates are already imported" }, { status: 400 });
    }

    const results: { name: string; status: string; candidateId?: string; applicationId?: string }[] = [];

    for (const nc of naukriCandidates) {
      try {
        // Check for existing candidate by email
        let existingCandidate = nc.email
          ? await tenantPrisma.candidate.findUnique({ where: { email: nc.email } })
          : null;

        let candidateId: string;

        if (existingCandidate) {
          candidateId = existingCandidate.id;
          // Update with any new info from Naukri
          await tenantPrisma.candidate.update({
            where: { id: candidateId },
            data: {
              ...(nc.phone && !existingCandidate.phone ? { phone: nc.phone } : {}),
              ...(nc.currentCompany && !existingCandidate.currentCompany ? { currentCompany: nc.currentCompany } : {}),
              ...(nc.designation && !existingCandidate.currentDesignation ? { currentDesignation: nc.designation } : {}),
              ...(nc.location && !existingCandidate.currentCity ? { currentCity: nc.location } : {}),
              ...(nc.skills.length > 0 ? { skills: { set: [...new Set([...(existingCandidate.skills || []), ...nc.skills])] } } : {}),
              source: "NAUKRI",
            },
          });
          results.push({ name: nc.name, status: "existing_updated", candidateId });
        } else {
          // Parse CTC strings to numbers
          const parseCtc = (s: string | null): number | null => {
            if (!s) return null;
            const num = parseFloat(s.replace(/[^0-9.]/g, ""));
            return isNaN(num) ? null : num;
          };

          // Create new candidate
          const newCandidate = await tenantPrisma.candidate.create({
            data: {
              name: nc.name,
              email: nc.email || `naukri-${nc.id}@placeholder.com`,
              phone: nc.phone,
              currentCompany: nc.currentCompany,
              currentDesignation: nc.designation,
              totalExperience: nc.experience || 0,
              skills: nc.skills,
              currentCity: nc.location,
              currentCtc: parseCtc(nc.currentCtc),
              expectedCtc: parseCtc(nc.expectedCtc),
              source: "NAUKRI",
              aiSummary: nc.summary,
              degree: nc.education,
              ownerId: user.id,
            },
          });
          candidateId = newCandidate.id;
          results.push({ name: nc.name, status: "created", candidateId });
        }

        // Create application if matched to a job
        let applicationId: string | null = null;
        if (nc.matchedJobId) {
          // Check for existing application
          const existingApp = await tenantPrisma.application.findFirst({
            where: { candidateId, jobId: nc.matchedJobId },
          });
          if (!existingApp) {
            const app = await tenantPrisma.application.create({
              data: {
                candidateId,
                jobId: nc.matchedJobId,
                stage: "NEW",
                matchScore: nc.matchScore,
              },
            });
            applicationId = app.id;
          } else {
            applicationId = existingApp.id;
          }
        }

        // Mark as imported
        await tenantPrisma.naukriCandidate.update({
          where: { id: nc.id },
          data: {
            importedToPipeline: true,
            candidateId,
            applicationId,
            status: "IMPORTED",
          },
        });
      } catch (err: any) {
        console.error(`Import error for ${nc.name}:`, err);
        if (err.code === "P2002") {
          // Duplicate - mark appropriately
          await tenantPrisma.naukriCandidate.update({
            where: { id: nc.id },
            data: { status: "DUPLICATE" },
          });
          results.push({ name: nc.name, status: "duplicate" });
        } else {
          results.push({ name: nc.name, status: "error" });
        }
      }
    }

    return NextResponse.json({
      imported: results.filter(r => r.status === "created" || r.status === "existing_updated").length,
      duplicates: results.filter(r => r.status === "duplicate").length,
      errors: results.filter(r => r.status === "error").length,
      results,
    });
  } catch (err: any) {
    console.error("Naukri import error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
