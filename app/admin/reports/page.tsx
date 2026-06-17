export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { ReportsClient } from "./reports-client";
import { tenantPrisma } from "@/lib/repositories";

export default async function ReportsPage() {
  const clients = await tenantPrisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageTitle title="Reports & Analytics" description="Generate and download talent intelligence reports" />
      <ReportsClient clients={clients} />
    </>
  );
}
