import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CandidatesClient } from "./candidates-client";

export const dynamic = "force-dynamic";

export default async function AdminCandidates() {
  const candidates = await prisma.candidate.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { applications: true } } } });
  return (
    <>
      <PageTitle title="Talent Repository" description="Talent intelligence across all candidates in the pipeline." actions={<Link href="/admin/candidates/new"><Button><Plus className="h-4 w-4 mr-2" /> Add Candidate</Button></Link>} />
      <CandidatesClient candidates={JSON.parse(JSON.stringify(candidates))} />
    </>
  );
}
