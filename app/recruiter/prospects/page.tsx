export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { ProspectsClient } from "@/components/workspace/prospects-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default async function RecruiterProspectsPage() {
  const jobs = await prisma.job.findMany({
    where: { status: "OPEN" },
    select: { id: true, title: true, client: { select: { name: true } } },
    orderBy: { title: "asc" },
  });

  return (
    <>
      <PageTitle
        title="Prospects"
        description="Manage your prospect leads"
        actions={
          <Link href="/recruiter/advanced-search">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Search className="h-4 w-4" /> Search Portal
            </Button>
          </Link>
        }
      />
      <ProspectsClient
        recruiters={[]}
        openJobs={jobs.map((j) => ({ id: j.id, title: j.title, clientName: j.client?.name ?? "" }))}
        role="RECRUITER"
      />
    </>
  );
}
