import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { CalendarClient } from "./calendar-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminCalendar() {
  const [googleActive, outlookActive, upcomingInterviews] = await Promise.all([
    prisma.integrationSetting.findUnique({ where: { provider: "GOOGLE_CALENDAR" } }).then((s: any) => s?.isActive ?? false),
    prisma.integrationSetting.findUnique({ where: { provider: "OUTLOOK_CALENDAR" } }).then((s: any) => s?.isActive ?? false),
    tenantPrisma.interview.findMany({
      where: { scheduledAt: { gte: new Date() } },
      include: {
        application: { include: { job: { select: { title: true } } } },
        candidate: { select: { name: true, phone: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    }),
  ]);
  return (
    <>
      <PageTitle title="Calendar Sync" description="Manage calendar integrations for interview scheduling." />
      <CalendarClient
        googleActive={googleActive}
        outlookActive={outlookActive}
        upcomingInterviews={JSON.parse(JSON.stringify(upcomingInterviews))}
      />
    </>
  );
}
