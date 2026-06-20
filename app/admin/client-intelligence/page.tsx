import Link from "next/link";
import { PipelineStage } from "@prisma/client";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  MessageSquare,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { PageTitle } from "@/components/workspace/page-title";
import { StageBadge } from "@/components/workspace/stage-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { tenantPrisma } from "@/lib/repositories";
import { formatCurrency, type RevenueApplication } from "@/lib/phase4/recruiter-revenue";

export const dynamic = "force-dynamic";

const submittedStages: PipelineStage[] = [
  PipelineStage.SUBMITTED,
  PipelineStage.INTERVIEW_SCHEDULED,
  PipelineStage.INTERVIEW_COMPLETE,
  PipelineStage.OFFER_EXTENDED,
  PipelineStage.OFFER_ACCEPTED,
  PipelineStage.JOINED,
];
const interviewStages: PipelineStage[] = [
  PipelineStage.INTERVIEW_SCHEDULED,
  PipelineStage.INTERVIEW_COMPLETE,
  PipelineStage.OFFER_EXTENDED,
  PipelineStage.OFFER_ACCEPTED,
  PipelineStage.JOINED,
];
const offerStages: PipelineStage[] = [PipelineStage.OFFER_EXTENDED, PipelineStage.OFFER_ACCEPTED, PipelineStage.JOINED];
const closedStages: PipelineStage[] = [PipelineStage.REJECTED, PipelineStage.JOINED];
const decisionPendingStages: PipelineStage[] = [PipelineStage.SUBMITTED, PipelineStage.INTERVIEW_COMPLETE, PipelineStage.OFFER_EXTENDED];

type ClientRecord = Awaited<ReturnType<typeof loadClients>>[number];

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function daysBetween(start: Date | string, end: Date | string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

function feeFromOffer(offer: { feeAmount: number | null; feePercent: number | null; offeredCtc: number }) {
  if (offer.feeAmount && offer.feeAmount > 0) return offer.feeAmount;
  return Math.round(offer.offeredCtc * ((offer.feePercent ?? 8) / 100));
}

function stageProbability(stage: PipelineStage) {
  const map: Record<string, number> = {
    NEW: 0.08,
    AI_SCREENING: 0.12,
    REVIEWED: 0.18,
    SUBMITTED: 0.32,
    INTERVIEW_SCHEDULED: 0.48,
    INTERVIEW_COMPLETE: 0.62,
    OFFER_EXTENDED: 0.78,
    OFFER_ACCEPTED: 0.9,
    JOINED: 1,
    ON_HOLD: 0.12,
    REJECTED: 0,
  };
  return map[stage] ?? 0.1;
}

function expectedFee(app: RevenueApplication) {
  const offer = app.offers?.find((item) => ["EXTENDED", "ACCEPTED"].includes(item.status));
  if (offer) return feeFromOffer(offer);
  const midSalary = app.job.salaryMin && app.job.salaryMax ? (app.job.salaryMin + app.job.salaryMax) / 2 : 0;
  const ctc = app.candidate.expectedCtc ?? app.candidate.currentCtc ?? midSalary;
  return Math.round(Math.max(ctc, 0) * 0.08);
}

async function loadClients() {
  return tenantPrisma.client.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      jobs: {
        orderBy: { updatedAt: "desc" },
        include: {
          recruiter: { select: { id: true, name: true, email: true } },
          applications: {
            orderBy: { updatedAt: "desc" },
            include: {
              candidate: true,
              interviews: { orderBy: { scheduledAt: "desc" } },
              offers: true,
            },
          },
        },
      },
    },
  });
}

