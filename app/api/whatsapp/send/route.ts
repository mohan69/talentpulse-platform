import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wa = await prisma.integrationSetting.findUnique({ where: { provider: "WHATSAPP" } });
  if (!wa || !wa.isActive) {
    return NextResponse.json({ error: "WhatsApp Business not configured. Please set up in Admin Settings → Integrations." }, { status: 400 });
  }

  const body = await req.json();
  const { phoneNumber, candidateId, templateId, messageBody } = body;
  if (!phoneNumber || !messageBody) {
    return NextResponse.json({ error: "Phone number and message body are required" }, { status: 400 });
  }

  const message = await prisma.whatsAppMessage.create({
    data: {
      candidateId: candidateId || null,
      phoneNumber,
      templateId: templateId || null,
      body: messageBody,
      direction: "OUTBOUND",
      status: "QUEUED",
      sentById: user.id,
    },
  });

  // TODO: Actual WhatsApp Business API call here
  return NextResponse.json(message);
}
