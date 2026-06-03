import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { OutreachClient } from "./outreach-client";

export const dynamic = "force-dynamic";

export default async function AdminOutreach() {
  const [campaigns, candidates] = await Promise.all([
    prisma.emailCampaign.findMany({
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.candidate.findMany({
      select: { id: true, name: true, email: true, currentCompany: true, currentDesignation: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  return (
    <>
      <PageTitle title="Email Outreach" description="AI-powered email campaigns for candidates and BD outreach." />
      <OutreachClient
        initialCampaigns={JSON.parse(JSON.stringify(campaigns))}
        candidates={JSON.parse(JSON.stringify(candidates))}
      />
    </>
  );
}
