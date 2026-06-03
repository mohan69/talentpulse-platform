"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function AdminNewCandidateForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<any>({ name: "", email: "", phone: "", location: "", currentDesignation: "", totalExperience: 0, currentCtc: 0, expectedCtc: 0, noticePeriod: 30, skills: [], summary: "" });

  async function parseFile() {
    if (!file) return toast.error("Select a file first");
    setParsing(true); setStatus("Uploading & parsing...");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/ai/parse-resume", { method: "POST", body: fd });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; buf += decoder.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? ""; for (const line of lines) { if (!line.startsWith("data: ")) continue; const d = line.slice(6).trim(); if (!d || d === "[DONE]") continue; try { const p = JSON.parse(d); if (p.status === "processing") setStatus(p.message ?? "Processing..."); else if (p.status === "completed") { const r = p.result ?? {}; setForm({ name: r.name ?? "", email: r.email ?? "", phone: r.phone ?? "", location: r.location ?? "", currentDesignation: r.currentDesignation ?? "", totalExperience: r.totalExperience ?? 0, currentCtc: r.currentCtc ?? 0, expectedCtc: r.expectedCtc ?? 0, noticePeriod: r.noticePeriod ?? 30, skills: r.skills ?? [], summary: r.aiSummary ?? "" }); setStatus("Parsed!"); toast.success("Resume parsed"); } else if (p.status === "error") { setStatus(p.message); toast.error(p.message ?? "Error"); } } catch {} } }
    } catch (e: any) { toast.error(e?.message ?? "Parse failed"); } finally { setParsing(false); }
  }

  async function save() {
    if (!form.name || !form.email) return toast.error("Name and email required");
    setSaving(true);
    try {
      const res = await fetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      const data = await res.json();
      toast.success("Candidate added");
      router.push(`/admin/candidates/${data.id}`);
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); } finally { setSaving(false); }
  }

  return (<div className="grid lg:grid-cols-2 gap-6">
    <div className="rounded-xl bg-card shadow-sm p-5"><h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500" />AI Resume Parser</h3>
      <label className="block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent transition"><Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" /><div className="text-sm">{file ? file.name : "Click to select PDF/DOCX/Image"}</div><input type="file" accept=".pdf,.docx,.doc,.txt,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
      <Button onClick={parseFile} disabled={parsing || !file} className="w-full mt-3">{parsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{status}</> : "Parse Resume"}</Button>
      {status && !parsing && <div className="mt-2 text-xs text-muted-foreground">{status}</div>}
    </div>
    <div className="rounded-xl bg-card shadow-sm p-5 space-y-3"><h3 className="font-semibold mb-2">Candidate Details</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Full Name*</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Email*</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        <div className="col-span-2"><Label>Headline</Label><Input value={form.currentDesignation} onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })} /></div>
        <div><Label>Exp (yrs)</Label><Input type="number" value={form.totalExperience} onChange={(e) => setForm({ ...form, totalExperience: parseFloat(e.target.value) || 0 })} /></div>
        <div><Label>Notice (days)</Label><Input type="number" value={form.noticePeriod} onChange={(e) => setForm({ ...form, noticePeriod: parseInt(e.target.value) || 0 })} /></div>
        <div><Label>Current CTC (INR)</Label><Input type="number" value={form.currentCtc} onChange={(e) => setForm({ ...form, currentCtc: parseInt(e.target.value) || 0 })} /></div>
        <div><Label>Expected CTC (INR)</Label><Input type="number" value={form.expectedCtc} onChange={(e) => setForm({ ...form, expectedCtc: parseInt(e.target.value) || 0 })} /></div>
        <div className="col-span-2"><Label>Skills (comma-separated)</Label><Input value={(form.skills ?? []).join(", ")} onChange={(e) => setForm({ ...form, skills: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} /></div>
        <div className="col-span-2"><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={4} /></div>
      </div>
      <div className="flex gap-3">
        <Button onClick={save} disabled={saving} className="flex-1">{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : "Save Candidate"}</Button>
        <Button variant="outline" onClick={() => router.push("/admin/candidates")}>Cancel</Button>
      </div>
    </div>
  </div>);
}
