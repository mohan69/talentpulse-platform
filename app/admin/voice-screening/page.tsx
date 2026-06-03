import { prisma } from "@/lib/db";
import { PipelineStage } from "@prisma/client";
import { PageTitle } from "@/components/workspace/page-title";
import { VoiceScreeningClient } from "./voice-screening-client";

export const dynamic = "force-dynamic";

export default async function AdminVoiceScreening() {
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
      where: { stage: { notIn: [PipelineStage.REJECTED, PipelineStage.JOINED] } },
      include: {
        candidate: { select: { id: true, name: true, phone: true, email: true } },
        job: { select: { id: true, title: true, client: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <>
      <PageTitle title="Voice AI Screening" description="Autonomous phone screening calls powered by AI." />
      <VoiceScreeningClient
        initialScreenings={JSON.parse(JSON.stringify(screenings))}
        isConfigured={integrationActive}
        applications={JSON.parse(JSON.stringify(applications))}
      />
    </>
  );
}
