import { prisma } from "@/lib/db";
import { PipelineStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { StageBadge } from "@/components/workspace/stage-badge";
import { initials } from "@/lib/format";
import { isPlaceholderEmail } from "@/lib/candidate-utils";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function ClientPipeline() {
  const session = await getServerSession(authOptions);
  const applications = await tenantPrisma.application.findMany({
    where: {
      job: { clientId: (session?.user?.clientId ?? "") },
      stage: { in: [PipelineStage.SUBMITTED, PipelineStage.INTERVIEW_SCHEDULED, PipelineStage.INTERVIEW_COMPLETE, PipelineStage.OFFER_EXTENDED, PipelineStage.OFFER_ACCEPTED, PipelineStage.JOINED] },
    },
    orderBy: { updatedAt: "desc" },
    include: { candidate: true, job: true },
  });
  return (
    <>
      <PageTitle title="Candidate Pipeline" description="Submitted candidates for your positions." />
      <div className="rounded-xl bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Candidate</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Job</th>
              <th className="px-4 py-3 text-left">Experience</th>
              <th className="px-4 py-3 text-left">Match</th>
              <th className="px-4 py-3 text-left">Stage</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a.id} className="border-t hover:bg-accent">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">{initials(a.candidate.name)}</div>
                    <div>
                      <div className="font-medium">{a.candidate.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.candidate.currentDesignation && a.candidate.currentCompany
                          ? `${a.candidate.currentDesignation} at ${a.candidate.currentCompany}`
                          : a.candidate.currentDesignation || a.candidate.currentCompany || a.candidate.currentCity || "—"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    {a.candidate.email && !isPlaceholderEmail(a.candidate.email) && <div className="text-xs truncate max-w-[180px]">{a.candidate.email}</div>}
                    {a.candidate.phone && <div className="text-xs text-muted-foreground">{a.candidate.phone}</div>}
                    {a.candidate.currentCity && <div className="text-xs text-muted-foreground">{a.candidate.currentCity}</div>}
                  </div>
                </td>
                <td className="px-4 py-3">{a.job.title}</td>
                <td className="px-4 py-3 text-xs">
                  {a.candidate.totalExperience ? `${a.candidate.totalExperience} yrs` : "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-primary">{a.matchScore ?? "-"}%</td>
                <td className="px-4 py-3"><StageBadge stage={a.stage} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {applications.length === 0 && <div className="p-10 text-center text-muted-foreground">No candidates submitted yet.</div>}
      </div>
    </>
  );
}
