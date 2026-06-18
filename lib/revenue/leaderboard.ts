import type { TenantContext } from "@/lib/tenant/context";
import { computeAllRecruiterProductivity } from "@/lib/revenue/productivity";
import type { RecruiterProductivityScore, LeaderboardEntry } from "@/lib/revenue/types";

const LEADERBOARD_WEIGHTS = { velocity: 0.15, quality: 0.25, closure: 0.30, revenue: 0.30 };

function scoreVelocity(metrics: RecruiterProductivityScore): number {
  const appScore = Math.min(100, metrics.applicationsProcessed * 5);
  const daysScore = metrics.averageDaysInPipeline != null
    ? Math.max(0, 100 - metrics.averageDaysInPipeline)
    : 50;
  return Math.round(appScore * 0.4 + daysScore * 0.6);
}

function scoreQuality(metrics: RecruiterProductivityScore): number {
  const passRate = metrics.interviewPassRate ?? 50;
  const matchScore = metrics.averageMatchScore ?? 50;
  const submitToOffer = metrics.submissionToOfferRate ?? 0;
  return Math.round(passRate * 0.3 + matchScore * 0.3 + submitToOffer * 0.4);
}

function scoreClosure(metrics: RecruiterProductivityScore): number {
  const joinScore = Math.min(100, metrics.totalJoins * 20);
  const acceptRate = metrics.offerAcceptRate ?? 0;
  const speedScore = metrics.averageDaysToJoin != null
    ? Math.max(0, 100 - metrics.averageDaysToJoin)
    : 50;
  return Math.round(joinScore * 0.4 + acceptRate * 0.3 + speedScore * 0.3);
}

function scoreRevenue(metrics: RecruiterProductivityScore): number {
  return Math.min(100, Math.round(metrics.estimatedRevenue / 100000));
}

function assignBadges(metrics: RecruiterProductivityScore, scores: { velocity: number; quality: number; closure: number; revenue: number; overall: number }): string[] {
  const badges: string[] = [];
  if (scores.overall >= 85) badges.push("top-performer");
  if (scores.revenue >= 80) badges.push("revenue-leader");
  if (scores.quality >= 80) badges.push("quality-champion");
  if (scores.closure >= 70 && scores.closure < 85) badges.push("closing-expert");
  if (scores.velocity >= 80) badges.push("speed-demon");
  if (metrics.totalJoins >= 5 && scores.overall < 60) badges.push("rising-star");
  return badges;
}

export async function computeLeaderboard(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date },
): Promise<LeaderboardEntry[]> {
  const scores = await computeAllRecruiterProductivity(ctx, options);

  const dims = scores.map((metrics: RecruiterProductivityScore) => ({
    velocity: scoreVelocity(metrics),
    quality: scoreQuality(metrics),
    closure: scoreClosure(metrics),
    revenue: scoreRevenue(metrics),
  }));

  const entries: LeaderboardEntry[] = scores.map((metrics: RecruiterProductivityScore, i: number) => {
    const overall = Math.round(
      dims[i].velocity * LEADERBOARD_WEIGHTS.velocity +
      dims[i].quality * LEADERBOARD_WEIGHTS.quality +
      dims[i].closure * LEADERBOARD_WEIGHTS.closure +
      dims[i].revenue * LEADERBOARD_WEIGHTS.revenue
    );
    const s = { overall, ...dims[i] };
    return {
      rank: 0,
      recruiterId: metrics.recruiterId,
      recruiterName: metrics.recruiterName,
      recruiterEmail: metrics.recruiterEmail,
      scores: s,
      raw: {
        totalApplications: metrics.applicationsProcessed,
        totalSubmissions: metrics.totalSubmissions,
        totalInterviews: metrics.offersExtended,
        totalOffers: metrics.offersAccepted,
        totalJoins: metrics.totalJoins,
        estimatedRevenue: metrics.estimatedRevenue,
        averageDaysToJoin: metrics.averageDaysToJoin,
      },
      trend: "stable",
      previousRank: null,
      badges: assignBadges(metrics, s),
    };
  });

  entries.sort((a, b) => b.scores.overall - a.scores.overall);
  entries.forEach((entry, i) => { entry.rank = i + 1; });

  return entries;
}
