import Link from "next/link";
import { PageTitle } from "@/components/workspace/page-title";
import { Button } from "@/components/ui/button";
import { tenantPrisma } from "@/lib/repositories";
import {
  computeApplicationIntelligence,
  formatCurrency,
  funnelStages,
  stageBucket,
  type RevenueApplication,
} from "@/lib/phase4/recruiter-revenue";
import { SubmissionIntelligenceClient } from "./submission-intelligence-client";

export const dynamic = "force-dynamic";

async function loadApplications() {
  const applications = await tenantPrisma.application.findMany({
    orderBy: { updatedAt: "desc" },
    take: 80,
    include: {
      candidate: true,
      job: { include: { client: true, recruiter: { select: { id: true, name: true, email: true } } } },
      interviews: { select: { id: true, status: true, outcome: true, rating: true } },
      offers: { select: { id: true, status: true, offeredCtc: true, feeAmount: true, feePercent: true } },
    },
  });
  return applications as unknown as RevenueApplication[];
}

export default async function SubmissionIntelligencePage() {
  const applications = await loadApplications();
  const rows = applications.map(computeApplicationIntelligence).sort((a, b) => b.revenuePotential - a.revenuePotential);
  const funnel = funnelStages.map((stage) => ({
    stage,
    count: stage === "Revenue" ? rows.filter((row) => row.stage === "JOINED").length : applications.filter((app) => stageBucket(app.stage) === stage).length,
  }));
  const expectedRevenue = rows.reduce((sum, row) => sum + row.revenuePotential, 0);
  const revenueAtRisk = rows
    .filter((row) => row.risks.some((risk) => risk !== "No major risk detected"))
    .reduce((sum, row) => sum + row.revenuePotential, 0);
  const highReady = rows.filter((row) => row.readiness >= 80).length;
  const joins = rows.filter((row) => row.stage === "JOINED").length;

  return (
    <>
      <PageTitle
        title="Submission Intelligence"
        description="Track progression from sourced candidate to submitted profile, offer, joining, and revenue."
        actions={<Button asChild><Link href="/admin/resume-intelligence">Resume Intelligence</Link></Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Tracked Candidates" value={rows.length.toString()} />
        <Metric label="Ready To Submit" value={highReady.toString()} />
        <Metric label="Joined" value={joins.toString()} />
        <Metric label="Expected Revenue" value={formatCurrency(expectedRevenue)} />
        <Metric label="Revenue At Risk" value={formatCurrency(revenueAtRisk)} tone="risk" />
      </section>

      <section className="mt-6 rounded-xl bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Revenue Funnel</h2>
            <p className="text-sm text-muted-foreground">Candidate {"->"} Shortlisted {"->"} Submitted {"->"} Interview {"->"} Offer {"->"} Joined {"->"} Revenue</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-7">
          {funnel.map((item) => (
            <div key={item.stage} className="rounded-lg border bg-background p-4">
              <div className="text-xs font-medium text-muted-foreground">{item.stage}</div>
              <div className="mt-2 font-display text-3xl font-bold">{item.count}</div>
            </div>
          ))}
        </div>
      </section>

      <SubmissionIntelligenceClient rows={JSON.parse(JSON.stringify(rows))} />
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
