import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/workspace/page-title";
import { WhatsAppClient } from "./whatsapp-client";

export const dynamic = "force-dynamic";

export default async function AdminWhatsApp() {
  const [messages, templates, integrationActive] = await Promise.all([
    prisma.whatsAppMessage.findMany({
      include: { candidate: { select: { id: true, name: true, phone: true } }, template: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.whatsAppTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.integrationSetting.findUnique({ where: { provider: "WHATSAPP" } }).then((s) => s?.isActive ?? false),
  ]);
  return (
    <>
      <PageTitle title="WhatsApp Outreach" description="Send candidate messages and manage templates via WhatsApp Business." />
      <WhatsAppClient
        initialMessages={JSON.parse(JSON.stringify(messages))}
        initialTemplates={JSON.parse(JSON.stringify(templates))}
        isConfigured={integrationActive}
      />
    </>
  );
}
