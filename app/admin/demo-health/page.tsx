import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { CheckCircle2, CircleAlert, CircleX, Database, KeyRound, Radar, ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HealthStatus = "healthy" | "warning" | "failed";

type HealthItem = {
  label: string;
  status: HealthStatus;
  detail: string;
};

type CountSummary = {
  jobs: number;
  candidates: number;
  applications: number;
  recruiters: number;
  organizations: number;
  admins: number;
};

type DemoSample = {
  applicationId: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
} | null;

function statusLabel(status: HealthStatus) {
  if (status === "healthy") return "Healthy";
  if (status === "warning") return "Warning";
  return "Failed";
}

function statusClasses(status: HealthStatus) {
  if (status === "healthy") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  if (status === "warning") return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  return "border-rose-500/20 bg-rose-500/10 text-rose-700";
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === "healthy") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "warning") return <CircleAlert className="h-4 w-4" />;
  return <CircleX className="h-4 w-4" />;
}

function makeItem(label: string, healthy: boolean, warning: boolean, detail: string): HealthItem {
  return {
    label,
    status: healthy ? "healthy" : warning ? "warning" : "failed",
    detail,
  };
}

function envItem(name: string): HealthItem {
  const present = Boolean(process.env[name]);
  return {
    label: name,
    status: present ? "healthy" : "warning",
    detail: present ? "Present" : "Missing",
  };
}

function getBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

