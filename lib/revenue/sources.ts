import { tenantPrisma } from "@/lib/tenant/prisma";
import type { TenantContext } from "@/lib/tenant/context";
import { estimateFeeAmount, getDefaultFeePercent } from "@/lib/revenue/fees";
import type { SourceEffectiveness } from "@/lib/revenue/types";
import { SOURCE_LABELS, isSubmittedStage, isInterviewStage, isOfferStage } from "@/lib/revenue/types";

function safeRate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

function classifyROI(source: string, joined: number, totalCandidates: number): string {
  if (totalCandidates === 0) return "low";
  const joinRate = joined / totalCandidates;
  if (source === "REFERRAL" && joinRate >= 0.05) return "high";
  if (source === "DIRECT" && joinRate >= 0.03) return "high";
  if (source === "INTERNAL_DB" && joinRate >= 0.02) return "high";
  if (joinRate >= 0.02) return "medium";
  return "low";
}

function computeSourceMetrics(source: string, group: any[], defaultPct: number): SourceEffectiveness {
  const totalCandidates = group.length;
  const applications = group.flatMap((c: any) => c.applications ?? []);
  const totalApplications = applications.length;
  const activeCandidates = group.filter((c: any) =>
    !c.applications?.every((a: any) => ["JOINED", "REJECTED"].includes(a.stage))
  ).length;

  const screened = applications.filter((a: any) => a.stage !== "NEW").length;
  const submitted = applications.filter((a: any) => isSubmittedStage(a.stage)).length;
  const interviewed = applications.filter((a: any) => isInterviewStage(a.stage)).length;
  const offered = applications.filter((a: any) => {
    return (a.offers ?? []).some((o: any) => o.status === "ACCEPTED" || o.status === "EXTENDED");
  }).length;
  const joined = applications.filter((a: any) => a.stage === "JOINED").length;

  const matchScores = applications.map((a: any) => a.matchScore).filter((s: any) => s != null);
  const avgMatchScore = matchScores.length > 0
    ? Math.round((matchScores.reduce((a: number, b: number) => a + b, 0) / matchScores.length) * 10) / 10
    : null;

  const now = Date.now();
  const daysToJoinList = applications
    .filter((a: any) => a.stage === "JOINED")
    .map((a: any) => Math.floor((now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    .filter((d: number) => d >= 0);

  const avgDaysToJoin = daysToJoinList.length > 0
    ? Math.round(daysToJoinList.reduce((a: number, b: number) => a + b, 0) / daysToJoinList.length)
    : null;

  const joinedApps = applications.filter((a: any) => a.stage === "JOINED");
  let totalEstimatedRevenue = 0;
  for (const app of joinedApps) {
    for (const offer of app.offers ?? []) {
      if (offer.status === "ACCEPTED") {
        totalEstimatedRevenue += estimateFeeAmount(offer, defaultPct);
      }
    }
  }

  const avgFeePerPlacement = joined > 0 ? Math.round(totalEstimatedRevenue / joined) : null;

  return {
    source,
    sourceLabel: SOURCE_LABELS[source] ?? source,
    totalCandidates,
    totalApplications,
    activeCandidates,
    screened,
    submitted,
    interviewed,
    offered,
    joined,
    applicationToScreen: safeRate(screened, totalApplications),
    screenToSubmit: safeRate(submitted, screened),
    submitToInterview: safeRate(interviewed, submitted),
    interviewToOffer: safeRate(offered, interviewed),
    offerToJoin: safeRate(joined, offered),
    overallConversion: safeRate(joined, totalApplications),
    averageMatchScore: avgMatchScore,
    averageDaysToJoin: avgDaysToJoin,
    averageFeePerPlacement: avgFeePerPlacement,
    totalEstimatedRevenue,
    estimatedROI: classifyROI(source, joined, totalCandidates),
  };
}

export async function computeSourceEffectiveness(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date; recruiterId?: string },
): Promise<SourceEffectiveness[]> {
  const candidateWhere: any = {};
  if (options?.from) candidateWhere.createdAt = { gte: options.from };
  if (options?.to) candidateWhere.createdAt = { ...candidateWhere.createdAt, lte: options.to };
  if (options?.recruiterId) candidateWhere.ownerId = options.recruiterId;

  const candidates = await (tenantPrisma.candidate as any).withContext(ctx).findMany({
    where: candidateWhere,
    select: {
      id: true, source: true, createdAt: true,
      applications: {
        select: {
          id: true, stage: true, matchScore: true, createdAt: true,
          offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true } },
        },
      },
    },
  });

  const bySource = new Map<string, any[]>();
  for (const candidate of candidates) {
    const source = candidate.source ?? "OTHER";
    const bucket = bySource.get(source) ?? [];
    bucket.push(candidate);
    bySource.set(source, bucket);
  }

  const defaultPct = getDefaultFeePercent(ctx);
  const results: SourceEffectiveness[] = [];
  for (const [source, group] of bySource) {
    results.push(computeSourceMetrics(source, group, defaultPct));
  }

  return results.sort((a, b) => b.totalCandidates - a.totalCandidates);
}
