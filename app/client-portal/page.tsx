import { prisma } from "@/lib/db";
import { PipelineStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { StatCard } from "@/components/workspace/stat-card";
import { StageBadge } from "@/components/workspace/stage-badge";
import { Briefcase, Users, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const session = await getServerSession(authOptions);
  const clientId = session?.user?.clientId ?? "";
  const [openJobs, submitted, interviews, joined, submittedList] = await Promise.all([
    prisma.job.count({ where: { clientId, status: "OPEN" } }),
    prisma.application.count({ where: { job: { clientId }, stage: { in: [PipelineStage.SUBMITTED, PipelineStage.INTERVIEW_SCHEDULED, PipelineStage.INTERVIEW_COMPLETE, PipelineStage.OFFER_EXTENDED, PipelineStage.OFFER_ACCEPTED] } } }),
    prisma.interview.count({ where: { application: { job: { clientId } }, status: "SCHEDULED" } }),
    prisma.application.count({ where: { job: { clientId }, stage: PipelineStage.JOINED } }),
    prisma.application.findMany({ where: { job: { clientId }, stage: { in: [PipelineStage.SUBMITTED, PipelineStage.INTERVIEW_SCHEDULED, PipelineStage.INTERVIEW_COMPLETE] } }, orderBy: { updatedAt: "desc" }, take: 10, include: { candidate: true, job: true } }),
  ]);

  return (
    <>
      <PageTitle title="Client Portal" description="Track active positions and candidate submissions." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open Positions" value={openJobs} icon={Briefcase} color="primary" />
        <StatCard label="Submitted" value={submitted} icon={Users} color="cyan" />
        <StatCard label="Interviews" value={interviews} icon={Calendar} color="amber" />
        <StatCard label="Joined" value={joined} icon={CheckCircle} color="emerald" />
      </div>
      <div className="rounded-xl bg-card shadow-sm p-5">
        <h2 className="font-display text-lg font-semibold mb-4">Latest Submissions</h2>
        <div className="space-y-2">
          {submittedList.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
              <div>
                <div className="font-medium">{a.candidate.name}</div>
                <div className="text-xs text-muted-foreground">{a.job.title} · Match {a.matchScore ?? "-"}</div>
              </div>
              <StageBadge stage={a.stage} />
            </div>
          ))}
          {submittedList.length === 0 && <div className="text-sm text-muted-foreground">No submissions yet.</div>}
        </div>
        <div className="mt-4"><Link href="/client-portal/pipeline" className="text-sm text-primary hover:underline">View full pipeline →</Link></div>
      </div>
    </>
  );
}
