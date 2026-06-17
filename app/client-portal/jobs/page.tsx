import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { ClientJobsClient } from "./jobs-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function ClientJobs() {
  const session = await getServerSession(authOptions);
  const jobs = await tenantPrisma.job.findMany({
    where: { clientId: (session?.user?.clientId ?? "") },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: true } },
      recruiter: { select: { name: true, email: true } },
    },
  });
  return (
    <>
      <PageTitle title="My Jobs" description="Your open positions and their status." />
      <ClientJobsClient jobs={JSON.parse(JSON.stringify(jobs))} />
    </>
  );
}
