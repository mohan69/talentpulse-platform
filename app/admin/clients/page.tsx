import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ClientsClient } from "./clients-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminClients() {
  const clients = await tenantPrisma.client.findMany({
    include: { _count: { select: { jobs: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageTitle
        title="Clients"
        description="Your enterprise customers."
        actions={<Link href="/admin/clients/new"><Button><Plus className="h-4 w-4 mr-2" /> Add Client</Button></Link>}
      />
      <ClientsClient clients={JSON.parse(JSON.stringify(clients))} />
    </>
  );
}
