import { prisma } from "@/lib/db";
import { PipelineStage } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/workspace/page-title";
import { VoiceScreeningClient } from "../../admin/voice-screening/voice-screening-client";

export const dynamic = "force-dynamic";

export default async function RecruiterVoiceScreening() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id;

  const [screenings, integrationActive, applications] = await Promise.all([
    prisma.voiceScreening.findMany({
      include: {
        candidate: { select: { id: true, name: true, phone: true } },
        application: { include: { job: { select: { id: true, title: true, client: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.integrationSetting.findUnique({ where: { provider: "ELEVENLABS" } }).then((s) => s?.isActive ?? false),
    prisma.application.findMany({
      where: { stage: { notIn: [PipelineStage.REJECTED, PipelineStage.JOINED] }, job: { recruiterId: userId } },
      include: {
        candidate: { select: { id: true, name: true, phone: true, email: true } },
        job: { select: { id: true, title: true, client: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <>
      <PageTitle title="Voice AI Screening" description="View autonomous phone screening results." />
      <VoiceScreeningClient
        initialScreenings={JSON.parse(JSON.stringify(screenings))}
        isConfigured={integrationActive}
        applications={JSON.parse(JSON.stringify(applications))}
      />
    </>
  );
}
