import { PageTitle } from "@/components/workspace/page-title";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { tenantPrisma } from "@/lib/repositories";
import { resolveTenantContext } from "@/lib/tenant/context";
import { computeLeaderboard } from "@/lib/revenue/leaderboard";
import { computeSourceEffectiveness } from "@/lib/revenue/sources";
import { computeApplicationIntelligence, formatCurrency, type RevenueApplication } from "@/lib/phase4/recruiter-revenue";

export const dynamic = "force-dynamic";

async function loadData() {
  const ctx = await resolveTenantContext();
  const [applications, leaderboard, sources] = await Promise.all([
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
    ctx ? computeSourceEffectiveness(ctx).catch(() => []) : Promise.resolve([]),
  ]);
  return { applications: applications as unknown as RevenueApplication[], leaderboard, sources };
}

export default async function ExecutiveInsightsPage() {
  const { applications, leaderboard, sources } = await loadData();
  const rows = applications.map(computeApplicationIntelligence);
  const likelyToClose = rows.filter((row) => row.joiningProbability >= 65).sort((a, b) => b.joiningProbability - a.joiningProbability).slice(0, 6);
  const atRiskJobs = rows.filter((row) => row.risks.some((risk) => risk !== "No major risk detected")).sort((a, b) => b.revenuePotential - a.revenuePotential).slice(0, 6);
  const closestToJoining = rows.filter((row) => ["OFFER_ACCEPTED", "OFFER_EXTENDED", "INTERVIEW_COMPLETE"].includes(row.stage)).sort((a, b) => b.joiningProbability - a.joiningProbability).slice(0, 6);
  const expectedRevenue = rows.reduce((sum, row) => sum + row.revenuePotential, 0);
  const revenueAtRisk = atRiskJobs.reduce((sum, row) => sum + row.revenuePotential, 0);
  const topRecruiter = leaderboard[0];
  const topSource = sources[0];

  return (
    <>
      <PageTitle
        title="Executive Insights"
        description="CXO view of close probability, revenue forecast, recruiter performance, and sourcing channel effectiveness."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Expected Revenue This Month" value={formatCurrency(expectedRevenue)} />
        <Metric label="Revenue At Risk" value={formatCurrency(revenueAtRisk)} tone="risk" />
        <Metric label="Best Recruiter" value={topRecruiter?.recruiterName ?? "No data"} />
        <Metric label="Best Source" value={topSource?.sourceLabel ?? "No data"} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <InsightPanel title="Jobs Likely To Close" rows={likelyToClose} valueKey="joiningProbability" suffix="%" />
        <InsightPanel title="Jobs At Risk" rows={atRiskJobs} valueKey="revenuePotential" currency />
        <InsightPanel title="Candidates Closest To Joining" rows={closestToJoining} valueKey="joiningProbability" suffix="%" />
        <section className="rounded-xl bg-card p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Sourcing Channel Performance</h2>
          <div className="mt-4 space-y-3">
            {sources.slice(0, 6).map((source: any) => (
              <div key={source.source} className="rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{source.sourceLabel}</div>
                  <Badge variant={source.estimatedROI === "high" ? "default" : "secondary"}>{source.estimatedROI} ROI</Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>{source.totalCandidates} candidates</span>
                  <span>{source.submitted} submissions</span>
                  <span>{source.joined} joins</span>
                </div>
                <Progress value={source.overallConversion ?? 0} className="mt-3 h-2" />
              </div>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "risk" }) {
  return (
    <div className="rounded-xl bg-card p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={tone === "risk" ? "mt-3 font-display text-2xl font-bold text-rose-600" : "mt-3 font-display text-2xl font-bold"}>{value}</div>
    </div>
  );
}

function InsightPanel({ title, rows, valueKey, suffix, currency }: { title: string; rows: any[]; valueKey: string; suffix?: string; currency?: boolean }) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={`${title}-${row.applicationId}`} className="rounded-lg border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{row.jobTitle}</div>
                <div className="text-sm text-muted-foreground">{row.candidateName} · {row.clientName}</div>
              </div>
              <Badge>{currency ? formatCurrency(row[valueKey]) : `${row[valueKey]}${suffix ?? ""}`}</Badge>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{row.recommendation}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">No matching insight yet.</div>}
      </div>
    </section>
  );
}
