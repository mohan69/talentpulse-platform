"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Pencil, Loader2, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export function ClientsClient({ clients }: { clients: any[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", industry: "", website: "", description: "", address: "",
    contactName: "", contactEmail: "", contactPhone: "",
  });

  function startEdit(c: any) {
    setEditId(c.id);
    setForm({
      name: c.name ?? "",
      industry: c.industry ?? "",
      website: c.website ?? "",
      description: c.description ?? "",
      address: c.address ?? "",
      contactName: c.contactName ?? "",
      contactEmail: c.contactEmail ?? "",
      contactPhone: c.contactPhone ?? "",
    });
  }

  async function handleSave() {
    if (!editId) return;
    if (!form.name.trim()) return toast.error("Client name is required");
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Client updated!");
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
            <h3 className="text-base font-semibold">Edit Client</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Company Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <div><Label>Description</Label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" /></div>
          <h4 className="text-sm font-semibold pt-1">Primary Contact</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Name</Label><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}{saving ? "Saving..." : "Save Changes"}</Button>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c: any) => (
          <div key={c.id} className="rounded-xl bg-card shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Building2 className="h-5 w-5" /></div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="font-display font-semibold">{c.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.industry}</div>
            <div className="text-xs text-muted-foreground mt-3">{c._count.jobs} positions</div>
            {c.contactName && <div className="text-xs text-muted-foreground mt-1">Contact: {c.contactName}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
