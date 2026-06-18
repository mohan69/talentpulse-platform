import { tenantPrisma } from "@/lib/tenant/prisma";
import type { TenantContext } from "@/lib/tenant/context";
import { estimateFeeAmount, estimateFeeForApplication, getDefaultFeePercent } from "@/lib/revenue/fees";
import { getStageProbability } from "@/lib/revenue/types";
import type { RevenueOpportunity } from "@/lib/revenue/types";

export async function computeRevenueOpportunity(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date },
): Promise<RevenueOpportunity> {
  const defaultPct = getDefaultFeePercent(ctx);

  const appWhere: any = {};
  if (options?.from) appWhere.createdAt = { ...appWhere.createdAt, gte: options.from };
  if (options?.to) appWhere.createdAt = { ...appWhere.createdAt, lte: options.to };

  const applications = await (tenantPrisma.application as any).withContext(ctx).findMany({
    where: appWhere,
    select: {
      id: true, stage: true, createdAt: true,
      job: { select: { id: true, title: true, salaryMin: true, salaryMax: true, client: { select: { id: true, name: true } }, recruiter: { select: { id: true, name: true } } } },
      offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true, createdAt: true } },
    },
  });

  const realized = applications.filter((a: any) => a.stage === "JOINED");
  const active = applications.filter((a: any) => !["JOINED", "REJECTED", "ON_HOLD"].includes(a.stage));
  const atRiskOffers = applications.filter((a: any) =>
    (a.offers ?? []).some((o: any) => o.status === "EXTENDED" || o.status === "ACCEPTED")
  );

  // Realized revenue
  const realizedRevenue = computeRealizedRevenue(realized, defaultPct);
  const pipelineRevenue = computePipelineRevenue(active, defaultPct);
  const atRiskRevenue = computeAtRiskRevenue(atRiskOffers, defaultPct);
  const clientRevenue = computeClientRevenueBreakdown(applications, defaultPct);

  return { realizedRevenue, pipelineRevenue, atRiskRevenue, clientRevenue };
}

