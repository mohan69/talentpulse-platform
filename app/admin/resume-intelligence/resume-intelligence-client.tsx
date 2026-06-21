"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileUp, Save, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { buildResumeIntelligence } from "@/lib/talent-intelligence";
import { cn } from "@/lib/utils";

type ParsedResume = Record<string, any>;
type ResumeBatchItem = {
  id: string;
  file: File;
  fileName: string;
  status: "queued" | "extracting" | "review" | "saved" | "error";
  message: string;
  parsed: ParsedResume | null;
};

const requiredFields = [
  "name",
  "email",
  "phone",
  "currentCity",
  "skills",
  "totalExperience",
  "currentCompany",
  "currentDesignation",
  "education",
  "certifications",
  "noticePeriod",
  "currentCtc",
  "expectedCtc",
];

function missingFields(parsed: ParsedResume | null) {
  if (!parsed) return requiredFields;
  return requiredFields.filter((field) => {
    const value = parsed[field];
    if (Array.isArray(value)) return value.length === 0;
    return value === null || value === undefined || value === "";
  });
}

function confidence(parsed: ParsedResume | null) {
  if (!parsed) return 0;
  return Math.round(((requiredFields.length - missingFields(parsed).length) / requiredFields.length) * 100);
}

async function parseResumeFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/ai/parse-resume", { method: "POST", body: form });
  if (!response.ok || !response.body) throw new Error("Resume extraction failed.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const line = event.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.status === "completed") return payload.result ?? {};
      if (payload.status === "error") throw new Error(payload.message ?? "Extraction failed.");
    }
  }
  return {};
}

