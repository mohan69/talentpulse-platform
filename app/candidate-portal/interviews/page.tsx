import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { CandidateInterviewsClient } from "./interviews-client";

export const dynamic = "force-dynamic";

export default async function CandidateInterviews() {
  const session = await getServerSession(authOptions);
  const candidateId = session?.user?.candidateId;
  if (!candidateId) return <div>No profile.</div>;
  const interviews = await prisma.interview.findMany({
    where: { application: { candidateId } },
    orderBy: { scheduledAt: "desc" },
    include: { application: { include: { job: { include: { client: true } } } } },
  });
  return (
    <>
      <PageTitle title="My Interviews" description="Your scheduled and completed interviews." />
      <CandidateInterviewsClient interviews={JSON.parse(JSON.stringify(interviews))} />
    </>
  );
}
