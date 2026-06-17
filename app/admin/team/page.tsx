import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { TeamClient } from "./team-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminTeam() {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "RECRUITER"] },
      NOT: [
        { email: { startsWith: "testuser" } },
        { email: "john@doe.com" },
      ],
    },
    include: { _count: { select: { assignedJobs: true } }, client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const clients = await tenantPrisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <>
      <PageTitle title="Team" description="Manage your recruitment team and user accounts." />
      <TeamClient users={JSON.parse(JSON.stringify(users))} clients={clients} />
    </>
  );
}
