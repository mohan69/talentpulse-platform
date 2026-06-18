import { tenantPrisma } from "@/lib/tenant/prisma";
import type { TenantContext } from "@/lib/tenant/context";
import { estimateFeeAmount, estimateFeeForApplication, getDefaultFeePercent } from "@/lib/revenue/fees";
import { getStageProbability, isSubmittedStage, isInterviewStage } from "@/lib/revenue/types";
import type { ClientProfitabilitySignal } from "@/lib/revenue/types";

function classifyEngagementHealth(activeJobs: number, lastSubmissionDate: string | null): string {
  if (activeJobs >= 3 && lastSubmissionDate !== null) return "high";
  if (activeJobs >= 1) return "medium";
  return "low";
}

function classifyChurnRisk(lastSubmissionDate: string | null): string {
  if (!lastSubmissionDate) return "high";
  const daysSinceLastSub = (Date.now() - new Date(lastSubmissionDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSub > 90) return "high";
  if (daysSinceLastSub > 30) return "medium";
  return "low";
}

function computeSingleClientProfitability(client: any, defaultPct: number): ClientProfitabilitySignal {
  const jobs = client.jobs ?? [];
  const allApplications = jobs.flatMap((j: any) => j.applications ?? []);
  const activeJobs = jobs.filter((j: any) => j.status === "OPEN").length;
  const filledJobs = jobs.filter((j: any) => j.status === "FILLED").length;

  const submitted = allApplications.filter((a: any) => isSubmittedStage(a.stage)).length;
  const interviewed = allApplications.filter((a: any) => isInterviewStage(a.stage)).length;

  const joinedApps = allApplications.filter((a: any) => a.stage === "JOINED");
  const totalRevenue = joinedApps.reduce((sum: number, a: any) => {
    return sum + (a.offers ?? []).reduce((s: number, o: any) =>
      s + (o.status === "ACCEPTED" ? estimateFeeAmount(o, defaultPct) : 0), 0);
  }, 0);

  const activeAppIds = new Set(allApplications.filter((a: any) =>
    !["JOINED", "REJECTED", "ON_HOLD"].includes(a.stage)
  ).map((a: any) => a.id));

  const pendingPipelineValue = allApplications
    .filter((a: any) => activeAppIds.has(a.id))
    .reduce((sum: number, a: any) => sum + estimateFeeForApplication(a, defaultPct) * getStageProbability(a.stage), 0);

  const avgDaysToFillList = joinedApps
    .map((a: any) => Math.floor((Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d: number) => d >= 0);

  const avgDaysToFill = avgDaysToFillList.length > 0
    ? Math.round(avgDaysToFillList.reduce((a: number, b: number) => a + b, 0) / avgDaysToFillList.length)
    : null;

  const lastSubmission = allApplications
    .filter((a: any) => a.submittedAt)
    .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
  const lastSubmissionDate = lastSubmission?.submittedAt
    ? new Date(lastSubmission.submittedAt).toISOString().split("T")[0]
    : null;

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const thisYearRevenue = joinedApps
    .filter((a: any) => a.createdAt && a.createdAt >= oneYearAgo)
    .reduce((sum: number, a: any) => sum + (a.offers ?? []).reduce((s: number, o: any) =>
      s + (o.status === "ACCEPTED" ? estimateFeeAmount(o, defaultPct) : 0), 0), 0);
  const lastYearRevenue = joinedApps
    .filter((a: any) => a.createdAt && a.createdAt < oneYearAgo)
    .reduce((sum: number, a: any) => sum + (a.offers ?? []).reduce((s: number, o: any) =>
      s + (o.status === "ACCEPTED" ? estimateFeeAmount(o, defaultPct) : 0), 0), 0);

  const revenueTrend = lastYearRevenue === 0 && thisYearRevenue > 0 ? "new"
    : thisYearRevenue > lastYearRevenue * 1.1 ? "growing"
    : thisYearRevenue < lastYearRevenue * 0.9 ? "declining"
    : "stable";

  return {
    clientId: client.id,
    clientName: client.name,
    industry: client.industry,
    isActive: client.isActive ?? true,
    totalJobs: jobs.length,
    activeJobs,
    filledJobs,
    totalApplications: allApplications.length,
    totalSubmissions: submitted,
    totalInterviews: interviewed,
    totalEstimatedRevenue: Math.round(totalRevenue),
    pendingPipelineValue: Math.round(pendingPipelineValue),
    totalOpportunityValue: Math.round(totalRevenue + pendingPipelineValue),
    averageFeePerFill: filledJobs > 0 ? Math.round(totalRevenue / filledJobs) : null,
    applicationsPerFill: filledJobs > 0 ? Math.round(allApplications.length / filledJobs) : null,
    interviewsPerFill: filledJobs > 0 ? Math.round(interviewed / filledJobs) : null,
    submissionsPerFill: filledJobs > 0 ? Math.round(submitted / filledJobs) : null,
    averageDaysToFill: avgDaysToFill,
    revenueTrend,
    engagementHealth: classifyEngagementHealth(activeJobs, lastSubmissionDate),
    churnRisk: classifyChurnRisk(lastSubmissionDate),
    lastSubmissionDate,
  };
}

export async function computeClientProfitability(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date; clientId?: string },
): Promise<ClientProfitabilitySignal[]> {
  const defaultPct = getDefaultFeePercent(ctx);

  const clientWhere: any = {};
  if (options?.clientId) clientWhere.id = options.clientId;

  const clients = await (tenantPrisma.client as any).withContext(ctx).findMany({
    where: clientWhere,
    select: {
      id: true, name: true, industry: true, isActive: true,
      jobs: {
        select: {
          id: true, status: true, createdAt: true,
          applications: {
            select: {
              id: true, stage: true, matchScore: true, createdAt: true, submittedAt: true,
              offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true } },
            },
            ...(options?.from ? { where: { createdAt: { gte: options.from } } } : {}),
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return clients.map((client: any) => computeSingleClientProfitability(client, defaultPct))
    .sort((a: any, b: any) => b.totalEstimatedRevenue - a.totalEstimatedRevenue);
}
