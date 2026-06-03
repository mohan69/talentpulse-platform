"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  clients: { id: string; name: string }[];
  recruiters: { id: string; name: string | null; email: string }[];
}

export function NewJobForm({ clients, recruiters }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [jdText, setJdText] = useState("");
  const [skillInput, setSkillInput] = useState("");

  const [form, setForm] = useState({
    title: "",
    clientId: "",
    recruiterId: "",
    location: "",
    jobType: "Full-time",
    experienceMin: "",
    experienceMax: "",
    skills: [] as string[],
    salaryMin: "",
    salaryMax: "",
    currency: "INR",
    description: "",
    openings: "1",
    priority: "MEDIUM",
  });

  function updateField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      updateField("skills", [...form.skills, s]);
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    updateField("skills", form.skills.filter((sk) => sk !== skill));
  }

  async function parseJD() {
    if (!jdText.trim()) return toast.error("Paste a JD first");
    setParsing(true);
    try {
      const res = await fetch("/api/ai/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      });
      if (!res.ok || !res.body) throw new Error("Parse failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let partial = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partial += decoder.decode(value, { stream: true });
        const lines = partial.split("\n");
        partial = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const j = JSON.parse(data);
            if (j.status === "completed" && j.result) {
              const r = j.result;
              setForm((prev) => ({
                ...prev,
                title: r.title || prev.title,
                location: r.location || prev.location,
                jobType: r.jobType || prev.jobType,
                experienceMin: r.experienceMin?.toString() || prev.experienceMin,
                experienceMax: r.experienceMax?.toString() || prev.experienceMax,
                skills: Array.isArray(r.skills) && r.skills.length > 0 ? r.skills : prev.skills,
                salaryMin: r.salaryMin?.toString() || prev.salaryMin,
                salaryMax: r.salaryMax?.toString() || prev.salaryMax,
                description: r.description || r.summary || prev.description,
              }));
              toast.success("JD parsed successfully!");
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Job title is required");
    if (!form.clientId) return toast.error("Please select a client");
    setSaving(true);
    try {
      const payload = {
        ...form,
        experienceMin: form.experienceMin ? Number(form.experienceMin) : 0,
        experienceMax: form.experienceMax ? Number(form.experienceMax) : 0,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        openings: Number(form.openings || 1),
        recruiterId: form.recruiterId || null,
      };
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create job");
      }
      const job = await res.json();
      toast.success("Job created!");
      router.push(`/admin/jobs/${job.id}`);
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const selectCls = inputCls;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* AI JD Parser */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Job Description Parser
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Paste a job description below and let AI auto-fill the form.</p>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the full job description here..."
          rows={6}
          className={inputCls + " resize-y"}
        />
        <div className="mt-3">
          <Button type="button" onClick={parseJD} disabled={parsing}>
            {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {parsing ? "Parsing..." : "Parse with AI"}
          </Button>
        </div>
      </div>

      {/* Manual Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h3 className="text-base font-semibold">Job Details</h3>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="title">Job Title *</Label>
            <Input id="title" value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="e.g. Senior Frontend Developer" />
          </div>
          <div>
            <Label htmlFor="client">Client *</Label>
            <select id="client" value={form.clientId} onChange={(e) => updateField("clientId", e.target.value)} className={selectCls}>
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="recruiter">Assign Recruiter</Label>
            <select id="recruiter" value={form.recruiterId} onChange={(e) => updateField("recruiterId", e.target.value)} className={selectCls}>
              <option value="">Unassigned</option>
              {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name || r.email}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="e.g. Mumbai, Hybrid" />
          </div>
          <div>
            <Label htmlFor="jobType">Employment Type</Label>
            <select id="jobType" value={form.jobType} onChange={(e) => updateField("jobType", e.target.value)} className={selectCls}>
              {["Full-time", "Part-time", "Contract", "Freelance", "Internship"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <select id="priority" value={form.priority} onChange={(e) => updateField("priority", e.target.value)} className={selectCls}>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <Label>Experience (years)</Label>
            <div className="flex gap-2 items-center">
              <Input type="number" min="0" placeholder="Min" value={form.experienceMin} onChange={(e) => updateField("experienceMin", e.target.value)} />
              <span className="text-muted-foreground">to</span>
              <Input type="number" min="0" placeholder="Max" value={form.experienceMax} onChange={(e) => updateField("experienceMax", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>CTC Range ({form.currency})</Label>
            <div className="flex gap-2 items-center">
              <Input type="number" min="0" placeholder="Min" value={form.salaryMin} onChange={(e) => updateField("salaryMin", e.target.value)} />
              <span className="text-muted-foreground">to</span>
              <Input type="number" min="0" placeholder="Max" value={form.salaryMax} onChange={(e) => updateField("salaryMax", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="openings">Openings</Label>
            <Input id="openings" type="number" min="1" value={form.openings} onChange={(e) => updateField("openings", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <select id="currency" value={form.currency} onChange={(e) => updateField("currency", e.target.value)} className={selectCls}>
              {["INR", "USD", "GBP", "EUR", "AED", "SGD"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Skills */}
        <div>
          <Label>Skills</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              placeholder="Type a skill and press Enter"
            />
            <Button type="button" variant="outline" size="icon" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
          </div>
          {form.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Job Description</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={6}
            className={inputCls + " resize-y mt-1"}
            placeholder="Full job description, responsibilities, requirements..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {saving ? "Creating..." : "Create Job"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/jobs")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
