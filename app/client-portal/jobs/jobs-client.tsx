"use client";

import { useState } from "react";
import { Briefcase, MapPin, Users, ChevronDown, ChevronUp, Mail, User } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export function ClientJobsClient({ jobs }: { jobs: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {jobs.map((j: any) => (
        <div key={j.id} className="rounded-xl bg-card shadow-sm p-5 cursor-pointer transition-all hover:shadow-md" onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}>
          <div className="flex items-start justify-between mb-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${j.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{j.status}</span>
              {expandedId === j.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="font-semibold">{j.title}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {j._count.applications} candidates</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">{formatCurrency(j.salaryMin ?? 0)} – {formatCurrency(j.salaryMax ?? 0)}</div>

          {expandedId === j.id && (
            <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={(e) => e.stopPropagation()}>
              {j.description && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Description</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{j.description}</div>
                </div>
              )}
              {j.skills && j.skills.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Required Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {j.skills.map((s: string) => <span key={s} className="px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary">{s}</span>)}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {j.experienceMin != null && <div><span className="text-xs text-muted-foreground">Experience:</span> {j.experienceMin}–{j.experienceMax ?? "?"}y</div>}
                {j.employmentType && <div><span className="text-xs text-muted-foreground">Type:</span> {j.employmentType}</div>}
                {j.noticePeriodMax && <div><span className="text-xs text-muted-foreground">Max Notice:</span> {j.noticePeriodMax} days</div>}
                {j.openPositions && <div><span className="text-xs text-muted-foreground">Openings:</span> {j.openPositions}</div>}
              </div>
              {j.recruiter && (
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="font-medium">{j.recruiter.name}</span>
                    <span className="text-muted-foreground"> · {j.recruiter.email}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {jobs.length === 0 && <div className="col-span-2 p-10 rounded-xl bg-card text-center text-muted-foreground">No jobs yet.</div>}
    </div>
  );
}
