"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, X, Phone, Building2, Pencil, Check } from "lucide-react";
import toast from "react-hot-toast";
import { initials } from "@/lib/format";

export function TeamClient({ users, clients }: { users: any[]; clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "RECRUITER", phone: "", clientId: "" });

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "", clientId: "", password: "", isActive: true });

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  function startEdit(u: any) {
    setEditId(u.id);
    setEditForm({
      name: u.name ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      role: u.role ?? "RECRUITER",
      clientId: u.clientId ?? "",
      password: "",
      isActive: u.isActive ?? true,
    });
    setShowAdd(false);
  }

  async function handleEditSave() {
    if (!editId) return;
    if (!editForm.name.trim()) return toast.error("Name is required");
    setEditSaving(true);
    try {
      const res = await fetch(`/api/team/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Team member updated!");
      setEditId(null);
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setEditSaving(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error("Name, email & password required");
    setSaving(true);
    try {
      const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, clientId: form.clientId || null }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Team member added!");
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "RECRUITER", phone: "", clientId: "" });
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  const roleBadge: Record<string, string> = {
    ADMIN: "bg-primary/10 text-primary",
    RECRUITER: "bg-blue-100 text-blue-700",
    CLIENT: "bg-emerald-100 text-emerald-700",
    CANDIDATE: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setShowAdd(!showAdd); setEditId(null); }}>{showAdd ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Team Member</>}</Button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-base font-semibold">Add New Team Member</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Pandey" /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. priya@careerpathsindia.com" /></div>
            <div><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set initial password" /></div>
            <div><Label>Role</Label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
              {["RECRUITER", "ADMIN", "CLIENT"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
            {form.role === "CLIENT" && <div><Label>Link to Client</Label><select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={inputCls}>
              <option value="">None</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>}
          </div>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{saving ? "Adding..." : "Add Member"}</Button>
        </form>
      )}

      {/* Edit panel */}
      {editId && (
        <div className="rounded-xl border-2 border-primary/30 bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Edit Team Member</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Full Name *</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="user@example.com" /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
            <div><Label>Role</Label><select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={inputCls}>
              {["RECRUITER", "ADMIN", "CLIENT", "CANDIDATE"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select></div>
            {editForm.role === "CLIENT" && (
              <div><Label>Link to Client</Label><select value={editForm.clientId} onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })} className={inputCls}>
                <option value="">None</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            )}
            <div><Label>New Password <span className="text-xs text-muted-foreground">(leave blank to keep current)</span></Label><Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" /></div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="isActive" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="isActive" className="mb-0 cursor-pointer">Active Account</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEditSave} disabled={editSaving}>{editSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}{editSaving ? "Saving..." : "Save Changes"}</Button>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u: any) => (
          <div key={u.id} className={`rounded-xl bg-card shadow-sm p-5 ${!u.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">{initials(u.name ?? "")}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge[u.role] || "bg-muted"}`}>{u.role}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {u.phone && <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> {u.phone}</div>}
            {u.client && <div className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {u.client.name}</div>}
            {!u.isActive && <div className="text-xs text-red-500 mt-1">Inactive</div>}
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><div className="text-xs text-muted-foreground">Jobs</div><div className="font-semibold">{u._count?.assignedJobs ?? 0}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