async function loadClientActivity(client: ClientRecord) {
  const jobIds = client.jobs.map((job) => job.id);
  const applicationIds = client.jobs.flatMap((job) => job.applications.map((app) => app.id));
  const entityFilters = [
    { entityType: "client", entityId: client.id },
    ...jobIds.map((id) => ({ entityType: "job", entityId: id })),
    ...applicationIds.slice(0, 60).map((id) => ({ entityType: "application", entityId: id })),
  ];
  if (entityFilters.length === 0) return [];
  return tenantPrisma.activityLog.findMany({
    where: { OR: entityFilters },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
}

function clientMetrics(client: ClientRecord) {
  const jobs = client.jobs;
  const applications = jobs.flatMap((job) =>
    job.applications.map((app) => ({ ...app, job: { ...job, applications: undefined } })),
  );
  const interviews = applications.flatMap((app) => app.interviews ?? []);
  const offers = applications.flatMap((app) => app.offers ?? []);
  const submitted = applications.filter((app) => submittedStages.includes(app.stage));
  const interviewed = applications.filter((app) => interviewStages.includes(app.stage));
  const offered = applications.filter((app) => offerStages.includes(app.stage) || app.offers.length > 0);
  const joined = applications.filter((app) => app.stage === PipelineStage.JOINED || app.offers.some((offer) => offer.actualJoinedAt));
  const generated = offers
    .filter((offer) => offer.status === "ACCEPTED" || offer.actualJoinedAt || offer.paymentStatus === "Paid")
    .reduce((sum, offer) => sum + feeFromOffer(offer), 0);
  const forecast = applications
    .filter((app) => !closedStages.includes(app.stage))
    .reduce((sum, app) => sum + expectedFee(app as unknown as RevenueApplication) * stageProbability(app.stage), 0);
  const atRisk = applications
    .filter((app) => !closedStages.includes(app.stage))
    .filter((app) => daysBetween(app.updatedAt, new Date()) > 14 || app.clientFeedback === "negative")
    .reduce((sum, app) => sum + expectedFee(app as unknown as RevenueApplication) * stageProbability(app.stage), 0);
  const filledDurations = joined
    .map((app) => {
      const end = app.offers.find((offer) => offer.actualJoinedAt)?.actualJoinedAt ?? app.updatedAt;
      return daysBetween(app.job.createdAt, end);
    })
    .filter((value) => Number.isFinite(value));
  const avgTimeToFill = filledDurations.length
    ? Math.round(filledDurations.reduce((sum, value) => sum + value, 0) / filledDurations.length)
    : 0;

  return {
    jobs,
    applications,
    interviews,
    offers,
    submitted,
    interviewed,
    offered,
    joined,
    openJobs: jobs.filter((job) => job.status === "OPEN").length,
    revenueGenerated: generated,
    revenueForecast: Math.round(forecast),
    revenueAtRisk: Math.round(atRisk),
    submissionToInterview: ratio(interviewed.length, submitted.length),
    interviewToOffer: ratio(offered.length, interviewed.length),
    offerToJoin: ratio(joined.length, offered.length),
    avgTimeToFill,
    hiringVelocity: jobs.length ? Math.round((joined.length / jobs.length) * 100) : 0,
  };
}

export default async function ClientIntelligencePage() {
  const clients = await loadClients();
  const clientActivity = await Promise.all(clients.slice(0, 8).map(async (client) => [client.id, await loadClientActivity(client)] as const));
  const activityByClient = new Map(clientActivity);
  const summaries = clients.map((client) => ({ client, metrics: clientMetrics(client), activity: activityByClient.get(client.id) ?? [] }));
  const totals = summaries.reduce(
    (acc, item) => {
      acc.openJobs += item.metrics.openJobs;
      acc.submissions += item.metrics.submitted.length;
      acc.interviews += item.metrics.interviews.length;
      acc.offers += item.metrics.offers.length;
      acc.joinings += item.metrics.joined.length;
      acc.generated += item.metrics.revenueGenerated;
      acc.forecast += item.metrics.revenueForecast;
      return acc;
    },
    { openJobs: 0, submissions: 0, interviews: 0, offers: 0, joinings: 0, generated: 0, forecast: 0 },
  );

  return (
    <>
      <PageTitle
        title="Client Intelligence"
        description="Client health, submissions, performance, relationships, and revenue intelligence from live TalentPulse data."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <Metric label="Open Jobs" value={totals.openJobs.toString()} icon={Briefcase} />
        <Metric label="Active Submissions" value={totals.submissions.toString()} icon={Users} />
        <Metric label="Interviews" value={totals.interviews.toString()} icon={Calendar} />
        <Metric label="Offers" value={totals.offers.toString()} icon={CheckCircle2} />
        <Metric label="Joinings" value={totals.joinings.toString()} icon={TrendingUp} />
        <Metric label="Revenue Generated" value={formatCurrency(totals.generated)} icon={DollarSign} />
        <Metric label="Revenue Forecast" value={formatCurrency(totals.forecast)} icon={DollarSign} />
      </section>

      <section className="mt-6 grid gap-6">
        {summaries.map(({ client, metrics, activity }) => (
          <article key={client.id} className="rounded-xl bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-bold">{client.name}</h2>
                  <Badge variant="outline">{client.industry ?? "Industry not set"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {client.contactName ? `Primary contact: ${client.contactName}` : "No primary hiring manager captured"}
                  {client.contactEmail ? ` · ${client.contactEmail}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{metrics.openJobs} open jobs</Badge>
                <Badge variant="secondary">{formatCurrency(metrics.revenueForecast)} forecast</Badge>
                {metrics.revenueAtRisk > 0 && <Badge variant="destructive">{formatCurrency(metrics.revenueAtRisk)} at risk</Badge>}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
              <Mini label="Open jobs" value={metrics.openJobs} />
              <Mini label="Submissions" value={metrics.submitted.length} />
              <Mini label="Interviews" value={metrics.interviews.length} />
              <Mini label="Offers" value={metrics.offers.length} />
              <Mini label="Joinings" value={metrics.joined.length} />
              <Mini label="Generated" value={formatCurrency(metrics.revenueGenerated)} />
              <Mini label="Forecast" value={formatCurrency(metrics.revenueForecast)} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="rounded-lg border bg-background p-4">
                <h3 className="font-display text-lg font-semibold">Client Relationship Center</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <RelationshipBlock title="Hiring Managers" icon={<UserRound className="h-4 w-4" />}>
                    {client.contactName && <Person name={client.contactName} detail={client.contactEmail ?? client.contactPhone ?? "Primary contact"} />}
                    {client.users.filter((user) => user.isActive).map((user) => <Person key={user.id} name={user.name ?? user.email} detail={`${user.role.toLowerCase()} portal user`} />)}
                    {!client.contactName && client.users.length === 0 && <Empty text="No hiring managers captured yet." />}
                  </RelationshipBlock>
                  <RelationshipBlock title="Recruiter Ownership" icon={<Users className="h-4 w-4" />}>
                    {Array.from(new Map(metrics.jobs.filter((job) => job.recruiter).map((job) => [job.recruiter!.id, job.recruiter!])).values()).map((recruiter) => (
                      <Person key={recruiter.id} name={recruiter.name ?? recruiter.email ?? "Recruiter"} detail={recruiter.email ?? "No email"} />
                    ))}
                    {metrics.jobs.every((job) => !job.recruiter) && <Empty text="No recruiter ownership assigned." />}
                  </RelationshipBlock>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <RelationshipBlock title="Communication Timeline" icon={<MessageSquare className="h-4 w-4" />}>
                    {activity.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="rounded-md border p-2 text-xs">
                        <div className="font-medium">{entry.action}</div>
                        <div className="text-muted-foreground">{entry.user?.name ?? "System"} · {new Date(entry.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                    {activity.length === 0 && <Empty text="No client timeline activity yet." />}
                  </RelationshipBlock>
                  <RelationshipBlock title="Notes & Meetings" icon={<Calendar className="h-4 w-4" />}>
                    {metrics.interviews.slice(0, 5).map((interview) => (
                      <div key={interview.id} className="rounded-md border p-2 text-xs">
                        <div className="font-medium">{interview.round} · {interview.status}</div>
                        <div className="text-muted-foreground">{new Date(interview.scheduledAt).toLocaleString()}</div>
                      </div>
                    ))}
                    {metrics.interviews.length === 0 && <Empty text="No client meetings/interviews scheduled." />}
                  </RelationshipBlock>
                </div>
              </section>

              <section className="rounded-lg border bg-background p-4">
                <h3 className="font-display text-lg font-semibold">Client Performance Intelligence</h3>
                <div className="mt-4 space-y-4">
                  <Ratio label="Submission-to-interview" value={metrics.submissionToInterview} />
                  <Ratio label="Interview-to-offer" value={metrics.interviewToOffer} />
                  <Ratio label="Offer-to-joining" value={metrics.offerToJoin} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Mini label="Avg time-to-fill" value={metrics.avgTimeToFill ? `${metrics.avgTimeToFill} days` : "No joins"} />
                    <Mini label="Hiring velocity" value={`${metrics.hiringVelocity}%`} />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="rounded-lg border bg-background p-4">
                <h3 className="font-display text-lg font-semibold">Client Revenue Intelligence</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Mini label="By client" value={formatCurrency(metrics.revenueGenerated)} />
                  <Mini label="Forecast" value={formatCurrency(metrics.revenueForecast)} />
                  <Mini label="Leakage risk" value={formatCurrency(metrics.revenueAtRisk)} />
                </div>
                <div className="mt-4 space-y-2">
                  {Array.from(new Map(metrics.jobs.filter((job) => job.recruiter).map((job) => [job.recruiter!.id, job.recruiter!])).values()).map((recruiter) => {
                    const recruiterApps = metrics.applications.filter((app) => app.job.recruiterId === recruiter.id);
                    const recruiterRevenue = recruiterApps.flatMap((app) => app.offers).reduce((sum, offer) => sum + feeFromOffer(offer), 0);
                    return <Person key={recruiter.id} name={recruiter.name ?? "Recruiter"} detail={`${formatCurrency(recruiterRevenue)} generated`} />;
                  })}
                  {metrics.revenueAtRisk > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4" /> Revenue leakage risk from stale decisions or negative feedback.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-lg border bg-background p-4">
                <h3 className="font-display text-lg font-semibold">Client Submission Center</h3>
                <div className="mt-4 space-y-3">
                  {metrics.submitted.slice(0, 8).map((app) => {
                    const latestInterview = app.interviews[0];
                    const feedback = app.clientFeedback ? "Feedback received" : "Feedback pending";
                    const pendingDecision = decisionPendingStages.includes(app.stage);
                    return (
                      <Link key={app.id} href={`/admin/candidates/${app.candidateId}`} className="block rounded-lg border p-3 transition-colors hover:border-primary/50">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">{app.candidate.name}</div>
                            <div className="text-xs text-muted-foreground">{app.job.title} · Match {app.matchScore ?? "-"}%</div>
                          </div>
                          <StageBadge stage={app.stage} />
                        </div>
                        <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                          <span>{feedback}</span>
                          <span>{pendingDecision ? "Decision pending" : "No pending decision"}</span>
                          <span>{latestInterview ? `Interview: ${latestInterview.status}` : "Interview not scheduled"}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {metrics.submitted.length === 0 && <Empty text="No submitted candidates for this client yet." />}
                </div>
              </section>
            </div>
          </article>
        ))}
      </section>

      {summaries.length === 0 && <div className="mt-6 rounded-xl bg-card p-10 text-center text-muted-foreground">No active clients available.</div>}
    </>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function Ratio({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

function RelationshipBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Person({ name, detail }: { name: string | null; detail: string }) {
  return (
    <div className="rounded-md border bg-card/50 p-2 text-sm">
      <div className="font-medium">{name ?? "Unnamed"}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{text}</div>;
}
