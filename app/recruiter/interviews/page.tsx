import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { PipelineStage } from "@prisma/client";
import { RecruiterInterviewsClient } from "./interviews-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RecruiterInterviews() {
  const session = await getServerSession(authOptions);
  const interviews = await tenantPrisma.interview.findMany({
    where: { application: { job: { recruiterId: session?.user?.id } } },
    orderBy: { scheduledAt: "desc" },
    include: { application: { include: { candidate: true, job: true } } },
  });
  const applications = await tenantPrisma.application.findMany({
    where: {
      job: { recruiterId: session?.user?.id },
      stage: { notIn: [PipelineStage.OFFER_ACCEPTED, PipelineStage.JOINED, PipelineStage.REJECTED] },
    },
    include: { candidate: { select: { name: true } }, job: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageTitle title="My Interviews" />
      <RecruiterInterviewsClient interviews={JSON.parse(JSON.stringify(interviews))} applications={JSON.parse(JSON.stringify(applications))} />
    </>
  );
}
