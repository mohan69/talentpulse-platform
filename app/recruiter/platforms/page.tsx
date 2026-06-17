import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/workspace/page-title";
import { RecruiterPlatformsClient } from "./platforms-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RecruiterPlatformsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;

  const subscriptions = await tenantPrisma.platformSubscription.findMany({
    where: { recruiterId: userId },
    include: { platform: true },
    orderBy: { platform: { name: "asc" } },
  });

  return (
    <>
      <PageTitle title="My Platforms" description="Your sourcing platform subscriptions and usage." />
      <RecruiterPlatformsClient subscriptions={JSON.parse(JSON.stringify(subscriptions))} />
    </>
  );
}
