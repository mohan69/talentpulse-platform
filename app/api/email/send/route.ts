import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { candidateId, subject, htmlBody, templateName } = body ?? {};
  const candidate = candidateId ? await tenantPrisma.candidate.findUnique({ where: { id: candidateId } }) : null;
  const recipient = body.recipient ?? candidate?.email;
  if (!recipient || !subject || !htmlBody) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const appUrl = process.env.NEXTAUTH_URL || "";
    const hostname = appUrl ? new URL(appUrl).hostname : "cloudcxo.in";
    const appName = "CloudCXO";

    const resp = await fetch("https://apps.abacus.ai/api/sendNotificationEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_CANDIDATE_COMMUNICATION,
        subject,
        body: htmlBody,
        is_html: true,
        recipient_email: recipient,
        sender_email: `noreply@${hostname}`,
        sender_alias: appName,
      }),
    });
    const result = await resp.json().catch(() => ({}));
    const success = result?.success !== false;

    await prisma.emailLog.create({
      data: {
        candidateId: candidateId ?? null,
        senderId: user.id,
        subject,
        body: htmlBody,
        recipient,
        templateUsed: templateName ?? null,
        status: success ? "sent" : (result?.notification_disabled ? "disabled" : "failed"),
      },
    });
    return NextResponse.json({ success });
  } catch (e: any) {
    console.error("send email", e);
    return NextResponse.json({ success: false, error: e?.message ?? "Send failed" }, { status: 500 });
  }
}
