"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ExternalLink, Copy, Check, Loader2, X, Clock, CheckCircle2,
  AlertTriangle, XCircle, SkipForward, Plus, Link2, ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

type Platform = { id: string; name: string; websiteUrl: string | null };
type Posting = {
  id: string; jobId: string; platformId: string; status: string;
  postUrl: string | null; postedAt: string | null; expiresAt: string | null;
  notes: string | null; autoPosted: boolean;
  platform: Platform;
  postedBy: { id: string; name: string | null } | null;
};

type Job = {
  id: string; title: string; location: string; jobType: string;
  experienceMin: number; experienceMax: number;
  salaryMin: number | null; salaryMax: number | null;
  skills: string[]; description: string;
  client?: { name: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; cls: string }> = {
  PENDING: { label: "Pending", icon: Clock, cls: "bg-amber-100 text-amber-700" },
  POSTED: { label: "Posted", icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700" },
  EXPIRED: { label: "Expired", icon: AlertTriangle, cls: "bg-slate-100 text-slate-600" },
  FAILED: { label: "Failed", icon: XCircle, cls: "bg-rose-100 text-rose-700" },
  SKIPPED: { label: "Skipped", icon: SkipForward, cls: "bg-slate-100 text-slate-500" },
};

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function JobPostingPanel({ job, initialPostings, allPlatforms }: {
  job: Job; initialPostings: Posting[]; allPlatforms: Platform[];
}) {
  const router = useRouter();
  const [postings, setPostings] = useState<Posting[]>(initialPostings);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Summary
  const pending = postings.filter((p) => p.status === "PENDING").length;
  const posted = postings.filter((p) => p.status === "POSTED").length;
  const total = postings.length;

  // Platforms not yet in postings
  const linkedPlatformIds = new Set(postings.map((p) => p.platformId));
  const unlinkedPlatforms = allPlatforms.filter((p) => !linkedPlatformIds.has(p.id));

  // Build formatted job text for clipboard
  function buildJobText() {
    const ctc = job.salaryMin && job.salaryMax
      ? `CTC: ${(job.salaryMin / 100000).toFixed(1)}L - ${(job.salaryMax / 100000).toFixed(1)}L`
      : "";
    return [
      `🏢 ${job.title}${job.client?.name ? ` at ${job.client.name}` : ""}`,
      `📍 ${job.location} | ${job.jobType}`,
      `📊 Experience: ${job.experienceMin}-${job.experienceMax} years`,
      ctc,
      "",
      job.skills.length ? `🔑 Key Skills: ${job.skills.join(", ")}` : "",
      "",
      "📝 Job Description:",
      job.description,
    ].filter(Boolean).join("\n");
  }

  async function copyJobText() {
    try {
      await navigator.clipboard.writeText(buildJobText());
      setCopied(true);
      toast.success("Job details copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — please try manually");
    }
  }

  async function addPlatformPosting(platformId: string) {
    try {
      const res = await fetch("/api/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, platformId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Platform added");
      router.refresh();
      // Fetch updated
      const r2 = await fetch(`/api/job-postings?jobId=${job.id}`);
      if (r2.ok) setPostings(await r2.json());
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const refreshPostings = useCallback(async () => {
    const r = await fetch(`/api/job-postings?jobId=${job.id}`);
    if (r.ok) setPostings(await r.json());
  }, [job.id]);

  return (
    <div className="rounded-xl bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Platform Postings</h3>
            <div className="text-xs text-muted-foreground">
              {posted}/{total} posted
              {pending > 0 && <span className="text-amber-600 ml-2">• {pending} pending</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copyJobText(); }}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "Copied!" : "Copy Job Text"}
          </Button>
          {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-5 pb-5">
          {/* Platform posting rows */}
          <div className="space-y-2 mt-4">
            {postings.map((posting) => (
              <PostingRow key={posting.id} posting={posting} onUpdate={refreshPostings} />
            ))}
          </div>

          {/* Add more platforms */}
          {unlinkedPlatforms.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground mb-2">Add More Platforms</div>
              <div className="flex flex-wrap gap-2">
                {unlinkedPlatforms.map((p) => (
                  <button key={p.id} onClick={() => addPlatformPosting(p.id)}
                    className="px-3 py-1.5 text-xs rounded-full border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center gap-1">
                    <Plus className="h-3 w-3" /> {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {postings.length === 0 && unlinkedPlatforms.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-6">No platforms configured. Add platforms in the Platforms settings page first.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Individual Posting Row ── */
function PostingRow({ posting, onUpdate }: { posting: Posting; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: posting.status,
    postUrl: posting.postUrl ?? "",
    notes: posting.notes ?? "",
    expiresAt: posting.expiresAt ? posting.expiresAt.split("T")[0] : "",
  });

  const cfg = STATUS_CONFIG[posting.status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;

  async function handleUpdate(overrides?: Partial<typeof form>) {
    setSaving(true);
    try {
      const payload = overrides ? { ...form, ...overrides } : form;
      const res = await fetch(`/api/job-postings/${posting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Updated");
      setEditing(false);
      onUpdate();
    } catch { toast.error("Update failed"); } finally { setSaving(false); }
  }

  async function markAsPosted() {
    await handleUpdate({ status: "POSTED" });
  }

  async function skipPosting() {
    await handleUpdate({ status: "SKIPPED" });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{posting.platform.name}</div>
          <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Live Posting URL</label>
            <input className={inputCls} value={form.postUrl} onChange={(e) => setForm((f) => ({ ...f, postUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Expires On</label>
            <input className={inputCls} type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
            <input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleUpdate()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />} Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 group">
      {/* Platform icon + name */}
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
        {posting.platform.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{posting.platform.name}</span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium flex items-center gap-1 ${cfg.cls}`}>
            <Icon className="h-3 w-3" /> {cfg.label}
          </span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
          {posting.postedAt && <span>Posted {new Date(posting.postedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
          {posting.postedBy?.name && <span>by {posting.postedBy.name}</span>}
          {posting.postUrl && (
            <a href={posting.postUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
              View posting <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {posting.expiresAt && (
            <span className={new Date(posting.expiresAt) < new Date() ? "text-rose-600" : ""}>
              Expires {new Date(posting.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {posting.notes && <span className="truncate max-w-[200px]">{posting.notes}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {posting.platform.websiteUrl && (
          <a href={posting.platform.websiteUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5" title="Open platform">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        {posting.status === "PENDING" && (
          <>
            <button onClick={markAsPosted} disabled={saving}
              className="p-2 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50" title="Mark as Posted">
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button onClick={skipPosting} disabled={saving}
              className="p-2 rounded-lg text-muted-foreground hover:text-slate-600 hover:bg-slate-50" title="Skip">
              <SkipForward className="h-4 w-4" />
            </button>
          </>
        )}
        <button onClick={() => setEditing(true)}
          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5" title="Edit details">
          <Link2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
