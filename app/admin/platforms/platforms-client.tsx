"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus, Pencil, Trash2, Loader2, ExternalLink, ChevronDown, ChevronUp,
  Globe, User, Key, CreditCard, CalendarDays, Hash, FileText, X, Check, Eye, EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

type Recruiter = { id: string; name: string | null; email: string };
type Sub = {
  id: string; platformId: string; recruiterId: string; username: string | null; encryptedPass: string | null;
  planName: string | null; profileLimit: number | null; jobPostLimit: number | null;
  profilesUsed: number; jobsPosted: number; monthlyCost: number | null;
  validFrom: string | null; validUntil: string | null; isActive: boolean; notes: string | null;
  recruiter: Recruiter;
};
type Platform = {
  id: string; name: string; websiteUrl: string | null; description: string | null; isActive: boolean;
  subscriptions: Sub[];
};

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

const PRESET_PLATFORMS = [
  { name: "Naukri", url: "https://www.naukri.com" },
  { name: "LinkedIn Recruiter", url: "https://www.linkedin.com/talent" },
  { name: "foundit (Monster)", url: "https://www.foundit.in" },
  { name: "Indeed", url: "https://www.indeed.co.in" },
  { name: "Shine", url: "https://www.shine.com" },
  { name: "Instahyre", url: "https://www.instahyre.com" },
  { name: "Hirist", url: "https://www.hirist.tech" },
  { name: "IIMJobs", url: "https://www.iimjobs.com" },
  { name: "TimesJobs", url: "https://www.timesjobs.com" },
];

