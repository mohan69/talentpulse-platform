"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

type LoadState<T> = { data: T | null; loading: boolean; error: string | null };

const emptyState = <T,>(): LoadState<T> => ({ data: null, loading: false, error: null });

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

function FriendlyState({ title, detail }: { title: string; detail?: string | null }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
      <div className="font-medium text-foreground">{title}</div>
      {detail && <div className="mt-1">{detail}</div>}
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon: any }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-3xl font-semibold">{Math.round(value)}</div>
        </div>
        <Badge variant={value >= 80 ? "default" : value >= 60 ? "secondary" : "destructive"}>
          {value >= 80 ? "Ready" : value >= 60 ? "Review" : "Caution"}
        </Badge>
      </div>
      <Progress className="mt-4" value={Math.max(0, Math.min(100, value))} />
    </div>
  );
}

function ListBlock({ title, items, empty }: { title: string; items?: any[]; empty: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="space-y-2">
        {(items ?? []).length === 0 && <div className="text-sm text-muted-foreground">{empty}</div>}
        {(items ?? []).slice(0, 5).map((item, index) => (
          <div key={index} className="rounded-md bg-muted/40 p-3 text-sm">
            {typeof item === "string" ? item : item.label ?? item.question ?? item.recommendation ?? JSON.stringify(item)}
            {item?.reason && <div className="mt-1 text-xs text-muted-foreground">{item.reason}</div>}
            {item?.severity && <Badge className="mt-2" variant={item.severity === "high" ? "destructive" : "secondary"}>{item.severity}</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntelligenceWorkbenchClient() {
  const [jobs, setJobs] = useState<LoadState<any[]>>(emptyState());
  const [applications, setApplications] = useState<LoadState<any[]>>(emptyState());
  const [screening, setScreening] = useState<LoadState<any>>(emptyState());
  const [submission, setSubmission] = useState<LoadState<any>>(emptyState());
  const [leaderboard, setLeaderboard] = useState<LoadState<any[]>>(emptyState());
  const [productivity, setProductivity] = useState<LoadState<any[]>>(emptyState());
  const [opportunity, setOpportunity] = useState<LoadState<any>>(emptyState());
  const [clients, setClients] = useState<LoadState<any[]>>(emptyState());
  const [sources, setSources] = useState<LoadState<any[]>>(emptyState());
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadFoundation();
    void loadRevenue();
  }, []);

  useEffect(() => {
    const jobApps = applications.data?.filter((app) => !selectedJobId || app.jobId === selectedJobId) ?? [];
    if (!selectedApplicationId && jobApps[0]?.id) setSelectedApplicationId(jobApps[0].id);
  }, [applications.data, selectedJobId, selectedApplicationId]);

  useEffect(() => {
    if (selectedApplicationId) void loadApplicationIntelligence(selectedApplicationId);
  }, [selectedApplicationId]);

  const filteredApplications = useMemo(() => {
    return applications.data?.filter((app) => !selectedJobId || app.jobId === selectedJobId) ?? [];
  }, [applications.data, selectedJobId]);

  async function loadFoundation() {
    setJobs({ data: null, loading: true, error: null });
    setApplications({ data: null, loading: true, error: null });
    try {
      const [jobRows, appRows] = await Promise.all([
        fetchJson<any[]>("/api/jobs?status=OPEN"),
        fetchJson<any[]>("/api/applications"),
      ]);
      setJobs({ data: jobRows, loading: false, error: null });
      setApplications({ data: appRows, loading: false, error: null });
      if (jobRows[0]?.id) setSelectedJobId(jobRows[0].id);
      const firstApp = appRows.find((app) => app.jobId === jobRows[0]?.id) ?? appRows[0];
      if (firstApp?.id) setSelectedApplicationId(firstApp.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load jobs and applications.";
      setJobs({ data: [], loading: false, error: message });
      setApplications({ data: [], loading: false, error: message });
    }
  }

  async function loadApplicationIntelligence(applicationId: string) {
    setActionMessage(null);
    setScreening({ data: null, loading: true, error: null });
    setSubmission({ data: null, loading: true, error: null });
    try {
      const [screeningData, submissionData] = await Promise.all([
        fetchJson<any>(`/api/screening/workbench?applicationId=${applicationId}`),
        fetchJson<any>(`/api/submission/package?applicationId=${applicationId}&force=true`),
      ]);
      setScreening({ data: screeningData, loading: false, error: null });
      setSubmission({ data: submissionData, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load intelligence for this application.";
      setScreening((prev) => ({ ...prev, loading: false, error: message }));
      setSubmission((prev) => ({ ...prev, loading: false, error: message }));
    }
  }

  async function loadRevenue() {
    setLeaderboard({ data: null, loading: true, error: null });
    setProductivity({ data: null, loading: true, error: null });
    setOpportunity({ data: null, loading: true, error: null });
    setClients({ data: null, loading: true, error: null });
    setSources({ data: null, loading: true, error: null });
    const setters = [setLeaderboard, setProductivity, setOpportunity, setClients, setSources] as const;
    const endpoints = ["/api/revenue/leaderboard", "/api/revenue/productivity", "/api/revenue/opportunity", "/api/revenue/clients", "/api/revenue/sources"] as const;
    await Promise.all(
      endpoints.map(async (endpoint, index) => {
        try {
          const data = await fetchJson<any>(endpoint);
          setters[index]({ data, loading: false, error: null });
        } catch (error) {
          setters[index]({ data: index === 2 ? null : [], loading: false, error: error instanceof Error ? error.message : "Unavailable" });
        }
      }),
    );
  }

  async function submissionAction(endpoint: string, body: Record<string, unknown>, success: string) {
    if (!selectedApplicationId) return;
    try {
      await fetchJson(`/api/submission/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: selectedApplicationId, ...body }),
      });
      setActionMessage(success);
      await loadApplicationIntelligence(selectedApplicationId);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Action failed. Please try again.");
    }
  }

  async function exportTracker() {
    if (!selectedApplicationId) return;
    try {
      const res = await fetch(`/api/submission/tracker?applicationId=${selectedApplicationId}&format=csv`);
      if (!res.ok) throw new Error("Tracker export unavailable.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `submission-${selectedApplicationId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Tracker export failed.");
    }
  }

  const selectedApplication = applications.data?.find((app) => app.id === selectedApplicationId);
  const revenue = opportunity.data;
  const topLeaderboard = leaderboard.data ?? [];
  const productivityRows = productivity.data ?? [];
  const topClients = clients.data ?? [];
  const topSources = sources.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <div className="mb-2 text-sm font-medium">Select job</div>
            <Select value={selectedJobId} onValueChange={(value) => { setSelectedJobId(value); setSelectedApplicationId(""); }}>
              <SelectTrigger><SelectValue placeholder={jobs.loading ? "Loading jobs..." : "Choose a requisition"} /></SelectTrigger>
              <SelectContent>
                {(jobs.data ?? []).map((job) => <SelectItem key={job.id} value={job.id}>{job.title} · {job.client?.name ?? "Client"}</SelectItem>)}
              </SelectContent>
            </Select>
            {jobs.error && <div className="mt-2 text-xs text-destructive">{jobs.error}</div>}
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Select candidate/application</div>
            <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
              <SelectTrigger><SelectValue placeholder={applications.loading ? "Loading applications..." : "Choose a candidate"} /></SelectTrigger>
              <SelectContent>
                {filteredApplications.map((app) => (
                  <SelectItem key={app.id} value={app.id}>{app.candidate?.name ?? "Candidate"} · {app.stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredApplications.length === 0 && <div className="mt-2 text-xs text-muted-foreground">No applications found for this requisition.</div>}
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => { void loadFoundation(); void loadRevenue(); }} className="w-full lg:w-auto">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Readiness" value={screening.data?.readiness?.overall ?? "—"} hint={screening.data?.readiness?.level?.replaceAll("_", " ") ?? "Select an application"} icon={Target} />
        <MetricCard label="Expected Revenue" value={formatCurrency(revenue?.pipelineRevenue?.expectedValue)} hint="Weighted pipeline value" icon={TrendingUp} />
        <MetricCard label="At-Risk Revenue" value={formatCurrency(revenue?.atRiskRevenue?.total)} hint={`${revenue?.atRiskRevenue?.joiningAtRisk ?? 0} joining risk(s)`} icon={ShieldAlert} />
        <MetricCard label="Recruiters" value={topLeaderboard.length || "—"} hint="Ranked by velocity, quality, closure and revenue" icon={Users} />
      </div>

      <Tabs defaultValue="screening" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="screening">Screening Intelligence</TabsTrigger>
          <TabsTrigger value="submission">Submission Intelligence</TabsTrigger>
          <TabsTrigger value="productivity">Recruiter Productivity</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="screening">
          <Card>
            <CardHeader>
              <SectionHeader icon={Target} title="Screening Intelligence" description="Readiness, gaps, risks, questions and client-ready summary from the current application." />
            </CardHeader>
            <CardContent>
              {screening.error && <FriendlyState title="Screening intelligence is unavailable" detail={screening.error} />}
              {!screening.error && !screening.data && <FriendlyState title={screening.loading ? "Loading screening intelligence..." : "Select an application to begin"} />}
              {screening.data && (
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <ScoreRing value={screening.data.readiness?.overall ?? 0} label="Candidate readiness" />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ListBlock title="Missing information checklist" items={screening.data.gaps} empty="No critical missing information detected." />
                    <ListBlock title="Joining risk signals" items={screening.data.risks} empty="No active joining risks detected." />
                    <ListBlock title="Next-best recruiter questions" items={screening.data.questions} empty="No follow-up questions required." />
                    <div className="rounded-lg border bg-background p-4">
                      <div className="mb-3 text-sm font-semibold">Client-ready screening summary</div>
                      <div className="space-y-3 text-sm">
                        <p className="font-medium">{screening.data.summary?.verdict ?? "Summary unavailable"}</p>
                        <p className="text-muted-foreground">{screening.data.summary?.recommendation}</p>
                        <div className="flex flex-wrap gap-2">
                          {(screening.data.summary?.strengths ?? []).slice(0, 4).map((item: string) => <Badge key={item} variant="secondary">{item}</Badge>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submission">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SectionHeader icon={Send} title="Submission Intelligence" description="Generate a client-ready package, fit-gap explanation, email draft and tracker row." />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => selectedApplicationId && void loadApplicationIntelligence(selectedApplicationId)}><Sparkles className="h-4 w-4" /> Generate package</Button>
                  <Button size="sm" variant="outline" onClick={exportTracker}><Download className="h-4 w-4" /> Export tracker</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionMessage && <div className="rounded-lg border bg-muted/30 p-3 text-sm">{actionMessage}</div>}
              {submission.error && <FriendlyState title="Submission intelligence is unavailable" detail={submission.error} />}
              {!submission.error && !submission.data && <FriendlyState title={submission.loading ? "Loading submission package..." : "Generate a package to preview submission intelligence"} />}
              {submission.data && (
                <>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg border bg-background p-4 lg:col-span-2">
                      <div className="mb-2 text-sm font-semibold">Fit-gap explanation</div>
                      <p className="text-sm text-muted-foreground">{submission.data.fitGapExplanation?.summary}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {(submission.data.fitGapExplanation?.dimensions ?? []).map((dimension: any) => (
                          <div key={dimension.category} className="rounded-md bg-muted/40 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium capitalize">{dimension.category.replaceAll("_", " ")}</span>
                              <Badge variant={dimension.fitLevel === "weak" ? "destructive" : "secondary"}>{dimension.fitLevel}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{dimension.explanation}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4" /> Risk disclosure</div>
                      <p className="text-sm text-muted-foreground">{submission.data.riskDisclosure?.executiveSummary}</p>
                      <div className="mt-3 space-y-2">
                        {(submission.data.riskDisclosure?.items ?? []).slice(0, 3).map((risk: any) => (
                          <div key={risk.riskType} className="rounded-md bg-muted/40 p-2 text-xs">{risk.label}: {risk.mitigation}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border bg-background p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4" /> Email draft</div>
                      <div className="text-sm font-medium">{submission.data.emailDraft?.subject ?? `Candidate Submission: ${selectedApplication?.candidate?.name ?? "Candidate"}`}</div>
                      <div className="mt-3 max-h-64 overflow-auto rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                        {submission.data.emailDraft?.textBody ?? submission.data.summary?.whyThisCandidate ?? "Email draft will appear after package generation."}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4" /> Tracker row preview</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(submission.data.trackerRow ?? {}).slice(0, 12).map(([key, value]) => (
                          <div key={key} className="rounded-md bg-muted/40 p-2">
                            <div className="text-muted-foreground">{key}</div>
                            <div className="truncate font-medium">{String(value ?? "—")}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => submissionAction("submit", { force: true }, "Submission draft created for approval/review.")}><Send className="h-4 w-4" /> Initiate submission</Button>
                    <Button size="sm" variant="outline" onClick={() => submissionAction("approve", {}, "Submission approved.")}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => submissionAction("reject", { reason: "Rejected from demo workbench" }, "Submission rejected.")}>Reject</Button>
                    <Button size="sm" variant="outline" onClick={() => submissionAction("confirm", { action: "confirm" }, "Candidate marked as submitted to client.")}>Confirm submitted</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity">
          <Card>
            <CardHeader>
              <SectionHeader icon={Users} title="Recruiter Productivity" description="Leaderboard, quality, closure and revenue contribution by recruiter." />
            </CardHeader>
            <CardContent className="space-y-4">
              {leaderboard.error && <FriendlyState title="Recruiter intelligence is unavailable" detail={leaderboard.error} />}
              <div className="grid gap-4 lg:grid-cols-3">
                {(topLeaderboard.length ? topLeaderboard : productivityRows).slice(0, 6).map((row: any, index: number) => {
                  const raw = row.raw ?? row;
                  const scores = row.scores ?? {};
                  return (
                    <div key={row.recruiterId ?? index} className="rounded-lg border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{row.recruiterName}</div>
                          <div className="text-xs text-muted-foreground">{row.recruiterEmail}</div>
                        </div>
                        <Badge>#{row.rank ?? index + 1}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <MetricMini label="Productivity" value={scores.overall ?? row.applicationsProcessed ?? "—"} />
                        <MetricMini label="Submissions" value={raw.totalSubmissions ?? row.totalSubmissions ?? 0} />
                        <MetricMini label="Closure" value={scores.closure ?? row.totalJoins ?? 0} />
                        <MetricMini label="Revenue" value={formatCurrency(raw.estimatedRevenue ?? row.estimatedRevenue)} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {!leaderboard.loading && !topLeaderboard.length && !productivityRows.length && <FriendlyState title="No recruiter productivity data yet" detail="Once applications and closures are present, this leaderboard will populate." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <SectionHeader icon={BarChart3} title="Revenue Intelligence" description="Pipeline value, at-risk revenue, client profitability and source effectiveness." />
            </CardHeader>
            <CardContent className="space-y-4">
              {opportunity.error && <FriendlyState title="Revenue intelligence is unavailable" detail={opportunity.error} />}
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Realized" value={formatCurrency(revenue?.realizedRevenue?.total)} icon={CheckCircle2} />
                <MetricCard label="Pipeline" value={formatCurrency(revenue?.pipelineRevenue?.total)} icon={TrendingUp} />
                <MetricCard label="Expected" value={formatCurrency(revenue?.pipelineRevenue?.expectedValue)} icon={Target} />
                <MetricCard label="At risk" value={formatCurrency(revenue?.atRiskRevenue?.total)} icon={ShieldAlert} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-3 text-sm font-semibold">Client profitability</div>
                  <div className="space-y-2">
                    {topClients.slice(0, 5).map((client) => (
                      <div key={client.clientId} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3 text-sm">
                        <div>
                          <div className="font-medium">{client.clientName}</div>
                          <div className="text-xs text-muted-foreground">{client.activeJobs} active jobs · {client.engagementHealth} engagement</div>
                        </div>
                        <div className="text-right font-semibold">{formatCurrency(client.totalOpportunityValue ?? client.totalRevenue)}</div>
                      </div>
                    ))}
                    {!topClients.length && <div className="text-sm text-muted-foreground">No client profitability data yet.</div>}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-3 text-sm font-semibold">Source effectiveness</div>
                  <div className="space-y-2">
                    {topSources.slice(0, 5).map((source) => (
                      <div key={source.source} className="rounded-md bg-muted/40 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{source.sourceLabel}</span>
                          <Badge variant={source.estimatedROI === "high" ? "default" : "secondary"}>{source.estimatedROI} ROI</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <span>{source.totalCandidates} candidates</span>
                          <span>{source.submitted} submitted</span>
                          <span>{source.joined} joined</span>
                        </div>
                      </div>
                    ))}
                    {!topSources.length && <div className="text-sm text-muted-foreground">No source effectiveness data yet.</div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cn("rounded-md bg-muted/40 p-2")}>
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

