"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Plus, Loader2, X, Pencil, Check } from "lucide-react";
import toast from "react-hot-toast";

export function TemplatesClient({ templates }: { templates: any[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "", category: "general" });
  const [editForm, setEditForm] = useState({ subject: "", body: "", category: "" });

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const categories = ["screening", "interview", "offer", "joining", "follow-up", "rejection", "general"];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.subject || !form.body) return toast.error("All fields required");
    setSaving(true);
    try {
      const res = await fetch("/api/email-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Template created!");
      setShowAdd(false);
      setForm({ name: "", subject: "", body: "", category: "general" });
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/email-templates/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Template updated!");
      setEditId(null);
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />New Template</>}</Button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-base font-semibold">Create Email Template</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Template Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Interview Invitation" /></div>
            <div><Label>Category</Label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></div>
          </div>
          <div><Label>Subject *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Interview Scheduled - {{candidateName}}" /></div>
          <div><Label>Body *</Label><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={8} className={inputCls + " resize-y"} placeholder="Email body. Use {{candidateName}}, {{jobTitle}}, {{interviewDate}} as variables..." /></div>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{saving ? "Creating..." : "Create Template"}</Button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((t: any) => (
          <div key={t.id} className="rounded-xl bg-card shadow-sm p-5">
            {editId === t.id ? (
              <form onSubmit={handleEdit} className="space-y-3">
                <div><Label>Subject</Label><Input value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} /></div>
                <div><Label>Category</Label><select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className={inputCls}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></div>
                <div><Label>Body</Label><textarea value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} rows={5} className={inputCls + " resize-y"} /></div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={saving}><Check className="h-4 w-4 mr-1" />Save</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Mail className="h-4 w-4" /></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">{t.category}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditId(t.id); setEditForm({ subject: t.subject, body: t.body, category: t.category }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground mt-1">Subject: {t.subject}</div>
                <div className="text-sm text-muted-foreground mt-3 line-clamp-3 whitespace-pre-wrap">{t.body}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
