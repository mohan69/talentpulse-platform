import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const clientFilter = url.searchParams.get("clientId");

  const jobWhere: any = {};
  if (user.role === "CLIENT") jobWhere.clientId = user.clientId;
  else if (clientFilter) jobWhere.clientId = clientFilter;

  const appWhere: any = {};
  if (user.role === "CLIENT") appWhere.job = { clientId: user.clientId };
  else if (clientFilter) appWhere.job = { clientId: clientFilter };

  const [
    jobs,
    applications,
    interviews,
    offers,
    totalCandidates,
    totalClients,
    prospectsByStatus,
    totalProspects,
  ] = await Promise.all([
    tenantPrisma.job.groupBy({ by: ["status"], _count: true, where: jobWhere }),
    tenantPrisma.application.groupBy({ by: ["stage"], _count: true, where: appWhere }),
    tenantPrisma.interview.count({ where: appWhere.job ? { application: appWhere } : {} }),
    prisma.offer.groupBy({ by: ["status"], _count: true, where: appWhere.job ? { application: appWhere } : {} }),
    tenantPrisma.candidate.count(),
    tenantPrisma.client.count(),
    prisma.prospect.groupBy({ by: ["status"], _count: true }),
    prisma.prospect.count(),
  ]);

  const sourceStats = await tenantPrisma.candidate.groupBy({
    by: ["source"],
    _count: true,
  });

  // Recruiter performance (only for admin)
  let recruiterStats: any[] = [];
  if (user.role === "ADMIN") {
    const recruiters = await prisma.user.findMany({
      where: { role: "RECRUITER" },
      include: {
        ownedCandidates: { select: { applications: { select: { stage: true } } } },
      },
    });
    recruiterStats = recruiters.map((r: any) => {
      const allApps = r.ownedCandidates.flatMap((c: any) => c.applications);
      return {
        id: r.id,
        name: r.name,
        submissions: allApps.filter((a: any) => ["SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(a.stage)).length,
        interviews: allApps.filter((a: any) => ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(a.stage)).length,
        offers: allApps.filter((a: any) => ["OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(a.stage)).length,
        closures: allApps.filter((a: any) => a.stage === "JOINED").length,
      };
    });
  }

  // Monthly submissions trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentApps = await tenantPrisma.application.findMany({
    where: { ...appWhere, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, stage: true },
  });
  const trendMap = new Map<string, { submissions: number; interviews: number; offers: number }>();
  for (const a of recentApps) {
    const key = `${a.createdAt.getFullYear()}-${String(a.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const cur = trendMap.get(key) ?? { submissions: 0, interviews: 0, offers: 0 };
    if (["SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(a.stage))
      cur.submissions++;
    if (["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(a.stage))
      cur.interviews++;
    if (["OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(a.stage)) cur.offers++;
    trendMap.set(key, cur);
  }
  const trend = Array.from(trendMap.entries())
    .sort()
    .map(([month, v]) => ({ month, ...v }));

  // ── KPI calculations ──
  const openJobs = jobs.find((j: any) => j.status === "OPEN")?._count ?? 0;
  const closedJobs = jobs.find((j: any) => j.status === "CLOSED")?._count ?? 0;
  const totalJobs = jobs.reduce((a: number, b: any) => a + b._count, 0);
  const totalApplications = applications.reduce((a: number, b: any) => a + b._count, 0);
  const offersExtended = (offers.find((o: any) => o.status === "EXTENDED")?._count ?? 0)
    + (offers.find((o: any) => o.status === "ACCEPTED")?._count ?? 0);
  const joined = applications.find((a: any) => a.stage === "JOINED")?._count ?? 0;
  const rejected = applications.find((a: any) => a.stage === "REJECTED")?._count ?? 0;
  const interviewComplete = applications.find((a: any) => a.stage === "INTERVIEW_COMPLETE")?._count ?? 0;
  const interviewScheduled = applications.find((a: any) => a.stage === "INTERVIEW_SCHEDULED")?._count ?? 0;
  const totalInterviewStage = interviewScheduled + interviewComplete;
  const prospectConverted = prospectsByStatus.find((p: any) => p.status === "CONVERTED")?._count ?? 0;

  // Conversion rates
  const screenToInterview = totalApplications > 0 ? Math.round((totalInterviewStage / totalApplications) * 100) : 0;
  const interviewToOffer = totalInterviewStage > 0 ? Math.round((offersExtended / totalInterviewStage) * 100) : 0;
  const offerToJoin = offersExtended > 0 ? Math.round((joined / offersExtended) * 100) : 0;
  const overallConversion = totalApplications > 0 ? Math.round((joined / totalApplications) * 100) : 0;
  const prospectConversion = totalProspects > 0 ? Math.round((prospectConverted / totalProspects) * 100) : 0;
  const fillRate = totalJobs > 0 ? Math.round((closedJobs / totalJobs) * 100) : 0;

  // Prospect status distribution
  const prospectFunnel = prospectsByStatus.map((p: any) => ({
    status: p.status,
    count: p._count,
  }));

  return NextResponse.json({
    stats: { openJobs, totalApplications, offersExtended, joined, totalCandidates, totalClients, totalProspects, prospectConverted },
    kpis: {
      screenToInterview,
      interviewToOffer,
      offerToJoin,
      overallConversion,
      prospectConversion,
      fillRate,
      totalJobs,
      closedJobs,
      rejected,
    },
    funnel: applications,
    interviews,
    offers,
    sourceStats,
    recruiterStats,
    trend,
    prospectFunnel,
  });
}
