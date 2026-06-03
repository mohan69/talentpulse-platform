"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, X, Pencil, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

function fmtCurrency(n: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }

export function ClosuresClient({ offers, applications }: { offers: any[]; applications: any[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ applicationId: "", offeredCtc: "", joiningDate: "", notes: "" });
  const [editForm, setEditForm] = useState({
    status: "", offeredCtc: "", fixedCtc: "", variableCtc: "",
    joiningDate: "", actualJoinedAt: "", notes: "",
    feePercent: "", feeAmount: "", paymentStatus: "",
  });

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.applicationId || !form.offeredCtc) return toast.error("Select application and enter CTC");
    setSaving(true);
    try {
      const res = await fetch("/api/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, offeredCtc: Number(form.offeredCtc), joiningDate: form.joiningDate || null }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Offer created!");
      setShowAdd(false);
      setForm({ applicationId: "", offeredCtc: "", joiningDate: "", notes: "" });
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  function startEdit(o: any) {
    setEditId(o.id);
    setEditForm({
      status: o.status || "PENDING",
      offeredCtc: o.offeredCtc?.toString() || "",
      fixedCtc: o.fixedCtc?.toString() || "",
      variableCtc: o.variableCtc?.toString() || "",
      joiningDate: o.joiningDate ? new Date(o.joiningDate).toISOString().split("T")[0] : "",
      actualJoinedAt: o.actualJoinedAt ? new Date(o.actualJoinedAt).toISOString().split("T")[0] : "",
      notes: o.notes || "",
      feePercent: o.feePercent?.toString() || "",
      feeAmount: o.feeAmount?.toString() || "",
      paymentStatus: o.paymentStatus || "",
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    if (!editForm.offeredCtc) return toast.error("Offered CTC is required");
    setSaving(true);
    try {
      const payload: any = {
        status: editForm.status,
        offeredCtc: editForm.offeredCtc,
        fixedCtc: editForm.fixedCtc || null,
        variableCtc: editForm.variableCtc || null,
        joiningDate: editForm.joiningDate || null,
        actualJoinedAt: editForm.actualJoinedAt || null,
        notes: editForm.notes || null,
        feePercent: editForm.feePercent || null,
        feeAmount: editForm.feeAmount || null,
        paymentStatus: editForm.paymentStatus || null,
      };
      const res = await fetch(`/api/offers/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Offer updated!");
      setEditId(null);
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  const statusColor: Record<string, string> = {
    PENDING: "bg-slate-100 text-slate-700",
    EXTENDED: "bg-amber-100 text-amber-700",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    DECLINED: "bg-red-100 text-red-700",
    REVOKED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Create Offer</>}</Button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-base font-semibold">Create Offer</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Application *</Label><select value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })} className={inputCls}>
              <option value="">Select candidate / job...</option>
              {applications.map((a: any) => <option key={a.id} value={a.id}>{a.candidate.name} - {a.job.title}</option>)}
            </select></div>
            <div><Label>Offered CTC (INR) *</Label><Input type="number" value={form.offeredCtc} onChange={(e) => setForm({ ...form, offeredCtc: e.target.value })} placeholder="e.g. 2500000" /></div>
            <div><Label>Expected Joining Date</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any remarks..." /></div>
          </div>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{saving ? "Creating..." : "Create Offer"}</Button>
        </form>
      )}

      {/* Edit inline */}
      {editId && (
        <form onSubmit={handleEdit} className="rounded-xl border-2 border-primary/30 bg-card p-6 space-y-5">
          <h3 className="text-base font-semibold">Edit Offer</h3>

          <div className="space-y-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">Offer Details</div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Status *</Label><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={inputCls}>
              {["PENDING", "EXTENDED", "ACCEPTED", "DECLINED", "REVOKED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>
            <div><Label>Offered CTC (INR) *</Label><Input type="number" value={editForm.offeredCtc} onChange={(e) => setEditForm({ ...editForm, offeredCtc: e.target.value })} placeholder="e.g. 2500000" /></div>
            <div><Label>Fixed CTC (INR)</Label><Input type="number" value={editForm.fixedCtc} onChange={(e) => setEditForm({ ...editForm, fixedCtc: e.target.value })} placeholder="Fixed component" /></div>
            <div><Label>Variable CTC (INR)</Label><Input type="number" value={editForm.variableCtc} onChange={(e) => setEditForm({ ...editForm, variableCtc: e.target.value })} placeholder="Variable component" /></div>
            <div><Label>Expected Joining Date</Label><Input type="date" value={editForm.joiningDate} onChange={(e) => setEditForm({ ...editForm, joiningDate: e.target.value })} /></div>
            <div><Label>Actual Joined Date</Label><Input type="date" value={editForm.actualJoinedAt} onChange={(e) => setEditForm({ ...editForm, actualJoinedAt: e.target.value })} /></div>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">Fee & Payment</div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Fee % </Label><Input type="number" step="0.01" value={editForm.feePercent} onChange={(e) => setEditForm({ ...editForm, feePercent: e.target.value })} placeholder="e.g. 8.33" /></div>
            <div><Label>Fee Amount (INR)</Label><Input type="number" value={editForm.feeAmount} onChange={(e) => setEditForm({ ...editForm, feeAmount: e.target.value })} placeholder="e.g. 200000" /></div>
            <div><Label>Payment Status</Label><select value={editForm.paymentStatus} onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })} className={inputCls}>
              <option value="">-- None --</option>
              {["Pending", "Invoiced", "Paid"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>
          </div>

          <div><Label>Notes</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Any remarks..." /></div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
            <Button type="button" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="rounded-xl bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3 text-left">Candidate</th><th className="px-4 py-3 text-left">Position</th><th className="px-4 py-3 text-left">Client</th><th className="px-4 py-3 text-left">CTC</th><th className="px-4 py-3 text-left">Joining</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr>
          </thead>
          <tbody>
            {offers.map((o: any) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-3 font-medium">{o.candidate?.name ?? "-"}</td>
                <td className="px-4 py-3">{o.application?.job?.title ?? "-"}</td>
                <td className="px-4 py-3">{o.application?.job?.client?.name ?? "-"}</td>
                <td className="px-4 py-3">{fmtCurrency(o.offeredCtc)}</td>
                <td className="px-4 py-3">{o.joiningDate ? fmtDate(o.joiningDate) : "-"}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${statusColor[o.status] || "bg-muted"}`}>{o.status}</span></td>
                <td className="px-4 py-3"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {offers.length === 0 && <div className="p-10 text-center text-muted-foreground"><Sparkles className="h-6 w-6 mx-auto mb-2" />No offers yet.</div>}
      </div>
    </div>
  );
}
