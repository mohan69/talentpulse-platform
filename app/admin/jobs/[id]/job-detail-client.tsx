"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StageBadge } from "@/components/workspace/stage-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import Link from "next/link";
import { Pencil, Loader2, X, Check, Mail, Phone, MapPin, Building2, Briefcase, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { isPlaceholderEmail } from "@/lib/candidate-utils";

export function JobDetailClient({ job, recruiters, clients = [] }: { job: any; recruiters: { id: string; name: string | null; email: string }[]; clients?: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: job.title,
    location: job.location,
    jobType: job.jobType,
    experienceMin: job.experienceMin?.toString() ?? "",
    experienceMax: job.experienceMax?.toString() ?? "",
    salaryMin: job.salaryMin?.toString() ?? "",
    salaryMax: job.salaryMax?.toString() ?? "",
    description: job.description ?? "",
    skills: (job.skills ?? []).join(", "),
    status: job.status,
    recruiterId: job.recruiterId ?? "",
    clientId: job.clientId ?? "",
    openings: job.openings?.toString() ?? "1",
    priority: job.priority ?? "MEDIUM",
  });

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        experienceMin: Number(form.experienceMin || 0),
        experienceMax: Number(form.experienceMax || 0),
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        openings: Number(form.openings || 1),
        skills: form.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
        recruiterId: form.recruiterId || null,
        clientId: form.clientId || undefined,
      };
      const res = await fetch(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Job updated!");
      setEditing(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        {editing ? (
          <div className="rounded-xl border-2 border-primary/30 bg-card p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Edit Job</h3><Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Client</Label><select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={inputCls}>
                <option value="">Select Client...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
              <div><Label>Type</Label><select value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })} className={inputCls}>
                {["Full-time", "Part-time", "Contract", "Freelance", "Internship"].map((t) => <option key={t}>{t}</option>)}
              </select></div>
              <div><Label>Status</Label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                {["OPEN", "CLOSED", "ON_HOLD"].map((s) => <option key={s}>{s}</option>)}
              </select></div>
              <div><Label>Experience</Label><div className="flex gap-2 items-center"><Input type="number" placeholder="Min" value={form.experienceMin} onChange={(e) => setForm({ ...form, experienceMin: e.target.value })} /><span className="text-muted-foreground">to</span><Input type="number" placeholder="Max" value={form.experienceMax} onChange={(e) => setForm({ ...form, experienceMax: e.target.value })} /></div></div>
              <div><Label>CTC Range</Label><div className="flex gap-2 items-center"><Input type="number" placeholder="Min" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} /><span className="text-muted-foreground">to</span><Input type="number" placeholder="Max" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} /></div></div>
              <div><Label>Recruiter</Label><select value={form.recruiterId} onChange={(e) => setForm({ ...form, recruiterId: e.target.value })} className={inputCls}>
                <option value="">Unassigned</option>
                {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name || r.email}</option>)}
              </select></div>
              <div><Label>Priority</Label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}
              </select></div>
            </div>
            <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
            <div><Label>Description</Label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} className={inputCls + " resize-y"} /></div>
            <div className="flex gap-2"><Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}{saving ? "Saving..." : "Save Changes"}</Button><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
          </div>
        ) : (
          <div className="rounded-xl bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold">Description</h3>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit Job</Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            {job.skills?.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold mb-2">Must-Have Skills</div>
                <div className="flex flex-wrap gap-1.5">{job.skills.map((s: string) => <span key={s} className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">{s}</span>)}</div>
              </div>
            )}
          </div>
        )}
        <ApplicationsList applications={job.applications} basePath="/admin" />
      </div>
      <div className="space-y-4">
        <div className="rounded-xl bg-card shadow-sm p-5 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-medium">{job.client?.name ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : job.status === "CLOSED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{job.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">CTC Range</span><span>{formatCurrency(job.salaryMin ?? 0)} - {formatCurrency(job.salaryMax ?? 0)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span>{job.experienceMin}-{job.experienceMax} yrs</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{job.jobType}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span>{job.priority}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Recruiter</span><span>{job.recruiter?.name ?? "Unassigned"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{formatDate(job.createdAt)}</span></div>
        </div>
      </div>
    </div>
  );
}

function InlineContactEdit({ candidateId, field, currentValue, icon: Icon, label }: { candidateId: string; field: "email" | "phone"; currentValue: string | null; icon: any; label: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue ?? "");
  const [saving, setSaving] = useState(false);
  const [savedValue, setSavedValue] = useState(currentValue);
  const router = useRouter();

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value.trim() }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      setSavedValue(value.trim());
      setEditing(false);
      toast.success(`${label} updated`);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <input autoFocus className="border rounded px-1.5 py-0.5 text-xs w-40" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }} placeholder={`Enter ${label.toLowerCase()}`} />
        <button onClick={handleSave} disabled={saving} className="text-emerald-600 hover:text-emerald-700"><Check className="h-3.5 w-3.5" /></button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </span>
    );
  }

  const displayValue = savedValue;
  const isAvailable = field === "email" ? (displayValue && !isPlaceholderEmail(displayValue)) : !!displayValue;

  if (isAvailable) {
    const href = field === "email" ? `mailto:${displayValue}` : `tel:${displayValue}`;
    return (
      <span className="flex items-center gap-1.5">
        <a href={href} className="flex items-center gap-1.5 text-primary hover:underline"><Icon className="h-3.5 w-3.5" />{displayValue}</a>
        <button onClick={() => { setValue(displayValue!); setEditing(true); }} className="text-muted-foreground/50 hover:text-primary" title={`Edit ${label}`}><Pencil className="h-3 w-3" /></button>
      </span>
    );
  }

  return (
    <button onClick={() => { setValue(""); setEditing(true); }} className="flex items-center gap-1.5 text-muted-foreground/60 italic text-xs hover:text-primary transition-colors" title={`Add ${label}`}>
      <Icon className="h-3.5 w-3.5" />{label} not available <Pencil className="h-3 w-3 ml-0.5" />
    </button>
  );
}

