export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageTitle title="Reports" description="Generate and download recruitment reports" />
      <ReportsClient clients={clients} />
    </>
  );
}
