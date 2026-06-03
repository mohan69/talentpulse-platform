import { prisma } from "@/lib/db";
import { PipelineStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { StatCard } from "@/components/workspace/stat-card";
import { Briefcase, Users, Calendar, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientAnalytics() {
  const session = await getServerSession(authOptions);
  const clientId = (session?.user?.clientId ?? "");
  const [openJobs, apps, interviews, joined] = await Promise.all([
    prisma.job.count({ where: { clientId, status: "OPEN" } }),
    prisma.application.count({ where: { job: { clientId } } }),
    prisma.interview.count({ where: { application: { job: { clientId } } } }),
    prisma.application.count({ where: { job: { clientId }, stage: PipelineStage.JOINED } }),
  ]);
  return (<><PageTitle title="Analytics" description="Performance metrics for your positions." />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Open Jobs" value={openJobs} icon={Briefcase} color="primary" />
      <StatCard label="Applications" value={apps} icon={Users} color="cyan" />
      <StatCard label="Interviews" value={interviews} icon={Calendar} color="amber" />
      <StatCard label="Joined" value={joined} icon={CheckCircle} color="emerald" />
    </div>
  </>);
}
