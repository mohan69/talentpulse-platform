import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { SettingsTabs } from "./settings-tabs";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const settings = await tenantPrisma.integrationSetting.findMany({ orderBy: { provider: "asc" } });
  return (
    <>
      <PageTitle title="Settings" description="Manage your company profile and integration configurations." />
      <SettingsTabs initialSettings={JSON.parse(JSON.stringify(settings))} />
    </>
  );
}
