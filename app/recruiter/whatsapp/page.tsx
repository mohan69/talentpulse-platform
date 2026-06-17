import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/workspace/page-title";
import { WhatsAppClient } from "../../admin/whatsapp/whatsapp-client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RecruiterWhatsApp() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [messages, templates, integrationActive] = await Promise.all([
    tenantPrisma.whatsAppMessage.findMany({
      include: { candidate: { select: { id: true, name: true, phone: true } }, template: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    tenantPrisma.whatsAppTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
    tenantPrisma.integrationSetting.findUnique({ where: { provider: "WHATSAPP" } }).then((s) => s?.isActive ?? false),
  ]);
  return (
    <>
      <PageTitle title="WhatsApp" description="Send messages and manage WhatsApp templates." />
      <WhatsAppClient
        initialMessages={JSON.parse(JSON.stringify(messages))}
        initialTemplates={JSON.parse(JSON.stringify(templates))}
        isConfigured={integrationActive}
      />
    </>
  );
}
