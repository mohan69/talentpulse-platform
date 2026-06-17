import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Briefcase, Plus, MapPin, Users, Pencil } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/format";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminJobs() {
  const jobs = await tenantPrisma.job.findMany({ orderBy: { createdAt: "desc" }, include: { client: true, recruiter: true, _count: { select: { applications: true } } } });
  return (
    <>
      <PageTitle title="Requisitions" description="All client positions across active engagements." actions={<Link href="/admin/jobs/new"><Button><Plus className="h-4 w-4 mr-2" /> New Job</Button></Link>} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-xl bg-card shadow-sm p-5 hover:shadow-md transition-shadow relative group">
            <Link href={`/admin/jobs/${job.id}`} className="block">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Briefcase className="h-4 w-4" /></div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${job.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{job.status}</span>
              </div>
              <div className="font-semibold mb-1">{job.title}</div>
              <div className="text-xs text-muted-foreground mb-3">{job.client?.name}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job._count.applications}</span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{formatCurrency(job.salaryMin ?? 0)} – {formatCurrency(job.salaryMax ?? 0)}</div>
            </Link>
            <Link href={`/admin/jobs/${job.id}?edit=1`} className="absolute top-3 right-14 h-7 w-7 rounded-md bg-muted/80 text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary" title="Edit Job">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
      {jobs.length === 0 && <div className="rounded-xl bg-card shadow-sm p-10 text-center text-muted-foreground">No jobs yet.</div>}
    </>
  );
}
