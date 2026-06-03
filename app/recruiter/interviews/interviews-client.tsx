"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Video, Plus, Loader2, X, Pencil } from "lucide-react";
import toast from "react-hot-toast";

function fmt(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function RecruiterInterviewsClient({ interviews: init, applications }: { interviews: any[]; applications: any[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ applicationId: "", round: "L1 - Technical", scheduledAt: "", durationMins: "60", meetingLink: "", interviewerName: "", mode: "Video" });
  const [editForm, setEditForm] = useState({ status: "", feedback: "", rating: "", scheduledAt: "", durationMins: "", meetingLink: "", interviewerName: "", round: "", mode: "" });

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.applicationId || !form.scheduledAt) return toast.error("Select application and date");
    setSaving(true);
    try {
      const res = await fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Interview scheduled!");
      setShowAdd(false);
      setForm({ applicationId: "", round: "L1 - Technical", scheduledAt: "", durationMins: "60", meetingLink: "", interviewerName: "", mode: "Video" });
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    try {
      const payload: any = { status: editForm.status };
      if (editForm.feedback) payload.feedback = editForm.feedback;
      if (editForm.rating) payload.rating = Number(editForm.rating);
      if (editForm.scheduledAt) payload.scheduledAt = editForm.scheduledAt;
      if (editForm.durationMins) payload.durationMins = Number(editForm.durationMins);
      if (editForm.meetingLink !== undefined) payload.meetingLink = editForm.meetingLink;
      if (editForm.interviewerName !== undefined) payload.interviewerName = editForm.interviewerName;
      if (editForm.round) payload.round = editForm.round;
      if (editForm.mode) payload.mode = editForm.mode;
      const res = await fetch(`/api/interviews/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Interview updated!");
      setEditId(null);
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Schedule Interview</>}</Button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-base font-semibold">Schedule New Interview</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Application *</Label>
              <select value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })} className={inputCls}>
                <option value="">Select candidate / job...</option>
                {applications.map((a: any) => <option key={a.id} value={a.id}>{a.candidate.name} — {a.job.title}</option>)}
              </select>
            </div>
            <div>
              <Label>Round</Label>
              <select value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })} className={inputCls}>
                {["L1 - Technical", "L2 - Architecture", "L3 - Managerial", "Client", "HR", "Stakeholder", "Cultural Fit"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><Label>Date & Time *</Label><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
            <div><Label>Duration (min)</Label><Input type="number" value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: e.target.value })} /></div>
            <div><Label>Meeting Link</Label><Input value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} placeholder="https://meet.google.com/..." /></div>
            <div><Label>Interviewer Name</Label><Input value={form.interviewerName} onChange={(e) => setForm({ ...form, interviewerName: e.target.value })} placeholder="e.g. Rajesh Kumar" /></div>
            <div>
              <Label>Mode</Label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className={inputCls}>
                {["Video", "Phone", "In-Person"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{saving ? "Scheduling..." : "Schedule Interview"}</Button>
        </form>
      )}

      {editId && (
        <form onSubmit={handleEdit} className="rounded-xl border-2 border-primary/30 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Update Interview</h3>
            <Button type="button" variant="ghost" size="icon" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
          </div>

          <h4 className="text-sm font-semibold text-muted-foreground">Scheduling</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={editForm.scheduledAt} onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })} />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" value={editForm.durationMins} onChange={(e) => setEditForm({ ...editForm, durationMins: e.target.value })} />
            </div>
            <div>
              <Label>Round</Label>
              <select value={editForm.round} onChange={(e) => setEditForm({ ...editForm, round: e.target.value })} className={inputCls}>
                {["L1 - Technical", "L2 - Architecture", "L3 - Managerial", "Client", "HR", "Stakeholder", "Cultural Fit"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label>Mode</Label>
              <select value={editForm.mode} onChange={(e) => setEditForm({ ...editForm, mode: e.target.value })} className={inputCls}>
                {["Video", "Phone", "In-Person"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label>Meeting Link</Label>
              <Input value={editForm.meetingLink} onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })} placeholder="https://meet.google.com/..." />
            </div>
            <div>
              <Label>Interviewer Name</Label>
              <Input value={editForm.interviewerName} onChange={(e) => setEditForm({ ...editForm, interviewerName: e.target.value })} placeholder="e.g. Rajesh Kumar" />
            </div>
          </div>

          <h4 className="text-sm font-semibold text-muted-foreground pt-1">Status & Feedback</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Status</Label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}>
                {["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><Label>Rating (1-5)</Label><Input type="number" min="1" max="5" value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })} /></div>
            <div><Label>Feedback</Label><Input value={editForm.feedback} onChange={(e) => setEditForm({ ...editForm, feedback: e.target.value })} placeholder="Interview feedback..." /></div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes</Button>
            <Button type="button" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {init.map((i: any) => (
          <div key={i.id} className="rounded-xl bg-card shadow-sm p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Calendar className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="font-medium">{i.application.candidate.name}</div>
              <div className="text-sm text-muted-foreground">{i.application.job.title} · Round {i.round} · {fmt(i.scheduledAt)}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${i.status === "SCHEDULED" ? "bg-amber-100 text-amber-700" : i.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{i.status}</span>
            {i.meetingLink && <a href={i.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1"><Video className="h-4 w-4" /> Join</a>}
            <Button variant="ghost" size="icon" onClick={() => {
              setEditId(i.id);
              setShowAdd(false);
              const dt = i.scheduledAt ? new Date(i.scheduledAt) : null;
              const dtLocal = dt ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}T${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}` : "";
              setEditForm({
                status: i.status || "SCHEDULED",
                feedback: i.feedback || "",
                rating: i.rating?.toString() || "",
                scheduledAt: dtLocal,
                durationMins: i.durationMins?.toString() || "60",
                meetingLink: i.meetingLink || "",
                interviewerName: i.interviewerName || "",
                round: i.round || "L1 - Technical",
                mode: i.mode || "Video",
              });
            }}><Pencil className="h-4 w-4" /></Button>
          </div>
        ))}
        {init.length === 0 && <div className="p-10 rounded-xl bg-card text-center text-muted-foreground">No interviews scheduled yet.</div>}
      </div>
    </div>
  );
}
