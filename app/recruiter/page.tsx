import { prisma } from "@/lib/db";
import { PipelineStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { StatCard } from "@/components/workspace/stat-card";
import { StageBadge } from "@/components/workspace/stage-badge";
import { Briefcase, Users, Calendar, Target, UserSearch } from "lucide-react";
import Link from "next/link";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RecruiterDashboard() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id ?? "";
  const [myJobs, myApps, myInterviews, myProspects, recent] = await Promise.all([
    tenantPrisma.job.count({ where: { recruiterId: uid, status: "OPEN" } }),
    tenantPrisma.application.count({ where: { job: { recruiterId: uid }, stage: { notIn: [PipelineStage.REJECTED, PipelineStage.JOINED] } } }),
    tenantPrisma.interview.count({ where: { application: { job: { recruiterId: uid } }, status: "SCHEDULED" } }),
    prisma.prospect.count({ where: { ownerId: uid, status: { not: "CONVERTED" } } }),
    tenantPrisma.application.findMany({ where: { job: { recruiterId: uid } }, orderBy: { updatedAt: "desc" }, take: 10, include: { candidate: true, job: true } }),
  ]);

  return (
    <>
      <PageTitle title={`Hi ${session?.user?.name?.split(" ")[0] ?? "there"}👋`} description="Your active work and priorities." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Open Jobs" value={myJobs} icon={Briefcase} color="primary" />
        <StatCard label="Active Pipeline" value={myApps} icon={Users} color="cyan" />
        <StatCard label="Interviews" value={myInterviews} icon={Calendar} color="amber" />
        <StatCard label="Prospects" value={myProspects} icon={UserSearch} color="violet" hint="Active prospects" />
        <StatCard label="Offers" value={0} icon={Target} color="emerald" />
      </div>
      <div className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Recent Activity</h2>
          <Link href="/recruiter/pipeline" className="text-xs text-primary hover:underline">View pipeline →</Link>
        </div>
        <div className="space-y-2">
          {recent.map((a) => (
            <Link key={a.id} href={`/recruiter/candidates/${a.candidateId}`} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.candidate.name}</div>
                <div className="text-xs text-muted-foreground truncate">{a.job.title}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">Match {a.matchScore ?? "-"}</span>
                <StageBadge stage={a.stage} />
              </div>
            </Link>
          ))}
          {recent.length === 0 && <div className="text-sm text-muted-foreground">No applications yet.</div>}
        </div>
      </div>
    </>
  );
}
