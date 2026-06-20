import { PageTitle } from "@/components/workspace/page-title";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { tenantPrisma } from "@/lib/repositories";
import { resolveTenantContext } from "@/lib/tenant/context";
import { computeLeaderboard } from "@/lib/revenue/leaderboard";
import { computeApplicationIntelligence, formatCurrency, type RevenueApplication } from "@/lib/phase4/recruiter-revenue";

export const dynamic = "force-dynamic";

async function loadData() {
  const ctx = await resolveTenantContext();
  const [jobs, candidates, applications, leaderboard] = await Promise.all([
    tenantPrisma.job.findMany({ where: { status: "OPEN" }, select: { id: true } }),
    tenantPrisma.candidate.findMany({ select: { id: true } }),
    tenantPrisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        candidate: true,
        job: { include: { client: true, recruiter: { select: { id: true, name: true, email: true } } } },
        interviews: { select: { id: true, status: true, outcome: true, rating: true } },
        offers: { select: { id: true, status: true, offeredCtc: true, feeAmount: true, feePercent: true } },
      },
    }),
    ctx ? computeLeaderboard(ctx).catch(() => []) : Promise.resolve([]),
  ]);
  return { jobs, candidates, applications: applications as unknown as RevenueApplication[], leaderboard };
}

export default async function RevenueIntelligencePage() {
  const { jobs, candidates, applications, leaderboard } = await loadData();
  const insights = applications.map(computeApplicationIntelligence);
  const submissions = applications.filter((app) => ["SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(app.stage)).length;
  const interviews = applications.filter((app) => ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(app.stage)).length;
  const offers = applications.filter((app) => ["OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(app.stage)).length;
  const joins = applications.filter((app) => app.stage === "JOINED").length;
  const expectedRevenue = insights.reduce((sum, row) => sum + row.revenuePotential, 0);
  const revenueAtRisk = insights.filter((row) => row.risks.some((risk) => risk !== "No major risk detected")).reduce((sum, row) => sum + row.revenuePotential, 0);

  return (
    <>
      <PageTitle
        title="Revenue Intelligence"
        description="Executive dashboard for recruiter productivity, pipeline conversion, and revenue risk."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open Jobs" value={jobs.length.toString()} />
        <Metric label="Active Candidates" value={candidates.length.toString()} />
        <Metric label="Submissions" value={submissions.toString()} />
        <Metric label="Interviews" value={interviews.toString()} />
        <Metric label="Offers" value={offers.toString()} />
        <Metric label="Joins" value={joins.toString()} />
        <Metric label="Expected Revenue" value={formatCurrency(expectedRevenue)} />
        <Metric label="Revenue At Risk" value={formatCurrency(revenueAtRisk)} tone="risk" />
      </section>

      <section className="mt-6 rounded-xl bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Recruiter Leaderboard</h2>
            <p className="text-sm text-muted-foreground">Ranked by quality, closure, velocity, and estimated revenue.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Rank</th>
                <th className="py-3 pr-4">Recruiter</th>
                <th className="py-3 pr-4">Submissions</th>
                <th className="py-3 pr-4">Interviews</th>
                <th className="py-3 pr-4">Offers</th>
                <th className="py-3 pr-4">Joins</th>
                <th className="py-3 pr-4">Expected Revenue</th>
                <th className="py-3 pr-4">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry: any) => {
                const success = entry.raw.totalSubmissions ? Math.round((entry.raw.totalJoins / entry.raw.totalSubmissions) * 100) : 0;
                return (
                  <tr key={entry.recruiterId} className="border-b last:border-0">
                    <td className="py-3 pr-4"><Badge>#{entry.rank}</Badge></td>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{entry.recruiterName}</div>
                      <div className="text-xs text-muted-foreground">{entry.recruiterEmail}</div>
                    </td>
                    <td className="py-3 pr-4">{entry.raw.totalSubmissions}</td>
                    <td className="py-3 pr-4">{entry.raw.totalInterviews}</td>
                    <td className="py-3 pr-4">{entry.raw.totalOffers}</td>
                    <td className="py-3 pr-4">{entry.raw.totalJoins}</td>
                    <td className="py-3 pr-4 font-medium">{formatCurrency(entry.raw.estimatedRevenue)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Progress value={success} className="h-2 w-24" />
                        <span>{success}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {leaderboard.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No recruiter revenue data available yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "risk" }) {
  return (
    <div className="rounded-xl bg-card p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={tone === "risk" ? "mt-3 font-display text-3xl font-bold text-rose-600" : "mt-3 font-display text-3xl font-bold"}>{value}</div>
    </div>
  );
}
