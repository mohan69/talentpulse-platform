import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { ClosuresClient } from "./closures-client";
import { PipelineStage } from "@prisma/client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminClosures() {
  const offers = await tenantPrisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      candidate: { select: { id: true, name: true } },
      application: { include: { job: { include: { client: true } } } },
    },
  });
  const applications = await tenantPrisma.application.findMany({
    where: { stage: { in: [PipelineStage.INTERVIEW_COMPLETE, PipelineStage.OFFER_EXTENDED] } },
    include: { candidate: true, job: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageTitle title="Closures" description="Track offers, acceptances, and joinings." />
      <ClosuresClient offers={JSON.parse(JSON.stringify(offers))} applications={JSON.parse(JSON.stringify(applications))} />
    </>
  );
}
