import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { notFound } from "next/navigation";
import { JobDetailClient } from "./job-detail-client";
import { JobPostingPanel } from "@/components/workspace/job-posting-panel";

export const dynamic = "force-dynamic";

export default async function AdminJobDetail({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      recruiter: true,
      applications: { include: { candidate: true }, orderBy: { updatedAt: "desc" } },
      jobPostings: {
        include: { platform: true, postedBy: { select: { id: true, name: true } } },
        orderBy: { platform: { name: "asc" } },
      },
    },
  });
  if (!job) notFound();
  const [recruiters, allPlatforms, clients] = await Promise.all([
    prisma.user.findMany({ where: { role: "RECRUITER" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.recruitingPlatform.findMany({ where: { isActive: true }, select: { id: true, name: true, websiteUrl: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const serialized = JSON.parse(JSON.stringify(job));

  return (
    <>
      <PageTitle title={job.title} description={`${job.client?.name} - ${job.location}`} />
      <div className="space-y-6">
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
        <JobDetailClient job={serialized} recruiters={recruiters} clients={clients} />
      </div>
    </>
  );
}
