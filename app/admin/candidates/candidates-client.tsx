"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { initials, formatDate } from "@/lib/format";

export function CandidatesClient({ candidates }: { candidates: any[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", currentCity: "", currentCompany: "", currentDesignation: "",
    totalExperience: "", relevantExperience: "", skills: "",
    degree: "", institution: "", graduationYear: "",
    currentCtc: "", expectedCtc: "", noticePeriod: "",
    linkedinUrl: "", employmentGapNotes: "",
  });

  function startEdit(c: any) {
    setEditId(c.id);
    setForm({
      name: c.name ?? "",
      email: c.email ?? "",
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
      employmentGapNotes: c.employmentGapNotes ?? "",
    });
  }

  async function handleSave() {
    if (!editId) return;
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email || null,
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
        employmentGapNotes: form.employmentGapNotes || null,
      };
      const res = await fetch(`/api/candidates/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Candidate updated!");
      setEditId(null);
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {/* Edit panel */}
      {editId && (
        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Edit Candidate</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
          </div>

          <h4 className="text-sm font-semibold text-muted-foreground">Personal Details</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="candidate@email.com" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
            <div><Label>Current City</Label><Input value={form.currentCity} onChange={(e) => setForm({ ...form, currentCity: e.target.value })} /></div>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>LinkedIn URL</Label><Input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
            <div><Label>Employment Gap Notes</Label><Input value={form.employmentGapNotes} onChange={(e) => setForm({ ...form, employmentGapNotes: e.target.value })} /></div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}{saving ? "Saving..." : "Save Changes"}</Button>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Exp</th>
              <th className="px-4 py-3 text-left">Skills</th>
              <th className="px-4 py-3 text-left">Apps</th>
              <th className="px-4 py-3 text-left">Added</th>
              <th className="px-4 py-3 text-left w-10"></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-accent">
                <td className="px-4 py-3">
                  <Link href={`/admin/candidates/${c.id}`} className="flex items-center gap-3 hover:text-primary">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">{initials(c.name)}</div>
                    <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.email}</div></div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.currentCity ?? "-"}</td>
                <td className="px-4 py-3">{c.totalExperience ?? 0}y</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1 max-w-xs">{(c.skills ?? []).slice(0, 3).map((s: string) => <span key={s} className="px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary">{s}</span>)}</div></td>
                <td className="px-4 py-3">{c._count?.applications ?? 0}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {candidates.length === 0 && <div className="p-10 text-center text-muted-foreground">No candidates yet.</div>}
      </div>
    </div>
  );
}