function computeRealizedRevenue(joinedApps: any[], defaultPct: number): RevenueOpportunity["realizedRevenue"] {
  const byRecruiter = new Map<string, { name: string; amount: number }>();
  const byClient = new Map<string, { name: string; amount: number }>();
  const byMonth = new Map<string, number>();
  let total = 0;

  for (const app of joinedApps) {
    const fee = (app.offers ?? []).reduce((sum: number, o: any) =>
      sum + (o.status === "ACCEPTED" ? estimateFeeAmount(o, defaultPct) : 0), 0);
    total += fee;

    const recruiter = app.job?.recruiter ?? {};
    if (recruiter.id) {
      const cur = byRecruiter.get(recruiter.id) ?? { name: recruiter.name ?? "Unknown", amount: 0 };
      cur.amount += fee;
      byRecruiter.set(recruiter.id, cur);
    }

    const client = app.job?.client ?? {};
    if (client.id) {
      const cur = byClient.get(client.id) ?? { name: client.name ?? "Unknown", amount: 0 };
      cur.amount += fee;
      byClient.set(client.id, cur);
    }

    const month = app.createdAt ? `${app.createdAt.getFullYear()}-${String(app.createdAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
    byMonth.set(month, (byMonth.get(month) ?? 0) + fee);
  }

  return {
    total: Math.round(total),
    byRecruiter: Array.from(byRecruiter.entries()).map(([id, v]) => ({ recruiterId: id, recruiterName: v.name, amount: Math.round(v.amount) })),
    byClient: Array.from(byClient.entries()).map(([id, v]) => ({ clientId: id, clientName: v.name, amount: Math.round(v.amount) })),
    byMonth: Array.from(byMonth.entries()).sort().map(([month, amount]) => ({ month, amount: Math.round(amount) })),
  };
}

function computePipelineRevenue(activeApps: any[], defaultPct: number): RevenueOpportunity["pipelineRevenue"] {
  const byStage = new Map<string, { count: number; totalFee: number }>();

  for (const app of activeApps) {
    const stage = app.stage;
    const fee = estimateFeeForApplication(app, defaultPct);
    const cur = byStage.get(stage) ?? { count: 0, totalFee: 0 };
    cur.count++;
    cur.totalFee += fee;
    byStage.set(stage, cur);
  }

  const stageItems = Array.from(byStage.entries())
    .map(([stage, { count, totalFee }]) => ({
      stage,
      amount: Math.round(totalFee),
      probability: getStageProbability(stage),
    }))
    .filter((s) => s.probability > 0);

  const total = stageItems.reduce((sum, s) => sum + s.amount, 0);
  const weightedTotal = stageItems.reduce((sum, s) => sum + s.amount * s.probability, 0);

  return {
    total: Math.round(total),
    byStage: stageItems,
    weightedTotal: Math.round(weightedTotal),
    expectedValue: Math.round(weightedTotal),
    optimisticValue: Math.round(stageItems.reduce((sum, s) => sum + s.amount * Math.min(1, s.probability + 0.2), 0)),
    pessimisticValue: Math.round(stageItems.filter((s) => s.probability >= 0.6).reduce((sum, s) => sum + s.amount * s.probability, 0)),
  };
}

function computeAtRiskRevenue(offeredApps: any[], defaultPct: number): RevenueOpportunity["atRiskRevenue"] {
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  let staleOffers = 0;
  let joiningAtRisk = 0;
  let total = 0;

  for (const app of offeredApps) {
    for (const offer of app.offers ?? []) {
      if (offer.status !== "EXTENDED" && offer.status !== "ACCEPTED") continue;
      const fee = estimateFeeAmount(offer, defaultPct);
      total += fee;

      if (offer.status === "EXTENDED") {
        const offerAge = now - new Date(offer.createdAt).getTime();
        if (offerAge > fourteenDays) staleOffers++;
      }
    }
    if (app.stage === "OFFER_ACCEPTED") {
      joiningAtRisk++;
    }
  }

  return { total: Math.round(total), staleOffers, joiningAtRisk };
}

function computeClientRevenueBreakdown(applications: any[], defaultPct: number): RevenueOpportunity["clientRevenue"] {
  const byClient = new Map<string, {
    name: string; totalRevenue: number; activeJobs: Set<string>; filledJobs: Set<string>;
    lastYearRevenue: number; thisYearRevenue: number;
  }>();

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  for (const app of applications) {
    const client = app.job?.client ?? {};
    if (!client.id) continue;
    const cur = byClient.get(client.id) ?? {
      name: client.name ?? "Unknown",
      totalRevenue: 0, activeJobs: new Set(), filledJobs: new Set(),
      lastYearRevenue: 0, thisYearRevenue: 0,
    };

    if (app.job?.id) {
      if (!["CLOSED", "FILLED"].includes(app.job.status ?? "")) cur.activeJobs.add(app.job.id);
      if (app.stage === "JOINED") cur.filledJobs.add(app.job.id);
    }

    const fee = (app.offers ?? []).reduce((sum: number, o: any) =>
      sum + (o.status === "ACCEPTED" ? estimateFeeAmount(o, defaultPct) : 0), 0);
    cur.totalRevenue += fee;

    if (app.createdAt && app.createdAt >= oneYearAgo) cur.thisYearRevenue += fee;
    else if (app.createdAt) cur.lastYearRevenue += fee;

    byClient.set(client.id, cur);
  }

  return Array.from(byClient.entries()).map(([clientId, v]) => {
    const trend = v.lastYearRevenue === 0 && v.thisYearRevenue > 0 ? "new"
      : v.thisYearRevenue > v.lastYearRevenue * 1.1 ? "growing"
      : v.thisYearRevenue < v.lastYearRevenue * 0.9 ? "declining"
      : "stable";

    return {
      clientId,
      clientName: v.name,
      totalRevenue: Math.round(v.totalRevenue),
      activeJobs: v.activeJobs.size,
      filledJobs: v.filledJobs.size,
      estimatedAnnualRevenue: Math.round(v.thisYearRevenue),
      revenueTrend: trend,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);
}
