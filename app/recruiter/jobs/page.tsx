import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import Link from "next/link";
import { Briefcase, MapPin, Users } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RecruiterJobs() {
  const session = await getServerSession(authOptions);
  const jobs = await prisma.job.findMany({ where: { recruiterId: session?.user?.id }, orderBy: { createdAt: "desc" }, include: { client: true, _count: { select: { applications: true } } } });
  return (<><PageTitle title="My Jobs" description="Positions assigned to you." />
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{jobs.map((j) => (
      <Link key={j.id} href={`/recruiter/jobs/${j.id}`} className="rounded-xl bg-card shadow-sm p-5 hover:shadow-md block">
        <div className="flex items-start justify-between mb-3"><div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Briefcase className="h-4 w-4" /></div><span className={`text-xs px-2 py-0.5 rounded-full ${j.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{j.status}</span></div>
        <div className="font-semibold">{j.title}</div>
        <div className="text-xs text-muted-foreground mb-3">{j.client?.name}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span><span className="flex items-center gap-1"><Users className="h-3 w-3" /> {j._count.applications}</span></div>
        <div className="mt-3 text-xs text-muted-foreground">{formatCurrency(j.salaryMin ?? 0)}-{formatCurrency(j.salaryMax ?? 0)}</div>
      </Link>))}
    </div>{jobs.length === 0 && <div className="rounded-xl bg-card p-10 text-center text-muted-foreground">No jobs assigned to you yet.</div>}
  </>);
}
