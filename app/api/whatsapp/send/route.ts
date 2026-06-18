import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";
import { captureMemory } from "@/lib/memory/service";
import { deriveTagsFromEntityType, deriveTagsFromAction } from "@/lib/memory/tags";
import { captureConversationMemory, getConversationId } from "@/lib/conversation/capture";
import { extractInsightsFromNote } from "@/lib/conversation/note-insights";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wa = await tenantPrisma.integrationSetting.findUnique({ where: { provider: "WHATSAPP" } });
  if (!wa || !wa.isActive) {
    return NextResponse.json({ error: "WhatsApp Business not configured. Please set up in Admin Settings → Integrations." }, { status: 400 });
  }

  const body = await req.json();
  const { phoneNumber, candidateId, templateId, messageBody } = body;
  if (!phoneNumber || !messageBody) {
    return NextResponse.json({ error: "Phone number and message body are required" }, { status: 400 });
  }

  const message = await tenantPrisma.whatsAppMessage.create({
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

  const conversationId = candidateId ? getConversationId(candidateId, "whatsapp") : undefined;
  const insights = extractInsightsFromNote(messageBody ?? "", "whatsapp_message");
  captureMemory({
    userId: user.id,
    entityType: "whatsapp",
    entityId: message.id,
    action: "message_sent",
    metadata: {
      memoryType: "candidate",
      summary: `WhatsApp sent: "${(messageBody ?? "").slice(0, 80)}${(messageBody ?? "").length > 80 ? "..." : ""}"`,
      sourceModel: "whatsAppMessage",
      sourceId: message.id,
      tags: [...deriveTagsFromEntityType("whatsapp"), ...deriveTagsFromAction("message_sent")],
      confidence: "auto",
      importance: "low",
      conversationId,
      channel: "whatsapp",
      direction: "outbound",
      extractedInsights: insights,
      newValue: candidateId ? { candidateId } : undefined,
    },
  });
  if (candidateId) {
    await captureConversationMemory({
      userId: user.id,
      candidateId,
      entityType: "whatsapp",
      entityId: message.id,
      action: "message_sent",
      channel: "whatsapp",
      sourceModel: "whatsAppMessage",
      sourceId: message.id,
      text: messageBody ?? "",
      summary: `Insights from WhatsApp: ${insights.length} signal${insights.length === 1 ? "" : "s"} found`,
      direction: "outbound",
      insights,
      conversationId,
    });
  }

  // TODO: Actual WhatsApp Business API call here
  return NextResponse.json(message);
}