function ApplicationsList({ applications, basePath }: { applications: any[]; basePath: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-xl bg-card shadow-sm p-5">
      <h3 className="font-display font-semibold mb-4">Applications ({applications.length})</h3>
      <div className="space-y-3">
        {applications.map((a: any) => {
          const c = a.candidate;
          const isExpanded = expandedId === a.id;
          return (
            <div key={a.id} className="rounded-lg border border-border overflow-hidden">
              <div
                className="flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {c.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.currentDesignation && c.currentCompany
                        ? `${c.currentDesignation} at ${c.currentCompany}`
                        : c.currentDesignation || c.currentCompany || "—"}
                      {c.totalExperience ? ` · ${c.totalExperience} yrs` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.matchScore != null && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.matchScore >= 70 ? "bg-emerald-100 text-emerald-700" : a.matchScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {a.matchScore}%
                    </span>
                  )}
                  <StageBadge stage={a.stage} />
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-3">
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                    <InlineContactEdit candidateId={c.id} field="email" currentValue={c.email} icon={Mail} label="Email" />
                    <InlineContactEdit candidateId={c.id} field="phone" currentValue={c.phone} icon={Phone} label="Phone" />
                    {c.currentCity && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />{c.currentCity}
                      </span>
                    )}
                    {c.linkedinUrl && (
                      <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />LinkedIn Profile
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {c.currentCompany && (
                      <div>
                        <span className="text-muted-foreground block">Company</span>
                        <span className="font-medium">{c.currentCompany}</span>
                      </div>
                    )}
                    {c.currentDesignation && (
                      <div>
                        <span className="text-muted-foreground block">Designation</span>
                        <span className="font-medium">{c.currentDesignation}</span>
                      </div>
                    )}
                    {c.totalExperience > 0 && (
                      <div>
                        <span className="text-muted-foreground block">Experience</span>
                        <span className="font-medium">{c.totalExperience} years</span>
                      </div>
                    )}
                    {c.noticePeriod != null && (
                      <div>
                        <span className="text-muted-foreground block">Notice Period</span>
                        <span className="font-medium">{c.noticePeriod} days</span>
                      </div>
                    )}
                    {(c.currentCtc != null || c.expectedCtc != null) && (
                      <div>
                        <span className="text-muted-foreground block">CTC</span>
                        <span className="font-medium">
                          {c.currentCtc != null ? `₹${(c.currentCtc / 100000).toFixed(1)}L` : "—"}
                          {c.expectedCtc != null ? ` → ₹${(c.expectedCtc / 100000).toFixed(1)}L` : ""}
                        </span>
                      </div>
                    )}
                    {c.source && (
                      <div>
                        <span className="text-muted-foreground block">Source</span>
                        <span className="font-medium">{c.source}</span>
                      </div>
                    )}
                  </div>

                  {c.skills?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {c.skills.map((s: string) => (
                          <span key={s} className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.aiSummary && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Profile Summary</span>
                      <p className="text-sm text-foreground/80 leading-relaxed">{c.aiSummary}</p>
                    </div>
                  )}

                  <div className="pt-1">
                    <Link
                      href={`${basePath}/candidates/${a.candidateId}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View Full Profile →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {applications.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">No applications yet.</div>
        )}
      </div>
    </div>
  );
}