import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { StageBadge } from "@/components/workspace/stage-badge";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { notFound } from "next/navigation";
import { Mail, Phone, MapPin, ExternalLink, AlertCircle } from "lucide-react";
import { AddNoteForm, AddProjectForm, EmailComposeDialog } from "@/components/workspace/candidate-detail-actions";
import { isPlaceholderEmail } from "@/lib/candidate-utils";

export const dynamic = "force-dynamic";

export default async function AdminCandidateDetail({ params }: { params: { id: string } }) {
  const c = await prisma.candidate.findUnique({ where: { id: params.id }, include: { applications: { include: { job: { include: { client: true } } } }, projects: true, notes: { include: { author: true }, orderBy: { createdAt: "desc" } } } });
  if (!c) notFound();
  return (
    <>
      <PageTitle title={c.name} description={c.currentDesignation ?? "Candidate profile"} />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl bg-card shadow-sm p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">{initials(c.name)}</div>
              <div className="flex-1">
                <div className="font-display text-xl font-bold">{c.name}</div>
                <div className="text-sm text-muted-foreground">{c.currentDesignation}</div>
              </div>
              <EmailComposeDialog candidateId={c.id} candidateEmail={c.email} candidateName={c.name} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {isPlaceholderEmail(c.email) ? <span className="text-muted-foreground italic">Email not available</span> : c.email}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {c.phone ? c.phone : <span className="text-muted-foreground italic">Phone not available</span>}</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {c.currentCity ?? "-"}</div>
              {c.linkedinUrl && <div className="flex items-center gap-2"><ExternalLink className="h-4 w-4 text-muted-foreground" /> <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn Profile</a></div>}
              <div>Exp: {c.totalExperience ?? 0} yrs</div>
              <div>Current CTC: {c.currentCtc ? formatCurrency(c.currentCtc) : "-"}</div>
              <div>Expected CTC: {c.expectedCtc ? formatCurrency(c.expectedCtc) : "-"}</div>
              <div>Notice: {c.noticePeriod ?? 0} days</div>
            </div>
            <div className="mt-4">
              <div className="text-xs font-semibold mb-2">Skills</div>
              <div className="flex flex-wrap gap-1.5">{(c.skills ?? []).map((s: any) => <span key={s} className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">{s}</span>)}</div>
            </div>
            {c.aiSummary && <div className="mt-4"><div className="text-xs font-semibold mb-2">Summary</div><p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.aiSummary}</p></div>}
          </div>
          <div className="rounded-xl bg-card shadow-sm p-5">
            <h3 className="font-display font-semibold mb-3">Projects</h3>
            <div className="space-y-3">
              {c.projects.map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg bg-muted/40">
                  <div className="font-medium">{p.projectName}</div>
                  <div className="text-xs text-muted-foreground mb-1">{p.role}</div>
                  <p className="text-sm">{p.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">{(p.skillsUsed ?? []).map((t: any) => <span key={t} className="px-1.5 py-0.5 text-xs rounded bg-slate-100">{t}</span>)}</div>
                </div>
              ))}
              {c.projects.length === 0 && <div className="text-sm text-muted-foreground">No projects yet.</div>}
            </div>
            <div className="mt-3">
              <AddProjectForm candidateId={c.id} />
            </div>
          </div>
          <div className="rounded-xl bg-card shadow-sm p-5">
            <h3 className="font-display font-semibold mb-3">Applications</h3>
            <div className="space-y-2">
              {c.applications.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div><div className="font-medium">{a.job.title}</div><div className="text-xs text-muted-foreground">{a.job.client?.name} · Match {a.matchScore ?? "-"}</div></div>
                  <StageBadge stage={a.stage} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card shadow-sm p-5">
          <h3 className="font-display font-semibold mb-3">Notes</h3>
          <div className="space-y-3 mb-3">
            {c.notes.map((n: any) => (
              <div key={n.id} className="p-3 rounded-lg bg-muted/40"><div className="text-sm">{n.body}</div><div className="text-xs text-muted-foreground mt-1">{n.author?.name} · {formatDate(n.createdAt)}</div></div>
            ))}
            {c.notes.length === 0 && <div className="text-sm text-muted-foreground">No notes yet.</div>}
          </div>
          <AddNoteForm candidateId={c.id} />
        </div>
      </div>
    </>
  );
}
