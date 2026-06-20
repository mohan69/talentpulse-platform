"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileUp, Save, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type ParsedResume = Record<string, any>;

const requiredFields = [
  "name",
  "email",
  "phone",
  "currentCity",
  "skills",
  "totalExperience",
  "currentCompany",
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

export function ResumeIntelligenceClient() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Waiting for resume upload.");
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [saving, setSaving] = useState(false);
  const missing = useMemo(() => missingFields(parsed), [parsed]);
  const score = useMemo(() => confidence(parsed), [parsed]);

  async function extract() {
    if (!file) return;
    setStatus("Extracting resume intelligence...");
    setParsed(null);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/ai/parse-resume", { method: "POST", body: form });
    if (!response.ok || !response.body) {
      setStatus("Resume extraction failed. Check parser configuration and try again.");
      return;
    }
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
        if (payload.status === "completed") {
          setParsed(payload.result ?? {});
          setStatus("Extraction complete. Review before saving.");
        } else if (payload.status === "error") {
          setStatus(payload.message ?? "Extraction failed.");
        }
      }
    }
  }

  function updateField(field: string, value: string) {
    setParsed((current) => ({ ...(current ?? {}), [field]: field === "skills" ? value.split(",").map((item) => item.trim()).filter(Boolean) : value }));
  }

  async function saveCandidate() {
    if (!parsed) return;
    setSaving(true);
    setStatus("Saving reviewed candidate...");
    const response = await fetch("/api/resume-intelligence/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed, confidence: score, missingFields: missing, fileName: file?.name ?? null }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    setStatus(response.ok ? `Candidate ${body.mode} successfully in Talent Repository.` : body.error ?? "Save failed.");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <aside className="rounded-xl bg-card p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><UploadCloud className="h-6 w-6" /></div>
        <h2 className="mt-4 font-display text-xl font-semibold">PDF Resume Upload</h2>
        <p className="mt-1 text-sm text-muted-foreground">Extraction supports PDF, DOCX, images, and text through the existing parser. Recruiter review is required before saving.</p>
        <div className="mt-5 rounded-lg border p-4">
          <Input type="file" accept=".pdf,.docx,.txt,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Button className="mt-4 w-full" disabled={!file} onClick={extract}><FileUp className="h-4 w-4" /> Extract Resume</Button>
        </div>
        <div className="mt-4 rounded-lg border bg-background p-4 text-sm">{status}</div>
      </aside>

      <div className="space-y-6">
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Extraction Review</h2>
              <p className="text-sm text-muted-foreground">Edit extracted fields before repository save.</p>
            </div>
            <Badge variant={score >= 80 ? "default" : "secondary"}>Confidence {score}%</Badge>
          </div>
          <Progress value={score} className="mt-4 h-2" />
          <div className="mt-4 flex flex-wrap gap-2">
            {missing.map((field) => <Badge key={field} variant="outline">Missing {field}</Badge>)}
            {missing.length === 0 && <Badge><CheckCircle2 className="h-3.5 w-3.5" /> Complete profile</Badge>}
          </div>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-sm">
          {parsed ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {["name", "email", "phone", "currentCity", "currentDesignation", "currentCompany", "totalExperience", "noticePeriod", "currentCtc", "expectedCtc", "degree", "institution"].map((field) => (
                  <label key={field} className="text-sm">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.replace(/([A-Z])/g, " $1")}</span>
                    <Input value={String(parsed[field] ?? "")} onChange={(event) => updateField(field, event.target.value)} />
                  </label>
                ))}
              </div>
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills</span>
                <Textarea value={Array.isArray(parsed.skills) ? parsed.skills.join(", ") : String(parsed.skills ?? "")} onChange={(event) => updateField("skills", event.target.value)} rows={3} />
              </label>
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</span>
                <Textarea value={String(parsed.summary ?? "")} onChange={(event) => updateField("summary", event.target.value)} rows={4} />
              </label>
              <div className="mt-5 flex justify-end">
                <Button disabled={saving || !parsed.name || !parsed.email} onClick={saveCandidate}><Save className="h-4 w-4" /> Save Reviewed Candidate</Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">Upload a resume to extract structured candidate intelligence.</div>
          )}
        </div>
      </div>
    </section>
  );
}
