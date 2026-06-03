"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Send, X } from "lucide-react";
import toast from "react-hot-toast";

/* ---------- Add Note ---------- */
export function AddNoteForm({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      toast.success("Note added");
      setBody("");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a note..."
        rows={3}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={saving || !body.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setBody(""); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ---------- Add Project ---------- */
export function AddProjectForm({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ projectName: "", role: "", description: "", skillsUsed: "" });

  async function handleSubmit() {
    if (!form.projectName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skillsUsed: form.skillsUsed.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Failed to add project");
      toast.success("Project added");
      setForm({ projectName: "", role: "", description: "", skillsUsed: "" });
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border">
      <input className={inputCls} placeholder="Project Name" value={form.projectName} onChange={(e) => setForm(f => ({ ...f, projectName: e.target.value }))} autoFocus />
      <input className={inputCls} placeholder="Role" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} />
      <textarea className={`${inputCls} resize-none`} placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      <input className={inputCls} placeholder="Skills (comma-separated)" value={form.skillsUsed} onChange={(e) => setForm(f => ({ ...f, skillsUsed: e.target.value }))} />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={saving || !form.projectName.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/* ---------- Email Compose ---------- */
export function EmailComposeDialog({ candidateId, candidateEmail, candidateName }: { candidateId: string; candidateEmail: string; candidateName: string }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: "", htmlBody: "" });

  async function handleSend() {
    if (!form.subject.trim() || !form.htmlBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          recipient: candidateEmail,
          subject: form.subject.trim(),
          htmlBody: form.htmlBody.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Send failed");
      toast.success("Email sent to " + candidateName);
      setForm({ subject: "", htmlBody: "" });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Send className="h-3.5 w-3.5 mr-1" /> Send Email
      </Button>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Email to {candidateName}</h3>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="text-xs text-muted-foreground">To: {candidateEmail}</div>
      <input className={inputCls} placeholder="Subject" value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} autoFocus />
      <textarea className={`${inputCls} resize-none`} placeholder="Email body..." rows={5} value={form.htmlBody} onChange={(e) => setForm(f => ({ ...f, htmlBody: e.target.value }))} />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSend} disabled={sending || !form.subject.trim() || !form.htmlBody.trim()}>
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />} Send
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
