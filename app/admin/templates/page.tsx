import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { TemplatesClient } from "./templates-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminTemplates() {
  const templates = await tenantPrisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageTitle title="Email Templates" description="Create and edit email templates for candidate communication." />
      <TemplatesClient templates={JSON.parse(JSON.stringify(templates))} />
    </>
  );
}