export function ResumeIntelligenceClient() {
  const [queue, setQueue] = useState<ResumeBatchItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const selected = queue.find((item) => item.id === selectedId) ?? queue[0] ?? null;
  const selectedParsed = selected?.parsed ?? null;
  const missing = useMemo(() => missingFields(selected?.parsed ?? null), [selected]);
  const score = useMemo(() => confidence(selected?.parsed ?? null), [selected]);
  const intelligence = useMemo(() => selectedParsed ? buildResumeIntelligence({
    ...selectedParsed,
    aiSummary: selectedParsed.executiveSummary ?? selectedParsed.summary,
  }) : null, [selectedParsed]);

  function addFiles(files?: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).filter((file) => file.name.toLowerCase().match(/\.(pdf|docx|txt)$/));
    const items = incoming.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      fileName: file.name,
      status: "queued" as const,
      message: "Queued for extraction",
      parsed: null,
    }));
    setQueue((current) => [...current, ...items]);
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }

  async function extractBatch() {
    setBatchRunning(true);
    for (const item of queue) {
      if (item.status !== "queued" && item.status !== "error") continue;
      setQueue((current) => current.map((row) => row.id === item.id ? { ...row, status: "extracting", message: "Extracting resume intelligence..." } : row));
      try {
        const parsed = await parseResumeFile(item.file);
        setQueue((current) => current.map((row) => row.id === item.id ? { ...row, status: "review", message: "Extraction complete. Recruiter review required.", parsed } : row));
        setSelectedId(item.id);
      } catch (error) {
        setQueue((current) => current.map((row) => row.id === item.id ? { ...row, status: "error", message: error instanceof Error ? error.message : "Extraction failed." } : row));
      }
    }
    setBatchRunning(false);
  }

  function updateField(field: string, value: string) {
    if (!selected) return;
    setQueue((current) => current.map((item) => {
      if (item.id !== selected.id) return item;
      return {
        ...item,
        parsed: {
          ...(item.parsed ?? {}),
          [field]: ["skills", "certifications", "previousCompanies"].includes(field)
            ? value.split(",").map((entry) => entry.trim()).filter(Boolean)
            : value,
        },
      };
    }));
  }

  async function saveCandidate() {
    if (!selected?.parsed) return;
    setSaving(true);
    const response = await fetch("/api/resume-intelligence/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed: selected.parsed, confidence: score, missingFields: missing, fileName: selected.fileName }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    setQueue((current) => current.map((item) => item.id === selected.id
      ? { ...item, status: response.ok ? "saved" : "error", message: response.ok ? `Candidate ${body.mode} successfully in Talent Repository.` : body.error ?? "Save failed." }
      : item));
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <aside className="rounded-xl bg-card p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><UploadCloud className="h-6 w-6" /></div>
        <h2 className="mt-4 font-display text-xl font-semibold">Batch Resume Upload</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upload PDF, DOCX or TXT resumes. TalentPulse extracts structured facts, then requires recruiter review before saving.</p>
        <div className="mt-5 rounded-lg border p-4">
          <Input type="file" multiple accept=".pdf,.docx,.txt" onChange={(event) => addFiles(event.target.files)} />
          <Button className="mt-4 w-full" disabled={!queue.length || batchRunning} onClick={extractBatch}><FileUp className="h-4 w-4" /> {batchRunning ? "Extracting Batch..." : "Extract Batch"}</Button>
        </div>
        <div className="mt-4 space-y-2">
          {queue.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={cn("w-full rounded-lg border p-3 text-left text-sm transition-colors hover:border-primary/50", selected?.id === item.id && "border-primary bg-primary/5")}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{item.fileName}</span>
                <Badge variant={item.status === "saved" ? "default" : item.status === "error" ? "destructive" : "secondary"}>{item.status}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{item.message}</div>
            </button>
          ))}
          {!queue.length && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No resumes queued yet.</div>}
        </div>
      </aside>

      <div className="space-y-6">
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Recruiter Review</h2>
              <p className="text-sm text-muted-foreground">Review extracted fields before candidate repository save.</p>
            </div>
            <Badge variant={score >= 80 ? "default" : "secondary"}>Confidence {score}%</Badge>
          </div>
          <Progress value={score} className="mt-4 h-2" />
          <div className="mt-4 flex flex-wrap gap-2">
            {missing.map((field) => <Badge key={field} variant="outline">Missing {field}</Badge>)}
            {missing.length === 0 && <Badge><CheckCircle2 className="h-3.5 w-3.5" /> Complete profile</Badge>}
          </div>
        </div>

        {intelligence && (
          <div className="rounded-xl bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">AI Talent Intelligence</h2>
                <p className="mt-1 text-sm text-muted-foreground">{intelligence.executiveSummary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{String(selectedParsed?.industry ?? intelligence.industry)}</Badge>
                <Badge variant="secondary">{String(selectedParsed?.seniority ?? intelligence.seniority)}</Badge>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <ResumeIntelBlock title="Strengths" values={stringArrayOr(selectedParsed?.strengths, intelligence.strengths)} positive />
              <ResumeIntelBlock title="Risks" values={stringArrayOr(selectedParsed?.risks, intelligence.risks)} />
              <ResumeIntelBlock title="Missing Information" values={stringArrayOr(selectedParsed?.missingInformation ?? selectedParsed?.missing_information, intelligence.missing)} />
              <ResumeIntelBlock title="Interview Questions" values={stringArrayOr(selectedParsed?.interviewQuestions ?? selectedParsed?.interview_questions, intelligence.interviewQuestions)} positive />
              <ResumeIntelBlock title="Similar Jobs" values={stringArrayOr(selectedParsed?.similarJobs ?? selectedParsed?.similar_jobs, intelligence.similarJobs)} positive />
              <ResumeIntelBlock title="Skills Extracted" values={Array.isArray(selectedParsed?.skills) ? (selectedParsed?.skills as string[]) : intelligence.matchedSkills} positive />
            </div>
          </div>
        )}

        <div className="rounded-xl bg-card p-5 shadow-sm">
          {selectedParsed ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {["name", "email", "phone", "currentCity", "currentDesignation", "currentCompany", "totalExperience", "noticePeriod", "currentCtc", "expectedCtc", "degree", "institution", "education"].map((field) => (
                  <label key={field} className="text-sm">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.replace(/([A-Z])/g, " $1")}</span>
                    <Input value={String(selectedParsed[field] ?? "")} onChange={(event) => updateField(field, event.target.value)} />
                  </label>
                ))}
              </div>
              {["skills", "certifications", "previousCompanies"].map((field) => (
                <label key={field} className="mt-4 block text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.replace(/([A-Z])/g, " $1")}</span>
                  <Textarea value={Array.isArray(selectedParsed[field]) ? selectedParsed[field].join(", ") : String(selectedParsed[field] ?? "")} onChange={(event) => updateField(field, event.target.value)} rows={2} />
                </label>
              ))}
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</span>
                <Textarea value={String(selectedParsed.summary ?? "")} onChange={(event) => updateField("summary", event.target.value)} rows={4} />
              </label>
              {["executiveSummary", "industry", "seniority", "strengths", "risks", "missingInformation", "interviewQuestions", "similarJobs"].map((field) => (
                <label key={field} className="mt-4 block text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.replace(/([A-Z])/g, " $1")}</span>
                  <Textarea value={Array.isArray(selectedParsed[field]) ? selectedParsed[field].join(", ") : String(selectedParsed[field] ?? "")} onChange={(event) => updateField(field, event.target.value)} rows={2} />
                </label>
              ))}
              <div className="mt-5 flex justify-end">
                <Button disabled={saving || !selectedParsed.name || !selectedParsed.email} onClick={saveCandidate}><Save className="h-4 w-4" /> Save Reviewed Candidate</Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">Upload resumes and run batch extraction to review candidate intelligence.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function stringArrayOr(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(/[;,|]/).map((item) => item.trim()).filter(Boolean);
  return fallback;
}

function ResumeIntelBlock({ title, values, positive = false }: { title: string; values: string[]; positive?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5">
        {values.length ? values.slice(0, 5).map((value) => (
          <div key={value} className={positive ? "text-sm text-emerald-700" : "text-sm text-amber-700"}>{value}</div>
        )) : <div className="text-sm text-muted-foreground">None detected</div>}
      </div>
    </div>
  );
}
