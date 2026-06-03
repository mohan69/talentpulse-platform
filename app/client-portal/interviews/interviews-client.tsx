"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Video, Pencil, Loader2, Check, X } from "lucide-react";
import toast from "react-hot-toast";

function fmt(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ClientInterviewsClient({ interviews: init }: { interviews: any[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ feedback: "", rating: "" });

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    if (!editForm.feedback.trim()) return toast.error("Please provide feedback");
    setSaving(true);
    try {
      const payload: any = { feedback: editForm.feedback };
      if (editForm.rating) payload.rating = Number(editForm.rating);
      const res = await fetch(`/api/interviews/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Feedback submitted!");
      setEditId(null);
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {editId && (
        <form onSubmit={handleFeedback} className="rounded-xl border-2 border-primary/30 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Interview Feedback</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Rating (1-5)</Label><Input type="number" min="1" max="5" value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })} placeholder="1-5" /></div>
            <div className="md:col-span-2">
              <Label>Feedback *</Label>
              <textarea value={editForm.feedback} onChange={(e) => setEditForm({ ...editForm, feedback: e.target.value })} rows={3} className={inputCls + " resize-y"} placeholder="Share your feedback on the candidate's performance..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}{saving ? "Submitting..." : "Submit Feedback"}</Button>
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
              {i.feedback && <div className="text-xs text-muted-foreground mt-1 italic">Feedback: {i.feedback}</div>}
              {i.rating && <div className="text-xs text-muted-foreground">Rating: {"★".repeat(i.rating)}{"☆".repeat(5 - i.rating)}</div>}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${i.status === "SCHEDULED" ? "bg-amber-100 text-amber-700" : i.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{i.status}</span>
            {i.meetingLink && <a href={i.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1"><Video className="h-4 w-4" /> Join</a>}
            <Button variant="ghost" size="icon" onClick={() => { setEditId(i.id); setEditForm({ feedback: i.feedback ?? "", rating: i.rating?.toString() ?? "" }); }}><Pencil className="h-4 w-4" /></Button>
          </div>
        ))}
        {init.length === 0 && <div className="p-10 rounded-xl bg-card text-center text-muted-foreground">No interviews yet.</div>}
      </div>
    </div>
  );
}
