"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Pencil, Loader2, Check, X, Briefcase, GraduationCap, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import { initials, formatCurrency } from "@/lib/format";

export function CandidateProfileClient({ candidate: c }: { candidate: any }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: c.name ?? "",
    phone: c.phone ?? "",
    currentCity: c.currentCity ?? "",
    currentCompany: c.currentCompany ?? "",
    currentDesignation: c.currentDesignation ?? "",
    totalExperience: c.totalExperience?.toString() ?? "0",
    relevantExperience: c.relevantExperience?.toString() ?? "0",
    skills: (c.skills ?? []).join(", "),
    degree: c.degree ?? "",
    institution: c.institution ?? "",
    graduationYear: c.graduationYear?.toString() ?? "",
    currentCtc: c.currentCtc?.toString() ?? "",
    expectedCtc: c.expectedCtc?.toString() ?? "",
    noticePeriod: c.noticePeriod?.toString() ?? "",
    linkedinUrl: c.linkedinUrl ?? "",
    preferredLocations: (c.preferredLocations ?? []).join(", "),
  });

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        phone: form.phone || null,
        currentCity: form.currentCity || null,
        currentCompany: form.currentCompany || null,
        currentDesignation: form.currentDesignation || null,
        totalExperience: form.totalExperience ? parseFloat(form.totalExperience) : 0,
        relevantExperience: form.relevantExperience ? parseFloat(form.relevantExperience) : 0,
        skills: form.skills ? form.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        degree: form.degree || null,
        institution: form.institution || null,
        graduationYear: form.graduationYear ? parseInt(form.graduationYear) : null,
        currentCtc: form.currentCtc ? parseFloat(form.currentCtc) : null,
        expectedCtc: form.expectedCtc ? parseFloat(form.expectedCtc) : null,
        noticePeriod: form.noticePeriod ? parseInt(form.noticePeriod) : null,
        linkedinUrl: form.linkedinUrl || null,
        preferredLocations: form.preferredLocations ? form.preferredLocations.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      };
      const res = await fetch(`/api/candidates/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Profile updated!");
      setEditing(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Edit Profile</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          </div>

          <h4 className="text-sm font-semibold text-muted-foreground">Personal Details</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
            <div><Label>Current City</Label><Input value={form.currentCity} onChange={(e) => setForm({ ...form, currentCity: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Preferred Locations <span className="text-xs text-muted-foreground">(comma separated)</span></Label><Input value={form.preferredLocations} onChange={(e) => setForm({ ...form, preferredLocations: e.target.value })} placeholder="Bengaluru, Mumbai, Pune" /></div>
            <div><Label>LinkedIn URL</Label><Input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
          </div>

          <h4 className="text-sm font-semibold text-muted-foreground pt-1">Experience</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Current Company</Label><Input value={form.currentCompany} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} /></div>
            <div><Label>Designation</Label><Input value={form.currentDesignation} onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })} /></div>
            <div><Label>Total Exp (years)</Label><Input type="number" step="0.5" value={form.totalExperience} onChange={(e) => setForm({ ...form, totalExperience: e.target.value })} /></div>
            <div><Label>Relevant Exp (years)</Label><Input type="number" step="0.5" value={form.relevantExperience} onChange={(e) => setForm({ ...form, relevantExperience: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Skills <span className="text-xs text-muted-foreground">(comma separated)</span></Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Java, Spring Boot, AWS" /></div>
          </div>

          <h4 className="text-sm font-semibold text-muted-foreground pt-1">Education</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Degree</Label><Input value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} /></div>
            <div><Label>Institution</Label><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
            <div><Label>Graduation Year</Label><Input type="number" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} /></div>
          </div>

          <h4 className="text-sm font-semibold text-muted-foreground pt-1">Compensation & Availability</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Current CTC (LPA)</Label><Input type="number" step="0.1" value={form.currentCtc} onChange={(e) => setForm({ ...form, currentCtc: e.target.value })} /></div>
            <div><Label>Expected CTC (LPA)</Label><Input type="number" step="0.1" value={form.expectedCtc} onChange={(e) => setForm({ ...form, expectedCtc: e.target.value })} /></div>
            <div><Label>Notice Period (days)</Label><Input type="number" value={form.noticePeriod} onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })} /></div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}{saving ? "Saving..." : "Save Profile"}</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-xl bg-card shadow-sm p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">{initials(c.name)}</div>
            <div>
              <div className="font-display text-xl font-bold">{c.name}</div>
              <div className="text-sm text-muted-foreground">{c.currentDesignation}{c.currentCompany ? ` at ${c.currentCompany}` : ""}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit Profile</Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {c.email}</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {c.phone ?? "-"}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {c.currentCity ?? "-"}</div>
          <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> {c.totalExperience ?? 0} yrs experience</div>
          <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-muted-foreground" /> Current: {c.currentCtc ? formatCurrency(c.currentCtc) : "-"}</div>
          <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-muted-foreground" /> Expected: {c.expectedCtc ? formatCurrency(c.expectedCtc) : "-"}</div>
        </div>

        {c.noticePeriod != null && <div className="mt-3 text-sm text-muted-foreground">Notice Period: {c.noticePeriod} days</div>}
        {c.linkedinUrl && <div className="mt-1"><a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">LinkedIn Profile →</a></div>}

        {(c.skills ?? []).length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Skills</div>
            <div className="flex flex-wrap gap-1.5">{c.skills.map((s: string) => <span key={s} className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">{s}</span>)}</div>
          </div>
        )}

        {(c.degree || c.institution) && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Education</div>
            <div className="text-sm">{c.degree}{c.institution ? ` — ${c.institution}` : ""}{c.graduationYear ? ` (${c.graduationYear})` : ""}</div>
          </div>
        )}

        {(c.preferredLocations ?? []).length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Preferred Locations</div>
            <div className="flex flex-wrap gap-1.5">{c.preferredLocations.map((l: string) => <span key={l} className="px-2 py-0.5 text-xs rounded bg-muted">{l}</span>)}</div>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="rounded-xl bg-card shadow-sm p-6">
        <h3 className="font-semibold mb-4">Projects</h3>
        <div className="space-y-3">
          {(c.projects ?? []).map((p: any) => (
            <div key={p.id} className="p-4 rounded-lg bg-muted/40">
              <div className="font-medium">{p.projectName}</div>
              <div className="text-xs text-muted-foreground">{p.role}{p.duration ? ` · ${p.duration}` : ""}</div>
              {p.description && <p className="text-sm mt-1 text-muted-foreground">{p.description}</p>}
              {p.technologies && p.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">{p.technologies.map((t: string) => <span key={t} className="px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary">{t}</span>)}</div>
              )}
            </div>
          ))}
          {(c.projects ?? []).length === 0 && <div className="text-sm text-muted-foreground">No projects added yet.</div>}
        </div>
      </div>
    </div>
  );
}