function getCookieHeader() {
  return cookies()
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function validateEndpoint({
  label,
  path,
  sample,
  requiresSample = false,
}: {
  label: string;
  path: string;
  sample?: DemoSample;
  requiresSample?: boolean;
}): Promise<HealthItem> {
  if (requiresSample && !sample) {
    return {
      label,
      status: "warning",
      detail: "No active job/application sample available",
    };
  }

  const resolvedPath = sample
    ? path
        .replace("__APPLICATION_ID__", encodeURIComponent(sample.applicationId))
        .replace("__CANDIDATE_ID__", encodeURIComponent(sample.candidateId))
        .replace("__JOB_ID__", encodeURIComponent(sample.jobId))
    : path;
  const controller = new AbortController();
  const timeoutMs = 12000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBaseUrl()}${resolvedPath}`, {
      cache: "no-store",
      headers: { cookie: getCookieHeader() },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const body = await response.json().catch(() => null);
    const errorMessage = typeof body?.error === "string" ? body.error : null;

    if (response.ok) {
      return {
        label,
        status: "healthy",
        detail: `HTTP ${response.status}`,
      };
    }

    const parameterIssue =
      response.status === 400 ||
      response.status === 404 ||
      errorMessage?.toLowerCase().includes("required") ||
      errorMessage?.toLowerCase().includes("not found");

    return {
      label,
      status: response.status < 500 || parameterIssue ? "warning" : "failed",
      detail: errorMessage ? `HTTP ${response.status}: ${errorMessage}` : `HTTP ${response.status}`,
    };
  } catch (error) {
    clearTimeout(timeout);
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      label,
      status: timedOut ? "warning" : "failed",
      detail: timedOut ? `Timed out after ${timeoutMs / 1000}s` : "Request failed",
    };
  }
}

function scoreItems(items: HealthItem[]) {
  if (items.length === 0) return 0;
  const score = items.reduce((total, item) => {
    if (item.status === "healthy") return total + 1;
    if (item.status === "warning") return total + 0.5;
    return total;
  }, 0);
  return Math.round((score / items.length) * 100);
}

async function loadHealthData() {
  const session = await getServerSession(authOptions);

  try {
    await prisma.$queryRaw`select 1`;
    const [organizations, recruiters, admins, jobs, candidates, applications, activeJobSample] = await Promise.all([
      prisma.organization.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "RECRUITER", isActive: true } }),
      prisma.user.count({ where: { role: "ADMIN", isActive: true } }),
      prisma.job.count(),
      prisma.candidate.count(),
      prisma.application.count(),
      prisma.job.findFirst({
        where: { status: "OPEN", applications: { some: {} } },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          applications: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              candidateId: true,
              jobId: true,
            },
          },
        },
      }),
    ]);
    const fallbackApplication = activeJobSample?.applications[0]
      ? null
      : await prisma.application.findFirst({
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            candidateId: true,
            jobId: true,
            job: { select: { title: true } },
          },
        });
    const demoSample: DemoSample = activeJobSample?.applications[0]
      ? {
          applicationId: activeJobSample.applications[0].id,
          candidateId: activeJobSample.applications[0].candidateId,
          jobId: activeJobSample.id,
          jobTitle: activeJobSample.title,
        }
      : fallbackApplication
        ? {
            applicationId: fallbackApplication.id,
            candidateId: fallbackApplication.candidateId,
            jobId: fallbackApplication.jobId,
            jobTitle: fallbackApplication.job.title,
          }
        : null;

    const counts: CountSummary = { organizations, recruiters, admins, jobs, candidates, applications };
    const systemItems: HealthItem[] = [
      { label: "Database Connected", status: "healthy", detail: "Query succeeded" },
      makeItem("Authentication Working", Boolean(session?.user), false, session?.user ? "Active admin session" : "No active session"),
      makeItem("Organization Available", organizations > 0, false, `${organizations} active organization(s)`),
      makeItem("Recruiter Users Available", recruiters >= 2, recruiters > 0, `${recruiters} active recruiter(s)`),
      makeItem("Admin User Available", admins > 0, false, `${admins} active admin(s)`),
      makeItem("Jobs Available", jobs > 0, false, `${jobs} job(s)`),
      makeItem("Candidates Available", candidates > 0, false, `${candidates} candidate(s)`),
      makeItem("Applications Available", applications > 0, false, `${applications} application(s)`),
    ];
    const environmentItems = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "OPENAI_API_KEY", "OPENROUTER_API_KEY"].map(envItem);
    const endpointItems = await Promise.all([
      validateEndpoint({
        label: "/api/screening/workbench",
        path: "/api/screening/workbench?applicationId=__APPLICATION_ID__&candidateId=__CANDIDATE_ID__&jobId=__JOB_ID__&summaryOnly=true",
        sample: demoSample,
        requiresSample: true,
      }),
      validateEndpoint({
        label: "/api/submission/tracker",
        path: "/api/submission/tracker?applicationId=__APPLICATION_ID__&candidateId=__CANDIDATE_ID__&jobId=__JOB_ID__",
        sample: demoSample,
        requiresSample: true,
      }),
      validateEndpoint({
        label: "/api/revenue/leaderboard",
        path: "/api/revenue/leaderboard",
      }),
      validateEndpoint({
        label: "/api/revenue/productivity",
        path: "/api/revenue/productivity",
      }),
    ]);

    return {
      dbFailed: false,
      counts,
      systemItems,
      environmentItems,
      endpointItems,
      score: scoreItems([...systemItems, ...environmentItems, ...endpointItems]),
    };
  } catch (error) {
    const failedSystemItems: HealthItem[] = [
      { label: "Database Connected", status: "failed", detail: "Database query failed" },
      makeItem("Authentication Working", Boolean(session?.user), false, session?.user ? "Active admin session" : "No active session"),
      { label: "Organization Available", status: "failed", detail: "Unavailable" },
      { label: "Recruiter Users Available", status: "failed", detail: "Unavailable" },
      { label: "Admin User Available", status: "failed", detail: "Unavailable" },
      { label: "Jobs Available", status: "failed", detail: "Unavailable" },
      { label: "Candidates Available", status: "failed", detail: "Unavailable" },
      { label: "Applications Available", status: "failed", detail: "Unavailable" },
    ];
    const environmentItems = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "OPENAI_API_KEY", "OPENROUTER_API_KEY"].map(envItem);
    return {
      dbFailed: true,
      counts: { organizations: 0, recruiters: 0, admins: 0, jobs: 0, candidates: 0, applications: 0 },
      systemItems: failedSystemItems,
      environmentItems,
      endpointItems: [
        { label: "/api/screening/workbench", status: "failed", detail: "Skipped: database unavailable" },
        { label: "/api/submission/tracker", status: "failed", detail: "Skipped: database unavailable" },
        { label: "/api/revenue/leaderboard", status: "failed", detail: "Skipped: database unavailable" },
        { label: "/api/revenue/productivity", status: "failed", detail: "Skipped: database unavailable" },
      ] as HealthItem[],
      score: scoreItems([...failedSystemItems, ...environmentItems]),
    };
  }
}

function HealthCard({ item }: { item: HealthItem }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4">
      <div className="min-w-0">
        <div className="font-medium">{item.label}</div>
        <div className="mt-1 text-sm text-muted-foreground">{item.detail}</div>
      </div>
      <Badge variant="outline" className={cn("shrink-0 gap-1", statusClasses(item.status))}>
        <StatusIcon status={item.status} />
        {statusLabel(item.status)}
      </Badge>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default async function DemoHealthPage() {
  const health = await loadHealthData();

  return (
    <>
      <PageTitle
        title="Demo Health Center"
        description="A single read-only view of environment, data, and intelligence readiness."
      />

      <div className="mb-6 rounded-xl bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Demo Ready Score</div>
            <div className="mt-1 font-display text-4xl font-bold tracking-tight">{health.score} / 100</div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {health.dbFailed
                ? "Database checks are failing. Demo flow should pause until connectivity or schema state is fixed."
                : "Demo environment checks completed against the active tenant and current admin session."}
            </p>
          </div>
          <div className="w-full max-w-sm">
            <Progress value={health.score} className="h-3" />
            <div className="mt-2 text-xs text-muted-foreground">Healthy checks count fully, warnings count partially.</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="System Health" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="grid gap-3 md:grid-cols-2">
            {health.systemItems.map((item) => (
              <HealthCard key={item.label} item={item} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Environment Validation" icon={<KeyRound className="h-4 w-4" />}>
          <div className="grid gap-3 md:grid-cols-2">
            {health.environmentItems.map((item) => (
              <HealthCard key={item.label} item={item} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Demo Data Validation" icon={<Database className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Jobs", health.counts.jobs],
              ["Candidates", health.counts.candidates],
              ["Applications", health.counts.applications],
              ["Recruiters", health.counts.recruiters],
              ["Organizations", health.counts.organizations],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="mt-2 font-display text-3xl font-bold">{value}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Intelligence Validation" icon={<Radar className="h-4 w-4" />}>
          <div className="grid gap-3 md:grid-cols-2">
            {health.endpointItems.map((item) => (
              <HealthCard key={item.label} item={item} />
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
