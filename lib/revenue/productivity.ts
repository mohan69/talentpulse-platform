import { tenantPrisma } from "@/lib/tenant/prisma";
import { prisma } from "@/lib/db";
import { getMemory } from "@/lib/memory/service";
import type { TenantContext } from "@/lib/tenant/context";
import { estimateFeeAmount, computeTotalFee, getDefaultFeePercent } from "@/lib/revenue/fees";
import type { RecruiterProductivityScore } from "@/lib/revenue/types";
import { isSubmittedStage, isInterviewStage, isOfferStage } from "@/lib/revenue/types";

function zeroMetrics(recruiterId: string, name: string, email: string, from: string, to: string): RecruiterProductivityScore {
  return {
    recruiterId, recruiterName: name, recruiterEmail: email,
    period: { from, to },
    applicationsProcessed: 0, averageDaysInPipeline: null, stageTransitionCount: 0, activeApplications: 0,
    averageMatchScore: null, highMatchCount: 0, interviewPassRate: null, screeningToInterviewRate: null,
    totalSubmissions: 0, submissionToOfferRate: null, submissionToJoinRate: null,
    offersExtended: 0, offersAccepted: 0, offersRejected: 0, totalJoins: 0,
    offerAcceptRate: null, averageDaysToOffer: null, averageDaysToJoin: null,
    estimatedRevenue: 0, averageFeePerPlacement: null, totalFeeValue: 0, projectedQuarterlyRevenue: 0,
  };
}

function safeRate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

