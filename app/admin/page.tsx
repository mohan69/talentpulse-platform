import { prisma } from "@/lib/db";
import { PipelineStage } from "@prisma/client";
import { PageTitle } from "@/components/workspace/page-title";
import { StatCard } from "@/components/workspace/stat-card";
import { StageBadge } from "@/components/workspace/stage-badge";
import { Briefcase, Users, Calendar, TrendingUp, CheckCircle2, UserSearch } from "lucide-react";
import Link from "next/link";
import { formatDate, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [openJobs, totalCandidates, totalProspects, activeApps, scheduledInterviews, recentApps, recentActivity] = await Promise.all([
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.candidate.count(),
    prisma.prospect.count({ where: { status: { not: "CONVERTED" } } }),
    prisma.application.count({ where: { stage: { notIn: [PipelineStage.REJECTED, PipelineStage.JOINED] } } }),
    prisma.interview.count({ where: { status: "SCHEDULED" } }),
    prisma.application.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { candidate: true, job: true } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } }),
  ]);

  return (
    <>
      <PageTitle title="Overview" description="Your recruitment pulse at a glance." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Prospects" value={totalProspects} icon={UserSearch} color="violet" hint="Active prospect leads" />
        <StatCard label="Open Jobs" value={openJobs} icon={Briefcase} color="primary" />
        <StatCard label="Candidates" value={totalCandidates} icon={Users} color="cyan" />
        <StatCard label="Active Apps" value={activeApps} icon={TrendingUp} color="emerald" />
        <StatCard label="Interviews" value={scheduledInterviews} icon={Calendar} color="amber" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Recent Applications</h2>
            <Link href="/admin/pipeline" className="text-xs text-primary hover:underline">View pipeline →</Link>
          </div>
          <div className="space-y-3">
            {recentApps.map((a) => (
              <Link key={a.id} href={`/admin/candidates/${a.candidateId}`} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.candidate.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.job.title}</div>
                </div>
                <StageBadge stage={a.stage} />
              </Link>
            ))}
            {recentApps.length === 0 && <div className="text-sm text-muted-foreground">No applications yet.</div>}
          </div>
        </div>
        <div className="rounded-xl bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Activity Feed</h2>
          </div>
          <div className="space-y-3">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex gap-3 p-3 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm">{log.action}</div>
                  <div className="text-xs text-muted-foreground">{log.user?.name ?? "System"} · {timeAgo(log.createdAt)}</div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && <div className="text-sm text-muted-foreground">No activity yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
