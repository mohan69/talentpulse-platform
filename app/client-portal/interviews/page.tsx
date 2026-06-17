import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { ClientInterviewsClient } from "./interviews-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function ClientInterviews() {
  const session = await getServerSession(authOptions);
  const interviews = await tenantPrisma.interview.findMany({
    where: { application: { job: { clientId: (session?.user?.clientId ?? "") } } },
    orderBy: { scheduledAt: "desc" },
    include: { application: { include: { candidate: true, job: true } } },
  });
  return (
    <>
      <PageTitle title="Interviews" description="Track interview progress and provide feedback." />
      <ClientInterviewsClient interviews={JSON.parse(JSON.stringify(interviews))} />
    </>
  );
}
