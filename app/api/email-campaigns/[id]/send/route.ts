import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function sendOneEmail(recipient: { email: string; name?: string | null }, subject: string, htmlBody: string) {
  const appUrl = process.env.NEXTAUTH_URL || "";
  const hostname = appUrl ? new URL(appUrl).hostname : "cloudcxo.in";
  const resp = await fetch("https://apps.abacus.ai/api/sendNotificationEmail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deployment_token: process.env.ABACUSAI_API_KEY,
      app_id: process.env.WEB_APP_ID,
      notification_id: process.env.NOTIF_ID_CANDIDATE_COMMUNICATION,
      subject,
      body: htmlBody.replace(/\{\{name\}\}/g, recipient.name || "there"),
      is_html: true,
      recipient_email: recipient.email,
      sender_email: `noreply@${hostname}`,
      sender_alias: "CloudCXO",
    }),
  });
  const result = await resp.json().catch(() => ({}));
  return result?.success !== false;
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await tenantPrisma.emailCampaign.findUnique({
    where: { id: params.id },
    include: { recipients: { where: { status: "pending" } } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.recipients.length === 0) return NextResponse.json({ error: "No pending recipients" }, { status: 400 });

  await tenantPrisma.emailCampaign.update({ where: { id: params.id }, data: { status: "SENDING" } });

  let sentCount = 0;
  let failedCount = 0;

  for (const r of campaign.recipients) {
    try {
      const ok = await sendOneEmail({ email: r.email, name: r.name }, campaign.subject, campaign.body);
      await tenantPrisma.campaignRecipient.update({
        where: { id: r.id },
        data: { status: ok ? "sent" : "failed", sentAt: ok ? new Date() : undefined },
      });
      if (ok) sentCount++; else failedCount++;
    } catch {
      await tenantPrisma.campaignRecipient.update({ where: { id: r.id }, data: { status: "failed" } });
      failedCount++;
    }
  }

  await tenantPrisma.emailCampaign.update({
    where: { id: params.id },
    data: { status: "SENT", sentAt: new Date(), sentCount: { increment: sentCount }, failedCount: { increment: failedCount } },
  });

  return NextResponse.json({ success: true, sentCount, failedCount });
}
