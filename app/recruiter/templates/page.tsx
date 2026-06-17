import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { RecruiterTemplatesClient } from "./templates-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RecruiterTemplates() {
  const templates = await tenantPrisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageTitle title="Email Templates" description="Pre-built communication templates." />
      <RecruiterTemplatesClient templates={JSON.parse(JSON.stringify(templates))} />
    </>
  );
}
