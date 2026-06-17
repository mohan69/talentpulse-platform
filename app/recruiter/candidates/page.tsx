import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RecruiterCandidatesClient } from "./candidates-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RecruiterCandidates() {
  const candidates = await tenantPrisma.candidate.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { applications: true } } } });
  return (
    <>
      <PageTitle title="Talent Repository" description="Talent intelligence across all candidates." actions={<Link href="/recruiter/candidates/new"><Button><Plus className="h-4 w-4 mr-2" />Add Candidate</Button></Link>} />
      <RecruiterCandidatesClient candidates={JSON.parse(JSON.stringify(candidates))} />
    </>
  );
}
