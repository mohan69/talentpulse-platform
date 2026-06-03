import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { StageBadge } from "@/components/workspace/stage-badge";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { notFound } from "next/navigation";
import { JobPostingPanel } from "@/components/workspace/job-posting-panel";
import { RecruiterApplicationsList } from "./applications-list";

export const dynamic = "force-dynamic";

export default async function RecruiterJobDetail({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      applications: { include: { candidate: true }, orderBy: { matchScore: "desc" } },
      jobPostings: {
        include: { platform: true, postedBy: { select: { id: true, name: true } } },
        orderBy: { platform: { name: "asc" } },
      },
    },
  });
  if (!job) notFound();
  const allPlatforms = await prisma.recruitingPlatform.findMany({ where: { isActive: true }, select: { id: true, name: true, websiteUrl: true }, orderBy: { name: "asc" } });

  const serialized = JSON.parse(JSON.stringify(job));

  return (
    <>
      <PageTitle title={job.title} description={`${job.client?.name} \u00b7 ${job.location}`} />

      <div className="space-y-6">
        {/* Platform posting panel */}
        <JobPostingPanel
          job={{
            id: job.id, title: job.title, location: job.location, jobType: job.jobType,
            experienceMin: job.experienceMin, experienceMax: job.experienceMax,
            salaryMin: job.salaryMin, salaryMax: job.salaryMax,
            skills: job.skills, description: job.description,
            client: job.client ? { name: job.client.name } : null,
          }}
          initialPostings={serialized.jobPostings}
          allPlatforms={allPlatforms}
        />

        {/* Job details */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-xl bg-card shadow-sm p-5">
            <h3 className="font-semibold mb-3">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            {job.skills && job.skills.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold mb-2">Must-Have Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((s) => <span key={s} className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">{s}</span>)}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-card shadow-sm p-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">CTC</span><span>{formatCurrency(job.salaryMin ?? 0)}-{formatCurrency(job.salaryMax ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Exp</span><span>{job.experienceMin}-{job.experienceMax} yrs</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{job.jobType}</span></div>
          </div>
        </div>

        {/* Applications */}
        <RecruiterApplicationsList applications={serialized.applications} />
      </div>
    </>
  );
}
