import type { TenantContext } from "@/lib/tenant/context";
import { computeRecruiterProductivity } from "@/lib/revenue/productivity";
import { computeLeaderboard } from "@/lib/revenue/leaderboard";
import { computeSourceEffectiveness } from "@/lib/revenue/sources";
import { getMemoryByUser } from "@/lib/memory/service";
import { tenantPrisma } from "@/lib/tenant/prisma";
import { estimateFeeForApplication, getDefaultFeePercent } from "@/lib/revenue/fees";
import { getStageProbability, isSubmittedStage } from "@/lib/revenue/types";
import type { OwnerDashboardMetrics } from "@/lib/revenue/types";

export async function getOwnerDashboard(
  ctx: TenantContext,
  userId: string,
  options?: { from?: Date; to?: Date },
): Promise<OwnerDashboardMetrics | null> {
  const personal = await computeRecruiterProductivity(ctx, userId, options);
  if (!personal) return null;

  const leaderboard = await computeLeaderboard(ctx, options);
  const leaderboardEntry = leaderboard.find((e) => e.recruiterId === userId);
  if (!leaderboardEntry) return null;

  const from = options?.from ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const to = options?.to ?? new Date();
  const periodStr = (d: Date) => d.toISOString().split("T")[0];

  const activeApps = await (tenantPrisma.application as any).withContext(ctx).findMany({
    where: {
      stage: { notIn: ["JOINED", "REJECTED", "ON_HOLD"] },
      job: { recruiterId: userId },
    },
    select: {
      id: true, stage: true, createdAt: true,
      candidate: { select: { id: true, name: true } },
      job: { select: { id: true, title: true, salaryMin: true, salaryMax: true, client: { select: { id: true, name: true } } } },
      offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true } },
    },
  });

  const defaultPct = getDefaultFeePercent(ctx);

  // Pipeline health
  const byStage = new Map<string, { count: number; value: number }>();
  let now = Date.now();

  for (const app of activeApps) {
    const stage = app.stage;
    const fee = estimateFeeForApplication(app, defaultPct);
    const prob = getStageProbability(stage);
    const cur = byStage.get(stage) ?? { count: 0, value: 0 };
    cur.count++;
    cur.value += fee * prob;
    byStage.set(stage, cur);
  }

  const pipelineByStage = Array.from(byStage.entries()).map(([stage, v]) => ({
    stage, count: v.count, value: Math.round(v.value),
  }));

  const expectedRevenue = pipelineByStage.reduce((sum, s) => sum + s.value, 0);

  // Aging
  let stale = 0, warning = 0, healthy = 0;
  for (const app of activeApps) {
    const days = Math.floor((now - new Date(app.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 30) stale++;
    else if (days > 14) warning++;
    else healthy++;
  }

  // Top prospect (highest expected value)
  const prospects = activeApps.map((app: any) => {
    const fee = estimateFeeForApplication(app, defaultPct);
    const prob = getStageProbability(app.stage);
    return {
      applicationId: app.id,
      candidateName: app.candidate?.name ?? "Unknown",
      jobTitle: app.job?.title ?? "Unknown",
      probability: prob,
      expectedValue: Math.round(fee * prob),
    };
  }).sort((a: any, b: any) => b.expectedValue - a.expectedValue);

  const topProspect = prospects.length > 0 ? prospects[0] : null;

  // Client health for this recruiter's clients
  const jobs = await (tenantPrisma.job as any).withContext(ctx).findMany({
    where: { recruiterId: userId },
    select: {
      id: true, status: true, client: { select: { id: true, name: true } },
      applications: {
        select: { id: true, stage: true, submittedAt: true },
        ...(options?.from ? { where: { createdAt: { gte: options.from } } } : {}),
      },
    },
  });

  const clientMap = new Map<string, { name: string; revenue: number; activeJobs: number; lastSubmission: Date | null }>();
  for (const job of jobs) {
    const client = job.client ?? {};
    if (!client.id) continue;
    const cur = clientMap.get(client.id) ?? { name: client.name ?? "Unknown", revenue: 0, activeJobs: 0, lastSubmission: null as Date | null };
    if (job.status === "OPEN") cur.activeJobs++;
    for (const app of job.applications ?? []) {
      if (app.stage === "JOINED") cur.revenue += 0; // revenue captured via offers
      if (app.submittedAt && (!cur.lastSubmission || new Date(app.submittedAt) > cur.lastSubmission)) {
        cur.lastSubmission = new Date(app.submittedAt);
      }
    }
    clientMap.set(client.id, cur);
  }

  const topClients = Array.from(clientMap.entries())
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(([id, v]) => ({ clientId: id, name: v.name, revenue: Math.round(v.revenue) }));

  const atRiskClients = Array.from(clientMap.entries())
    .filter(([, v]) => {
      if (!v.lastSubmission) return true;
      return (Date.now() - v.lastSubmission.getTime()) / (1000 * 60 * 60 * 24) > 30;
    })
    .map(([id, v]) => {
      const reason = !v.lastSubmission ? "No submissions yet"
        : `${Math.floor((Date.now() - v.lastSubmission!.getTime()) / (1000 * 60 * 60 * 24))} days since last submission`;
      return { clientId: id, name: v.name, reason };
    });

  // Sources
  const sources = await computeSourceEffectiveness(ctx, { ...options, recruiterId: userId });

  // Recent activity
  const recentMemory = await getMemoryByUser(ctx, userId, { limit: 10 }).catch(() => ({ entries: [] }));

  // Revenue summary
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentApps = activeApps.filter((a: any) => new Date(a.createdAt) >= threeMonthsAgo);
  const quarterlyRevenue = recentApps.reduce((sum: number, app: any) => {
    return sum + estimateFeeForApplication(app, defaultPct) * getStageProbability(app.stage);
  }, 0);

  return {
    ownerId: userId,
    ownerName: personal.recruiterName,
    ownerRole: "RECRUITER",
    period: { from: periodStr(from), to: periodStr(to) },
    personal,
    rank: {
      overall: leaderboardEntry.rank,
      totalRecruiters: leaderboard.length,
      percentile: leaderboard.length > 0 ? Math.round((1 - (leaderboardEntry.rank - 1) / leaderboard.length) * 100) : 0,
      previousRank: leaderboardEntry.previousRank,
      trend: leaderboardEntry.trend,
    },
    leaderboardEntry,
    pipeline: {
      totalActive: activeApps.length,
      byStage: pipelineByStage,
      aging: { stale, warning, healthy },
      expectedRevenue,
      topProspect,
    },
    clients: {
      totalClients: clientMap.size,
      activeClients: Array.from(clientMap.values()).filter((c) => c.activeJobs > 0).length,
      topClients,
      atRiskClients,
    },
    sources,
    revenue: {
      realizedThisPeriod: personal.estimatedRevenue,
      pipelineExpected: expectedRevenue,
      projectedQuarterly: Math.round(quarterlyRevenue * 4),
      yoyGrowth: null,
    },
    recentActivity: (recentMemory as any).entries?.slice(0, 10).map((e: any) => ({
      type: e.action,
      summary: e.metadata?.summary ?? e.action,
      timestamp: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
      entityId: e.entityId,
    })) ?? [],
  };
}
