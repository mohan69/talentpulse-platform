"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StageBadge } from "@/components/workspace/stage-badge";
import { Mail, Phone, MapPin, ChevronDown, ChevronUp, ExternalLink, Pencil, Check, X } from "lucide-react";
import { isPlaceholderEmail } from "@/lib/candidate-utils";
import toast from "react-hot-toast";

function InlineContactEdit({ candidateId, field, currentValue, icon: Icon, label }: { candidateId: string; field: "email" | "phone"; currentValue: string | null; icon: any; label: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue ?? "");
  const [saving, setSaving] = useState(false);
  const [savedValue, setSavedValue] = useState(currentValue);
  const router = useRouter();

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value.trim() }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      setSavedValue(value.trim());
      setEditing(false);
      toast.success(`${label} updated`);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <input autoFocus className="border rounded px-1.5 py-0.5 text-xs w-40" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }} placeholder={`Enter ${label.toLowerCase()}`} />
        <button onClick={handleSave} disabled={saving} className="text-emerald-600 hover:text-emerald-700"><Check className="h-3.5 w-3.5" /></button>
        <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </span>
    );
  }

  const displayValue = savedValue;
  const isAvailable = field === "email" ? (displayValue && !isPlaceholderEmail(displayValue)) : !!displayValue;

  if (isAvailable) {
    const href = field === "email" ? `mailto:${displayValue}` : `tel:${displayValue}`;
    return (
      <span className="flex items-center gap-1.5">
        <a href={href} className="flex items-center gap-1.5 text-primary hover:underline"><Icon className="h-3.5 w-3.5" />{displayValue}</a>
        <button onClick={() => { setValue(displayValue!); setEditing(true); }} className="text-muted-foreground/50 hover:text-primary" title={`Edit ${label}`}><Pencil className="h-3 w-3" /></button>
      </span>
    );
  }

  return (
    <button onClick={() => { setValue(""); setEditing(true); }} className="flex items-center gap-1.5 text-muted-foreground/60 italic text-xs hover:text-primary transition-colors" title={`Add ${label}`}>
      <Icon className="h-3.5 w-3.5" />{label} not available <Pencil className="h-3 w-3 ml-0.5" />
    </button>
  );
}

export function RecruiterApplicationsList({ applications }: { applications: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-xl bg-card shadow-sm p-5">
      <h3 className="font-display font-semibold mb-4">Applications ({applications.length})</h3>
      <div className="space-y-3">
        {applications.map((a: any) => {
          const c = a.candidate;
          const isExpanded = expandedId === a.id;
          return (
            <div key={a.id} className="rounded-lg border border-border overflow-hidden">
              <div
                className="flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {c.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.currentDesignation && c.currentCompany
                        ? `${c.currentDesignation} at ${c.currentCompany}`
                        : c.currentDesignation || c.currentCompany || "—"}
                      {c.totalExperience ? ` · ${c.totalExperience} yrs` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.matchScore != null && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.matchScore >= 70 ? "bg-emerald-100 text-emerald-700" : a.matchScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {a.matchScore}%
                    </span>
                  )}
                  <StageBadge stage={a.stage} />
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-3">
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                    <InlineContactEdit candidateId={c.id} field="email" currentValue={c.email} icon={Mail} label="Email" />
                    <InlineContactEdit candidateId={c.id} field="phone" currentValue={c.phone} icon={Phone} label="Phone" />
                    {c.currentCity && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />{c.currentCity}
                      </span>
                    )}
                    {c.linkedinUrl && (
                      <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />LinkedIn Profile
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {c.currentCompany && (
                      <div>
                        <span className="text-muted-foreground block">Company</span>
                        <span className="font-medium">{c.currentCompany}</span>
                      </div>
                    )}
                    {c.currentDesignation && (
                      <div>
                        <span className="text-muted-foreground block">Designation</span>
                        <span className="font-medium">{c.currentDesignation}</span>
                      </div>
                    )}
                    {c.totalExperience > 0 && (
                      <div>
                        <span className="text-muted-foreground block">Experience</span>
                        <span className="font-medium">{c.totalExperience} years</span>
                      </div>
                    )}
                    {c.noticePeriod != null && (
                      <div>
                        <span className="text-muted-foreground block">Notice Period</span>
                        <span className="font-medium">{c.noticePeriod} days</span>
                      </div>
                    )}
                    {(c.currentCtc != null || c.expectedCtc != null) && (
                      <div>
                        <span className="text-muted-foreground block">CTC</span>
                        <span className="font-medium">
                          {c.currentCtc != null ? `₹${(c.currentCtc / 100000).toFixed(1)}L` : "—"}
                          {c.expectedCtc != null ? ` → ₹${(c.expectedCtc / 100000).toFixed(1)}L` : ""}
                        </span>
                      </div>
                    )}
                    {c.source && (
                      <div>
                        <span className="text-muted-foreground block">Source</span>
                        <span className="font-medium">{c.source}</span>
                      </div>
                    )}
                  </div>

                  {c.skills?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {c.skills.map((s: string) => (
                          <span key={s} className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.aiSummary && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Profile Summary</span>
                      <p className="text-sm text-foreground/80 leading-relaxed">{c.aiSummary}</p>
                    </div>
                  )}

                  <div className="pt-1">
                    <Link
                      href={`/recruiter/candidates/${a.candidateId}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View Full Profile →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {applications.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">No applications yet.</div>
        )}
      </div>
    </div>
  );
}
