import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

async function testElevenLabs(cfg: any): Promise<{ success: boolean; message: string }> {
  const apiKey = cfg.apiKey;
  const agentId = cfg.agentId;
  if (!apiKey) return { success: false, message: "API Key is missing." };
  if (!agentId) return { success: false, message: "Agent ID is missing." };

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "GET",
      headers: { "xi-api-key": apiKey },
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: `Connected to agent "${data.name || agentId}". Status: Active.` };
    }
    const errText = await res.text();
    return { success: false, message: `ElevenLabs API error ${res.status}: ${errText.slice(0, 200)}` };
  } catch (e: any) {
    return { success: false, message: `Connection failed: ${e.message}` };
  }
}

async function testTwilio(cfg: any): Promise<{ success: boolean; message: string }> {
  const sid = cfg.twilioAccountSid;
  const token = cfg.twilioAuthToken;
  const fromNumber = cfg.twilioFromNumber;
  if (!sid || !token) return { success: false, message: "Twilio Account SID or Auth Token is missing." };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      method: "GET",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      },
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: `Twilio connected. Account: ${data.friendly_name || sid}. From: ${fromNumber || "Not set"}.` };
    }
    return { success: false, message: `Twilio API error ${res.status}. Check Account SID and Auth Token.` };
  } catch (e: any) {
    return { success: false, message: `Connection failed: ${e.message}` };
  }
}

async function testWhatsApp(cfg: any): Promise<{ success: boolean; message: string }> {
  const apiKey = cfg.apiKey;
  const phoneNumberId = cfg.phoneNumberId;
  const businessAccountId = cfg.businessAccountId;
  if (!apiKey) return { success: false, message: "WhatsApp API Key is missing." };
  if (!phoneNumberId) return { success: false, message: "Phone Number ID is missing." };

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: `WhatsApp connected. Number: ${data.display_phone_number || phoneNumberId}.` };
    }
    const errText = await res.text();
    return { success: false, message: `WhatsApp API error ${res.status}: ${errText.slice(0, 200)}` };
  } catch (e: any) {
    return { success: false, message: `Connection failed: ${e.message}` };
  }
}

async function testGoogleCalendar(cfg: any): Promise<{ success: boolean; message: string }> {
  const clientId = cfg.clientId;
  const clientSecret = cfg.clientSecret;
  if (!clientId || !clientSecret) return { success: false, message: "OAuth Client ID or Secret is missing." };
  return { success: true, message: `Google Calendar credentials configured. OAuth Client ID: ${clientId.slice(0, 20)}...` };
}

async function testOutlookCalendar(cfg: any): Promise<{ success: boolean; message: string }> {
  const clientId = cfg.clientId;
  const clientSecret = cfg.clientSecret;
  const tenantId = cfg.tenantId;
  if (!clientId || !clientSecret) return { success: false, message: "Application Client ID or Secret is missing." };
  return { success: true, message: `Outlook Calendar credentials configured. Client ID: ${clientId.slice(0, 20)}...` };
}

export async function POST(req: Request) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { provider } = await req.json();
  const setting = await tenantPrisma.integrationSetting.findUnique({ where: { provider } });
  if (!setting) return NextResponse.json({ success: false, error: "Integration not configured. Save your credentials first." });

  const cfg = (setting.config as any) || {};
  let result: { success: boolean; message: string };

  switch (provider) {
    case "ELEVENLABS":
      result = await testElevenLabs(cfg);
      // Also test Twilio if configured
      if (result.success && cfg.twilioAccountSid && cfg.twilioAuthToken) {
        const twilioResult = await testTwilio(cfg);
        result.message += ` | Twilio: ${twilioResult.success ? "✅" : "❌"} ${twilioResult.message}`;
        if (!twilioResult.success) result.success = false;
      }
      break;
    case "WHATSAPP":
      result = await testWhatsApp(cfg);
      break;
    case "GOOGLE_CALENDAR":
      result = await testGoogleCalendar(cfg);
      break;
    case "OUTLOOK_CALENDAR":
      result = await testOutlookCalendar(cfg);
      break;
    default:
      result = { success: true, message: "Configuration saved successfully." };
  }

  await tenantPrisma.integrationSetting.update({
    where: { provider },
    data: { lastTested: new Date() },
  });

  return NextResponse.json(result);
}
