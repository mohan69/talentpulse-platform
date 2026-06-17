import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/workspace/page-title";
import { OutreachClient } from "../../admin/outreach/outreach-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RecruiterOutreach() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;

  const [campaigns, candidates] = await Promise.all([
    tenantPrisma.emailCampaign.findMany({
      where: { createdById: userId },
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    tenantPrisma.candidate.findMany({
      select: { id: true, name: true, email: true, currentCompany: true, currentDesignation: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  return (
    <>
      <PageTitle title="Email Outreach" description="Create and send AI-powered outreach campaigns." />
      <OutreachClient
        initialCampaigns={JSON.parse(JSON.stringify(campaigns))}
        candidates={JSON.parse(JSON.stringify(candidates))}
      />
    </>
  );
}
