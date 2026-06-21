"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, Send, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StageBadge } from "@/components/workspace/stage-badge";
import { formatCurrency } from "@/lib/phase4/recruiter-revenue";
import { buildAgencyMemory, buildSubmissionCopilot } from "@/lib/talent-intelligence";
import type { PipelineStage } from "@prisma/client";

type Row = {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  clientName: string;
  recruiterName: string;
  stage: PipelineStage;
  readiness: number;
  interviewProbability: number;
  offerProbability: number;
  joiningProbability: number;
  revenuePotential: number;
  risks: string[];
  missing: string[];
  recommendation: string;
  candidate: {
    name: string;
    email: string;
    phone: string | null;
    currentCity: string | null;
    currentCompany: string | null;
    currentDesignation: string | null;
    totalExperience: number;
    relevantExperience: number;
    skills: string[];
    currentCtc: number | null;
    expectedCtc: number | null;
    noticePeriod: number | null;
    aiSummary: string | null;
    source: string;
  };
  job: {
    title: string;
    location: string;
    skills: string[];
    salaryMin: number | null;
    salaryMax: number | null;
    client: { name: string } | null;
  };
};

const actions = [
  "Screen Now",
  "Verify Compensation",
  "Verify Notice",
  "Request Updated Resume",
  "Submit To Client",
  "Schedule Interview",
  "Generate Submission Package",
  "Move To Offer Stage",
  "Keep Warm",
  "Archive",
];

export function SubmissionIntelligenceClient({ rows }: { rows: Row[] }) {
  const [selectedId, setSelectedId] = useState(rows[0]?.applicationId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const selected = useMemo(() => rows.find((row) => row.applicationId === selectedId) ?? rows[0], [rows, selectedId]);
  const copilot = useMemo(() => selected ? buildSubmissionCopilot(selected.candidate, selected.job) : null, [selected]);
  const memory = useMemo(() => selected ? buildAgencyMemory([{ stage: selected.stage, job: selected.job }]) : null, [selected]);

  async function runAction(row: Row, action: string) {
    if (action === "Generate Submission Package") {
      window.open(`/admin/submission-intelligence/package?applicationId=${row.applicationId}`, "_blank");
      return;
    }
    setMessage(`${action} in progress...`);
    const response = await fetch("/api/recruiter-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, applicationId: row.applicationId, candidateId: row.candidateId, source: "submission-intelligence" }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? body.message : body.error ?? "Action failed");
  }

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
      <aside className="rounded-xl bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Candidate Progression</h2>
        <div className="mt-4 space-y-3">
          {rows.slice(0, 18).map((row) => (
            <button
              key={row.applicationId}
              type="button"
              onClick={() => setSelectedId(row.applicationId)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId === row.applicationId ? "border-primary bg-primary/5" : "bg-background hover:border-primary/50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{row.candidateName}</div>
                <div className="text-sm font-semibold">{row.readiness}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{row.jobTitle} · {row.clientName}</div>
              <Progress value={row.readiness} className="mt-2 h-1.5" />
            </button>
          ))}
          {rows.length === 0 && <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">No candidate applications available.</div>}
        </div>
      </aside>

      {selected && (
        <div className="space-y-6">
          <div className="rounded-xl bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-bold">{selected.candidateName}</h2>
                  <StageBadge stage={selected.stage} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{selected.jobTitle} · {selected.clientName} · Recruiter: {selected.recruiterName}</p>
              </div>
              <Button asChild>
                <Link href={`/admin/submission-intelligence/package?applicationId=${selected.applicationId}`}>
                  <FileText className="h-4 w-4" /> Generate Submission Package
                </Link>
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-5">
              <Score label="Readiness" value={selected.readiness} icon={CheckCircle2} />
              <Score label="Interview Probability" value={selected.interviewProbability} icon={TrendingUp} />
              <Score label="Offer Probability" value={selected.offerProbability} icon={TrendingUp} />
              <Score label="Joining Probability" value={selected.joiningProbability} icon={TrendingUp} />
              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">Revenue Potential</div>
                <div className="mt-3 font-display text-2xl font-bold">{formatCurrency(selected.revenuePotential)}</div>
              </div>
            </div>
          </div>

          {message && <div className="rounded-lg border bg-muted/40 p-3 text-sm">{message}</div>}

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Risk Indicators" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} items={selected.risks} />
            <Panel title="Missing Information" items={selected.missing.length ? selected.missing : ["No major gaps"]} />
            <div className="rounded-xl bg-card p-5 shadow-sm">
              <h3 className="font-display text-lg font-semibold">Recruiter Recommendations</h3>
              <div className="mt-3 rounded-lg border bg-background p-4">
                <Badge>{selected.recommendation}</Badge>
                <p className="mt-3 text-sm text-muted-foreground">Next action is based on readiness, missing fields, current stage, and revenue risk.</p>
              </div>
            </div>
          </div>

          {copilot && memory && (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="rounded-xl bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold">Submission Copilot</h3>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <CopilotItem label="Candidate Summary" value={copilot.candidateSummary} />
                  <CopilotItem label="Why Fit" value={copilot.whyFit} />
                  <CopilotItem label="Skills Match" value={copilot.skillsMatch} />
                  <CopilotItem label="Relevant Experience" value={copilot.relevantExperience} />
                  <CopilotItem label="Compensation Summary" value={copilot.compensationSummary} />
                  <CopilotItem label="Notice Summary" value={copilot.noticeSummary} />
                </div>
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Recruiter recommendation: </span>{copilot.recruiterRecommendation}
                </div>
              </div>
              <div className="rounded-xl bg-card p-5 shadow-sm">
                <h3 className="font-display text-lg font-semibold">Agency Memory</h3>
                <div className="mt-4 space-y-2">
                  <MemoryLine label="Previously Submitted" active={memory.previouslySubmitted} />
                  <MemoryLine label="Previously Interviewed" active={memory.previouslyInterviewed} />
                  <MemoryLine label="Previously Offered" active={memory.previouslyOffered} />
                  <MemoryLine label="Previously Joined" active={memory.previouslyJoined} />
                  <MemoryLine label="Previously Rejected" active={memory.previouslyRejected} />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-card p-5 shadow-sm">
            <h3 className="font-display text-lg font-semibold">Action Center</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action}
                  variant={action === selected.recommendation ? "default" : "outline"}
                  onClick={() => runAction(selected, action)}
                >
                  {action === "Submit To Client" && <Send className="h-4 w-4" />}
                  {action}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CopilotItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function MemoryLine({ label, active }: { label: string; active: boolean }) {
  return <div className={active ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800" : "rounded-lg border bg-background p-3 text-sm text-muted-foreground"}>{active ? "Yes" : "No"} · {label}</div>;
}

function Score({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}%</div>
      <Progress value={value} className="mt-3 h-1.5" />
    </div>
  );
}

function Panel({ title, items, icon }: { title: string; items: string[]; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border bg-background p-3 text-sm">{item}</div>
        ))}
      </div>
    </div>
  );
}
