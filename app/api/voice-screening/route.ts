import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidateId");
  const applicationId = searchParams.get("applicationId");
  const where: any = {};
  if (candidateId) where.candidateId = candidateId;
  if (applicationId) where.applicationId = applicationId;
  const screenings = await prisma.voiceScreening.findMany({
    where,
    include: { candidate: { select: { id: true, name: true, phone: true } }, application: { include: { job: { select: { id: true, title: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(screenings);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if ElevenLabs integration is configured
  const elevenLabs = await prisma.integrationSetting.findUnique({ where: { provider: "ELEVENLABS" } });
  if (!elevenLabs || !elevenLabs.isActive) {
    return NextResponse.json({ error: "Voice AI not configured. Please set up ElevenLabs in Admin Settings → Integrations." }, { status: 400 });
  }

  const body = await req.json();
  const { applicationId, candidateId, phoneNumber, questions } = body;
  if (!applicationId || !candidateId || !phoneNumber) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const screening = await prisma.voiceScreening.create({
    data: {
      applicationId,
      candidateId,
      phoneNumber,
      questions: questions || null,
      initiatedById: user.id,
      callStatus: "QUEUED",
    },
  });

  // Initiate outbound call via ElevenLabs Conversational AI
  const cfg = (elevenLabs.config as any) || {};
  const apiKey = cfg.apiKey;
  const agentId = cfg.agentId;
  const agentPhoneNumberId = cfg.phoneNumberId;

  if (!apiKey || !agentId || !agentPhoneNumberId) {
    await prisma.voiceScreening.update({
      where: { id: screening.id },
      data: { callStatus: "FAILED", aiSummary: "Missing ElevenLabs credentials (apiKey / agentId / phoneNumberId)." },
    });
    return NextResponse.json({
      ...screening,
      warning: "Screening created but call NOT initiated — please configure API Key, Agent ID, and Agent Phone Number ID in Settings → Integrations.",
    });
  }

  try {
    // ── Approach: Twilio direct call → our webhook → ElevenLabs register-call ──
    // 1. Twilio places the outbound call
    // 2. When candidate answers, Twilio hits our /api/voice-screening/twiml webhook
    // 3. Our webhook calls ElevenLabs register-call to get fresh TwiML per call
    // 4. TwiML streams audio to ElevenLabs agent via WebSocket
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");

    // Twilio credentials from integration config or env
    const twilioAccountSid = cfg.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || "";
    const twilioAuthToken = cfg.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || "";
    const twilioFromNumber = cfg.twilioFromNumber || process.env.TWILIO_FROM_NUMBER || "";

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      await prisma.voiceScreening.update({
        where: { id: screening.id },
        data: { callStatus: "FAILED", aiSummary: "Missing Twilio credentials (twilioAccountSid / twilioAuthToken / twilioFromNumber) in integration settings." },
      });
      return NextResponse.json({
        ...screening,
        warning: "Screening created but call NOT initiated — please configure Twilio Account SID, Auth Token, and From Number in Settings → Integrations.",
      });
    }

    // Build our TwiML webhook URL — Twilio will call this when the candidate answers
    // Use NEXTAUTH_URL as the base (production URL)
    // Pass screeningId so the TwiML endpoint can forward it to ElevenLabs
    const baseUrl = process.env.NEXTAUTH_URL || "https://cloudcxo.in";
    const twimlWebhookUrl = `${baseUrl}/api/voice-screening/twiml?screeningId=${encodeURIComponent(screening.id)}`;

    console.log("[VoiceScreening] Initiating Twilio direct call with register-call webhook:", {
      to: normalizedPhone,
      from: twilioFromNumber,
      twimlWebhookUrl,
      screeningId: screening.id,
    });

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
    const twilioBody = new URLSearchParams();
    twilioBody.append("To", normalizedPhone);
    twilioBody.append("From", twilioFromNumber);
    twilioBody.append("Url", twimlWebhookUrl);
    twilioBody.append("Method", "POST");
    twilioBody.append("StatusCallback", `${baseUrl}/api/voice-screening/callback`);
    twilioBody.append("StatusCallbackMethod", "POST");
    twilioBody.append("StatusCallbackEvent", "initiated");
    twilioBody.append("StatusCallbackEvent", "ringing");
    twilioBody.append("StatusCallbackEvent", "answered");
    twilioBody.append("StatusCallbackEvent", "completed");

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioBody.toString(),
    });
    const twilioJson = await twilioRes.json().catch(() => ({}));

    console.log("[VoiceScreening] Twilio response:", {
      status: twilioRes.status,
      ok: twilioRes.ok,
      callSid: twilioJson?.sid,
      body: JSON.stringify(twilioJson).slice(0, 1000),
    });

    if (!twilioRes.ok) {
      console.error("[VoiceScreening] Twilio call failed:", twilioJson);
      await prisma.voiceScreening.update({
        where: { id: screening.id },
        data: { callStatus: "FAILED", aiSummary: `Twilio error: ${twilioJson?.message || JSON.stringify(twilioJson).slice(0, 500)}` },
      });
      return NextResponse.json({ ...screening, warning: `Call NOT initiated: ${twilioJson?.message || "Twilio API error"}` });
    }

    const callSid = twilioJson?.sid || null;
    console.log("[VoiceScreening] Twilio call initiated successfully:", { callSid });

    await prisma.voiceScreening.update({
      where: { id: screening.id },
      data: {
        callStatus: "RINGING",
        startedAt: new Date(),
        externalCallId: callSid,
      },
    });
    return NextResponse.json({ ...screening, callStatus: "RINGING", twilio: { callSid } });
  } catch (e: any) {
    console.error("[VoiceScreening] Twilio call exception:", e);
    await prisma.voiceScreening.update({
      where: { id: screening.id },
      data: { callStatus: "FAILED", aiSummary: e?.message || "Unknown error" },
    });
    return NextResponse.json({ ...screening, warning: `Call NOT initiated: ${e?.message}` });
  }
}
