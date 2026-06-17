import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { InterviewsClient } from "./interviews-client";
import { PipelineStage } from "@prisma/client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminInterviews() {
  const interviews = await tenantPrisma.interview.findMany({
    orderBy: { scheduledAt: "desc" },
    include: { application: { include: { candidate: true, job: { include: { client: true } } } } },
  });
  const applications = await tenantPrisma.application.findMany({
    where: { stage: { notIn: [PipelineStage.OFFER_ACCEPTED, PipelineStage.JOINED, PipelineStage.REJECTED] } },
    include: { candidate: true, job: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageTitle title="Interviews" description="Schedule, track, and manage all interviews." />
      <InterviewsClient
        interviews={JSON.parse(JSON.stringify(interviews))}
        applications={JSON.parse(JSON.stringify(applications))}
      />
    </>
  );
}
