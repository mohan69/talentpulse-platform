import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { PipelineBoard } from "@/components/workspace/pipeline-board";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminPipeline() {
  const applications = await tenantPrisma.application.findMany({ orderBy: { updatedAt: "desc" }, include: { candidate: true, job: true } });
  return (
    <>
      <PageTitle title="Pipeline" description="Drag cards to move candidates through stages." />
      <PipelineBoard applications={applications as any} detailPathPrefix="/admin/candidates" />
    </>
  );
}
