import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { InterviewsClient } from "./interviews-client";
import { PipelineStage } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminInterviews() {
  const interviews = await prisma.interview.findMany({
    orderBy: { scheduledAt: "desc" },
    include: { application: { include: { candidate: true, job: { include: { client: true } } } } },
  });
  const applications = await prisma.application.findMany({
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
