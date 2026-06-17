import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { PipelineBoard } from "@/components/workspace/pipeline-board";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RecruiterPipeline() {
  const session = await getServerSession(authOptions);
  const applications = await tenantPrisma.application.findMany({ where: { job: { recruiterId: session?.user?.id } }, orderBy: { updatedAt: "desc" }, include: { candidate: true, job: true } });
  return (
    <>
      <PageTitle title="My Pipeline" description="Drag to move candidates through stages." />
      <PipelineBoard applications={applications as any} detailPathPrefix="/recruiter/candidates" />
    </>
  );
}