function safeAvg(values: number[]): number | null {
  return values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

export async function computeRecruiterProductivity(
  ctx: TenantContext,
  recruiterId: string,
  options?: { from?: Date; to?: Date },
): Promise<RecruiterProductivityScore> {
  const user = await prisma.user.findUnique({
    where: { id: recruiterId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return zeroMetrics(recruiterId, "", "", "", "");

  const from = options?.from ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const to = options?.to ?? new Date();
  const periodStr = (d: Date) => d.toISOString().split("T")[0];
  const defaultPct = getDefaultFeePercent(ctx);

  const jobWhere: any = { recruiterId };
  if (options?.from || options?.to) jobWhere.createdAt = { ...(options?.from ? { gte: options.from } : {}), ...(options?.to ? { lte: options.to } : {}) };

  const jobs = await (tenantPrisma.job as any).withContext(ctx).findMany({
    where: jobWhere,
    select: { id: true },
  });
  const jobIds = jobs.map((j: any) => j.id);
  if (jobIds.length === 0) return zeroMetrics(recruiterId, user.name, user.email, periodStr(from), periodStr(to));

  const appWhere: any = { jobId: { in: jobIds } };
  if (options?.from || options?.to) {
    appWhere.createdAt = {};
    if (options?.from) appWhere.createdAt.gte = options.from;
    if (options?.to) appWhere.createdAt.lte = options.to;
  }

  const applications = await (tenantPrisma.application as any).withContext(ctx).findMany({
    where: appWhere,
    select: {
      id: true, stage: true, matchScore: true, createdAt: true, updatedAt: true,
      interviews: { select: { outcome: true } },
      offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true, createdAt: true } },
    },
  });

  if (applications.length === 0) return zeroMetrics(recruiterId, user.name, user.email, periodStr(from), periodStr(to));

  const memory = await getMemory(ctx, {
    entityType: "application",
    action: "stage_changed",
    userId: recruiterId,
    since: from,
    until: to,
    includeDismissed: true,
  });

  const allInterviews = applications.flatMap((a: any) => a.interviews ?? []);
  const completedInterviews = allInterviews.filter((i: any) => i.outcome && i.outcome !== "PENDING");
  const proceededInterviews = completedInterviews.filter((i: any) => i.outcome === "PROCEED");

  const offers = applications.flatMap((a: any) => a.offers ?? []);
  const extendedOffers = offers.filter((o: any) => o.status === "EXTENDED" || o.status === "ACCEPTED");
  const acceptedOffers = offers.filter((o: any) => o.status === "ACCEPTED");
  const rejectedOffers = offers.filter((o: any) => o.status === "REJECTED");

  const joinedApps = applications.filter((a: any) => a.stage === "JOINED");
  const submittedApps = applications.filter((a: any) => isSubmittedStage(a.stage));
  const interviewApps = applications.filter((a: any) => isInterviewStage(a.stage));

  const now = Date.now();
  const daysInPipelineList: number[] = [];
  const daysToOfferList: number[] = [];
  const daysToJoinList: number[] = [];

  for (const app of applications) {
    const days = Math.floor((now - new Date(app.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    daysInPipelineList.push(days);

    const offer = app.offers?.[0];
    if (offer && (offer.status === "ACCEPTED" || offer.status === "EXTENDED")) {
      const daysToOffer = Math.floor((new Date(offer.createdAt).getTime() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysToOffer >= 0) daysToOfferList.push(daysToOffer);
    }
    if (app.stage === "JOINED") {
      const daysToJoin = Math.floor((now - new Date(app.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysToJoin >= 0) daysToJoinList.push(daysToJoin);
    }
  }

  const matchScores = applications.map((a: any) => a.matchScore).filter((s: any) => s != null);
  const avgMatchScore = matchScores.length > 0 ? Math.round((matchScores.reduce((a: number, b: number) => a + b, 0) / matchScores.length) * 10) / 10 : null;
  const highMatchCount = matchScores.filter((s: number) => s >= 80).length;
  const activeApps = applications.filter((a: any) => !["JOINED", "REJECTED", "ON_HOLD"].includes(a.stage)).length;

  const totalFeeValue = computeTotalFee(applications, defaultPct);
  const estimatedRevenue = joinedApps.reduce((sum: number, app: any) => sum + computeTotalFee([app], defaultPct), 0);

  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentApps = applications.filter((a: any) => new Date(a.createdAt) >= threeMonthsAgo);
  const recentRevenue = computeTotalFee(recentApps, defaultPct);

  return {
    recruiterId: user.id,
    recruiterName: user.name,
    recruiterEmail: user.email,
    period: { from: periodStr(from), to: periodStr(to) },
    applicationsProcessed: applications.length,
    averageDaysInPipeline: safeAvg(daysInPipelineList),
    stageTransitionCount: memory.total,
    activeApplications: activeApps,
    averageMatchScore: avgMatchScore,
    highMatchCount,
    interviewPassRate: safeRate(proceededInterviews.length, completedInterviews.length),
    screeningToInterviewRate: safeRate(interviewApps.length, applications.length),
    totalSubmissions: submittedApps.length,
    submissionToOfferRate: safeRate(extendedOffers.length, submittedApps.length),
    submissionToJoinRate: safeRate(joinedApps.length, submittedApps.length),
    offersExtended: extendedOffers.length,
    offersAccepted: acceptedOffers.length,
    offersRejected: rejectedOffers.length,
    totalJoins: joinedApps.length,
    offerAcceptRate: safeRate(acceptedOffers.length, extendedOffers.length),
    averageDaysToOffer: safeAvg(daysToOfferList),
    averageDaysToJoin: safeAvg(daysToJoinList),
    estimatedRevenue,
    averageFeePerPlacement: joinedApps.length > 0 ? Math.round(estimatedRevenue / joinedApps.length) : null,
    totalFeeValue,
    projectedQuarterlyRevenue: recentRevenue * 4,
  };
}

export async function computeAllRecruiterProductivity(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date },
): Promise<RecruiterProductivityScore[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "RECRUITER",
      organizationMemberships: { some: { organizationId: ctx.organizationId, status: "ACTIVE" } },
    },
    select: { id: true, name: true, email: true },
  });

  const results = await Promise.all(
    users.map((u) => computeRecruiterProductivity(ctx, u.id, options)),
  );

  return results.sort((a, b) => b.totalJoins - a.totalJoins);
}