export function PlatformsClient({ initialPlatforms, recruiters }: { initialPlatforms: Platform[]; recruiters: Recruiter[] }) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [newPlatform, setNewPlatform] = useState({ name: "", websiteUrl: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(platforms[0]?.id ?? null);

  // ── Add Platform ──
  async function addPlatform() {
    if (!newPlatform.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/platforms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlatform),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast.success(`${newPlatform.name} added`);
      setNewPlatform({ name: "", websiteUrl: "", description: "" });
      setShowAddPlatform(false);
      router.refresh();
      // optimistic: re-fetch
      const r2 = await fetch("/api/platforms"); const all = await r2.json();
      // can't get subs from list API, just refresh
      window.location.reload();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function deletePlatform(id: string, name: string) {
    if (!confirm(`Delete ${name} and all its subscriptions?`)) return;
    try {
      const res = await fetch(`/api/platforms/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setPlatforms((p) => p.filter((x) => x.id !== id));
      toast.success(`${name} removed`);
    } catch { toast.error("Failed to delete"); }
  }

  function selectPreset(p: { name: string; url: string }) {
    setNewPlatform({ name: p.name, websiteUrl: p.url, description: "" });
  }

  const existingNames = new Set(platforms.map((p) => p.name.toLowerCase()));
  const availablePresets = PRESET_PLATFORMS.filter((p) => !existingNames.has(p.name.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Add platform button */}
      {!showAddPlatform ? (
        <Button onClick={() => setShowAddPlatform(true)}><Plus className="h-4 w-4 mr-2" /> Add Platform</Button>
      ) : (
        <div className="rounded-xl bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Add Recruiting Platform</h3>
            <button onClick={() => setShowAddPlatform(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          {availablePresets.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Quick Add</div>
              <div className="flex flex-wrap gap-2">
                {availablePresets.map((p) => (
                  <button key={p.name} onClick={() => selectPreset(p)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      newPlatform.name === p.name ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-border"
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Platform Name *</label><input className={inputCls} value={newPlatform.name} onChange={(e) => setNewPlatform((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Naukri" /></div>
            <div><label className={labelCls}>Website URL</label><input className={inputCls} value={newPlatform.websiteUrl} onChange={(e) => setNewPlatform((f) => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://..." /></div>
          </div>
          <div><label className={labelCls}>Description</label><input className={inputCls} value={newPlatform.description} onChange={(e) => setNewPlatform((f) => ({ ...f, description: e.target.value }))} placeholder="Optional notes" /></div>
          <Button onClick={addPlatform} disabled={saving || !newPlatform.name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Platform
          </Button>
        </div>
      )}

      {/* Platform cards */}
      {platforms.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No platforms configured yet. Add your first recruiting platform above.</div>
      )}
      {platforms.map((platform) => (
        <PlatformCard
          key={platform.id}
          platform={platform}
          recruiters={recruiters}
          expanded={expandedPlatform === platform.id}
          onToggle={() => setExpandedPlatform(expandedPlatform === platform.id ? null : platform.id)}
          onDelete={() => deletePlatform(platform.id, platform.name)}
          onRefresh={() => window.location.reload()}
        />
      ))}
    </div>
  );
}

/* ── Platform Card ── */
function PlatformCard({ platform, recruiters, expanded, onToggle, onDelete, onRefresh }: {
  platform: Platform; recruiters: Recruiter[]; expanded: boolean; onToggle: () => void; onDelete: () => void; onRefresh: () => void;
}) {
  const [showAssign, setShowAssign] = useState(false);

  const activeSubs = platform.subscriptions.filter((s) => s.isActive);
  const totalCost = activeSubs.reduce((sum, s) => sum + (s.monthlyCost || 0), 0);

  return (
    <div className="rounded-xl bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-center gap-4 cursor-pointer" onClick={onToggle}>
        <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
          {platform.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-lg">{platform.name}</h3>
            {platform.websiteUrl && (
              <a href={platform.websiteUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>
            )}
            {!platform.isActive && <span className="px-2 py-0.5 text-xs rounded bg-rose-100 text-rose-700">Inactive</span>}
          </div>
          {platform.description && <p className="text-sm text-muted-foreground truncate">{platform.description}</p>}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="text-center"><div className="font-semibold text-foreground">{activeSubs.length}</div><div className="text-xs">Recruiters</div></div>
          {totalCost > 0 && <div className="text-center"><div className="font-semibold text-foreground">₹{totalCost.toLocaleString("en-IN")}</div><div className="text-xs">/month</div></div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded subscriptions */}
      {expanded && (
        <div className="border-t border-border px-5 pb-5">
          <div className="flex items-center justify-between mt-4 mb-3">
            <h4 className="text-sm font-semibold">Recruiter Subscriptions</h4>
            <Button size="sm" variant="outline" onClick={() => setShowAssign(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Assign Recruiter</Button>
          </div>

          {showAssign && (
            <AssignSubscriptionForm
              platformId={platform.id}
              recruiters={recruiters}
              existingRecruiterIds={platform.subscriptions.map((s) => s.recruiterId)}
              onClose={() => setShowAssign(false)}
              onSaved={onRefresh}
            />
          )}

          {platform.subscriptions.length === 0 && !showAssign && (
            <div className="text-sm text-muted-foreground py-4 text-center">No recruiters assigned yet.</div>
          )}

          <div className="space-y-3">
            {platform.subscriptions.map((sub) => (
              <SubscriptionRow key={sub.id} sub={sub} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Assign Subscription Form ── */
function AssignSubscriptionForm({ platformId, recruiters, existingRecruiterIds, onClose, onSaved }: {
  platformId: string; recruiters: Recruiter[]; existingRecruiterIds: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    recruiterId: "", username: "", password: "", planName: "",
    profileLimit: "", jobPostLimit: "", monthlyCost: "",
    validFrom: "", validUntil: "", notes: "",
  });

  const available = recruiters.filter((r) => !existingRecruiterIds.includes(r.id));

  async function handleSubmit() {
    if (!form.recruiterId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/platform-subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId, ...form }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast.success("Subscription assigned");
      onClose();
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="rounded-lg border border-border p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold">New Subscription</h5>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Recruiter *</label>
          <select className={inputCls} value={form.recruiterId} onChange={(e) => setForm((f) => ({ ...f, recruiterId: e.target.value }))}>
            <option value="">Select recruiter</option>
            {available.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Plan Name</label><input className={inputCls} value={form.planName} onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))} placeholder="e.g. Premium, Enterprise" /></div>
        <div><label className={labelCls}>Username / Login ID</label><input className={inputCls} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="Login email or ID" /></div>
        <div><label className={labelCls}>Password</label><input className={inputCls} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" /></div>
        <div><label className={labelCls}>Profile Download Limit / month</label><input className={inputCls} type="number" value={form.profileLimit} onChange={(e) => setForm((f) => ({ ...f, profileLimit: e.target.value }))} placeholder="e.g. 500" /></div>
        <div><label className={labelCls}>Job Post Limit / month</label><input className={inputCls} type="number" value={form.jobPostLimit} onChange={(e) => setForm((f) => ({ ...f, jobPostLimit: e.target.value }))} placeholder="e.g. 10" /></div>
        <div><label className={labelCls}>Monthly Cost (₹)</label><input className={inputCls} type="number" value={form.monthlyCost} onChange={(e) => setForm((f) => ({ ...f, monthlyCost: e.target.value }))} placeholder="0" /></div>
        <div><label className={labelCls}>Valid From</label><input className={inputCls} type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} /></div>
        <div><label className={labelCls}>Valid Until</label><input className={inputCls} type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} /></div>
        <div><label className={labelCls}>Notes</label><input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any notes" /></div>
      </div>
      <Button onClick={handleSubmit} disabled={saving || !form.recruiterId} size="sm">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Assign
      </Button>
    </div>
  );
}

/* ── Subscription Row ── */
function SubscriptionRow({ sub, onRefresh }: { sub: Sub; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    username: sub.username ?? "",
    password: sub.encryptedPass ?? "",
    planName: sub.planName ?? "",
    profileLimit: sub.profileLimit?.toString() ?? "",
    jobPostLimit: sub.jobPostLimit?.toString() ?? "",
    profilesUsed: sub.profilesUsed.toString(),
    jobsPosted: sub.jobsPosted.toString(),
    monthlyCost: sub.monthlyCost?.toString() ?? "",
    validFrom: sub.validFrom ? sub.validFrom.split("T")[0] : "",
    validUntil: sub.validUntil ? sub.validUntil.split("T")[0] : "",
    isActive: sub.isActive,
    notes: sub.notes ?? "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/platform-subscriptions/${sub.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Updated");
      setEditing(false);
      onRefresh();
    } catch { toast.error("Update failed"); } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${sub.recruiter.name}'s subscription?`)) return;
    try {
      const res = await fetch(`/api/platform-subscriptions/${sub.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Removed");
      onRefresh();
    } catch { toast.error("Failed"); }
  }

  const isExpired = sub.validUntil && new Date(sub.validUntil) < new Date();
  const profilePct = sub.profileLimit ? Math.min(100, (sub.profilesUsed / sub.profileLimit) * 100) : 0;
  const jobPct = sub.jobPostLimit ? Math.min(100, (sub.jobsPosted / sub.jobPostLimit) * 100) : 0;

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{sub.recruiter.name} <span className="text-xs text-muted-foreground">({sub.recruiter.email})</span></div>
          <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><label className={labelCls}>Plan</label><input className={inputCls} value={form.planName} onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))} /></div>
          <div><label className={labelCls}>Username</label><input className={inputCls} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} /></div>
          <div><label className={labelCls}>Password</label><input className={inputCls} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
          <div><label className={labelCls}>Profile Limit</label><input className={inputCls} type="number" value={form.profileLimit} onChange={(e) => setForm((f) => ({ ...f, profileLimit: e.target.value }))} /></div>
          <div><label className={labelCls}>Profiles Used</label><input className={inputCls} type="number" value={form.profilesUsed} onChange={(e) => setForm((f) => ({ ...f, profilesUsed: e.target.value }))} /></div>
          <div><label className={labelCls}>Job Post Limit</label><input className={inputCls} type="number" value={form.jobPostLimit} onChange={(e) => setForm((f) => ({ ...f, jobPostLimit: e.target.value }))} /></div>
          <div><label className={labelCls}>Jobs Posted</label><input className={inputCls} type="number" value={form.jobsPosted} onChange={(e) => setForm((f) => ({ ...f, jobsPosted: e.target.value }))} /></div>
          <div><label className={labelCls}>Monthly Cost (₹)</label><input className={inputCls} type="number" value={form.monthlyCost} onChange={(e) => setForm((f) => ({ ...f, monthlyCost: e.target.value }))} /></div>
          <div><label className={labelCls}>Valid From</label><input className={inputCls} type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} /></div>
          <div><label className={labelCls}>Valid Until</label><input className={inputCls} type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} /></div>
          <div><label className={labelCls}>Notes</label><input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" /> Active
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />} Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 ${sub.isActive ? "bg-muted/40" : "bg-muted/20 opacity-60"} ${isExpired ? "border border-rose-200" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
            {(sub.recruiter.name ?? "R").charAt(0)}
          </div>
          <div>
            <div className="font-medium text-sm">{sub.recruiter.name}</div>
            <div className="text-xs text-muted-foreground">{sub.recruiter.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isExpired && <span className="px-2 py-0.5 text-xs rounded bg-rose-100 text-rose-700 mr-2">Expired</span>}
          {!sub.isActive && <span className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-600 mr-2">Disabled</span>}
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-x-6 gap-y-2 mt-3 text-xs">
        {sub.planName && (
          <div className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> <span className="font-medium">{sub.planName}</span></div>
        )}
        {sub.username && (
          <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" /> <span>{sub.username}</span></div>
        )}
        {sub.encryptedPass && (
          <div className="flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{showPass ? sub.encryptedPass : "••••••••"}</span>
            <button onClick={() => setShowPass(!showPass)} className="text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
        )}
        {sub.monthlyCost != null && sub.monthlyCost > 0 && (
          <div className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> ₹{sub.monthlyCost.toLocaleString("en-IN")}/mo</div>
        )}
        {sub.validFrom && (
          <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> {new Date(sub.validFrom).toLocaleDateString("en-IN")} - {sub.validUntil ? new Date(sub.validUntil).toLocaleDateString("en-IN") : "Ongoing"}</div>
        )}
      </div>

      {/* Usage bars */}
      {(sub.profileLimit || sub.jobPostLimit) && (
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {sub.profileLimit != null && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Profiles</span>
                <span className="font-medium">{sub.profilesUsed} / {sub.profileLimit}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${profilePct >= 90 ? "bg-rose-500" : profilePct >= 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${profilePct}%` }} />
              </div>
            </div>
          )}
          {sub.jobPostLimit != null && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Job Posts</span>
                <span className="font-medium">{sub.jobsPosted} / {sub.jobPostLimit}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${jobPct >= 90 ? "bg-rose-500" : jobPct >= 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${jobPct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {sub.notes && <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> {sub.notes}</div>}
    </div>
  );
}
