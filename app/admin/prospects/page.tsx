export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { ProspectsClient } from "@/components/workspace/prospects-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default async function AdminProspectsPage() {
  const [recruiters, jobs] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "RECRUITER"] }, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.job.findMany({
      where: { status: "OPEN" },
      select: { id: true, title: true, client: { select: { name: true } } },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <>
      <PageTitle
        title="Prospects"
        description="Manage pre-candidate leads and bulk imports"
        actions={
          <Link href="/admin/advanced-search">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Search className="h-4 w-4" /> Search Portal
            </Button>
          </Link>
        }
      />
      <ProspectsClient
        recruiters={recruiters}
        openJobs={jobs.map((j) => ({ id: j.id, title: j.title, clientName: j.client?.name ?? "" }))}
        role="ADMIN"
      />
    </>
  );
}
