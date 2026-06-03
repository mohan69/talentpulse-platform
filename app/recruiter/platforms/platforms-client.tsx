"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ExternalLink, Eye, EyeOff, User, Key, CreditCard, CalendarDays,
  FileText, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import toast from "react-hot-toast";

type Platform = { id: string; name: string; websiteUrl: string | null; description: string | null };
type Sub = {
  id: string; platformId: string; username: string | null; encryptedPass: string | null;
  planName: string | null; profileLimit: number | null; jobPostLimit: number | null;
  profilesUsed: number; jobsPosted: number; monthlyCost: number | null;
  validFrom: string | null; validUntil: string | null; isActive: boolean; notes: string | null;
  platform: Platform;
};

export function RecruiterPlatformsClient({ subscriptions }: { subscriptions: Sub[] }) {
  const router = useRouter();

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
          <CreditCard className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No Platform Subscriptions</h3>
        <p className="text-muted-foreground text-sm">Your admin hasn&apos;t assigned any platform subscriptions yet.<br />Contact your admin to get access to sourcing platforms.</p>
      </div>
    );
  }

  // Summary stats
  const totalProfiles = subscriptions.reduce((s, x) => s + (x.profileLimit || 0), 0);
  const usedProfiles = subscriptions.reduce((s, x) => s + x.profilesUsed, 0);
  const totalJobPosts = subscriptions.reduce((s, x) => s + (x.jobPostLimit || 0), 0);
  const usedJobPosts = subscriptions.reduce((s, x) => s + x.jobsPosted, 0);
  const activeSubs = subscriptions.filter((s) => s.isActive);
  const expiringSoon = subscriptions.filter((s) => {
    if (!s.validUntil) return false;
    const diff = new Date(s.validUntil).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Active Platforms" value={activeSubs.length.toString()} icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} />
        <SummaryCard label="Profile Budget" value={totalProfiles > 0 ? `${usedProfiles} / ${totalProfiles}` : "Unlimited"} icon={<User className="h-5 w-5 text-primary" />} />
        <SummaryCard label="Job Post Budget" value={totalJobPosts > 0 ? `${usedJobPosts} / ${totalJobPosts}` : "Unlimited"} icon={<FileText className="h-5 w-5 text-violet-500" />} />
        {expiringSoon.length > 0
          ? <SummaryCard label="Expiring Soon" value={expiringSoon.length.toString()} icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} highlight />
          : <SummaryCard label="All Active" value="\u2713" icon={<Clock className="h-5 w-5 text-muted-foreground" />} />
        }
      </div>

      {/* Platform cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {subscriptions.map((sub) => (
          <PlatformCard key={sub.id} sub={sub} onUsageUpdate={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-amber-50 border border-amber-200" : "bg-card shadow-sm"}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-semibold text-lg">{value}</div>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ sub, onUsageUpdate }: { sub: Sub & { platform: { id: string; name: string; websiteUrl: string | null } }; onUsageUpdate: () => void }) {
  const [showPass, setShowPass] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isExpired = sub.validUntil && new Date(sub.validUntil) < new Date();
  const profilePct = sub.profileLimit ? Math.min(100, (sub.profilesUsed / sub.profileLimit) * 100) : 0;
  const jobPct = sub.jobPostLimit ? Math.min(100, (sub.jobsPosted / sub.jobPostLimit) * 100) : 0;

  async function incrementUsage(field: "profilesUsed" | "jobsPosted") {
    setUpdating(true);
    try {
      const newVal = field === "profilesUsed" ? sub.profilesUsed + 1 : sub.jobsPosted + 1;
      const res = await fetch(`/api/platform-subscriptions/${sub.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newVal.toString() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${field === "profilesUsed" ? "Profile" : "Job post"} count updated`);
      onUsageUpdate();
    } catch { toast.error("Update failed"); } finally { setUpdating(false); }
  }

  return (
    <div className={`rounded-xl bg-card shadow-sm p-5 ${!sub.isActive || isExpired ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            {sub.platform.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-display font-semibold">{sub.platform.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {sub.planName && <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{sub.planName}</span>}
              {isExpired && <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700">Expired</span>}
              {!sub.isActive && <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600">Disabled</span>}
            </div>
          </div>
        </div>
        {sub.platform.websiteUrl && (
          <a href={sub.platform.websiteUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
            </Button>
          </a>
        )}
      </div>

      {/* Credentials */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        {sub.username && (
          <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-3 py-2">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{sub.username}</span>
          </div>
        )}
        {sub.encryptedPass && (
          <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-3 py-2">
            <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{showPass ? sub.encryptedPass : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}</span>
            <button onClick={() => setShowPass(!showPass)} className="text-muted-foreground hover:text-foreground ml-auto shrink-0">
              {showPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
        )}
      </div>

      {/* Validity */}
      {(sub.validFrom || sub.validUntil) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <CalendarDays className="h-3.5 w-3.5" />
          {sub.validFrom ? new Date(sub.validFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Start"}
          {" \u2192 "}
          {sub.validUntil ? new Date(sub.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Ongoing"}
        </div>
      )}

      {/* Usage tracking */}
      {(sub.profileLimit != null || sub.jobPostLimit != null) && (
        <div className="space-y-3">
          {sub.profileLimit != null && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Profiles Downloaded</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{sub.profilesUsed} / {sub.profileLimit}</span>
                  <button onClick={() => incrementUsage("profilesUsed")} disabled={updating}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">+1</button>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${profilePct >= 90 ? "bg-rose-500" : profilePct >= 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${profilePct}%` }} />
              </div>
            </div>
          )}
          {sub.jobPostLimit != null && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Jobs Posted</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{sub.jobsPosted} / {sub.jobPostLimit}</span>
                  <button onClick={() => incrementUsage("jobsPosted")} disabled={updating}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">+1</button>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${jobPct >= 90 ? "bg-rose-500" : jobPct >= 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${jobPct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {sub.notes && <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> {sub.notes}</div>}
    </div>
  );
}
