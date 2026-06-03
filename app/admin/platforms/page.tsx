import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { PlatformsClient } from "./platforms-client";

export const dynamic = "force-dynamic";

export default async function AdminPlatformsPage() {
  const platforms = await prisma.recruitingPlatform.findMany({
    orderBy: { name: "asc" },
    include: {
      subscriptions: {
        include: { recruiter: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  const recruiters = await prisma.user.findMany({
    where: { role: "RECRUITER", isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageTitle title="Sourcing Platforms" description="Manage recruiter subscriptions to Naukri, LinkedIn, foundit and other job platforms." />
      <PlatformsClient initialPlatforms={JSON.parse(JSON.stringify(platforms))} recruiters={recruiters} />
    </>
  );
}
