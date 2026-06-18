import { NextResponse } from "next/server";
import { VoiceCallStatus } from "@prisma/client";
import { tenantPrisma } from "@/lib/repositories";
import { resolveRecordTenantContext, resolveRecordTenantContextByWhere } from "@/lib/tenant/provider-context";
import { captureMemoryWithContext } from "@/lib/memory/service";
import { deriveTagsFromEntityType, deriveTagsFromAction } from "@/lib/memory/tags";
import type { TenantContext } from "@/lib/tenant/context";
import { captureConversationMemory, getConversationId } from "@/lib/conversation/capture";
import { extractInsightsFromTranscript } from "@/lib/conversation/voice-insights";

export const dynamic = "force-dynamic";

/**
 * Find the conversation ID by querying ElevenLabs for recent conversations
 * matching the phone number and time.
 */
async function findConversationIdFromElevenLabs(
  phoneNumber: string,
  apiKey: string,
  agentId: string,
  timeWindowMinutes: number = 10
): Promise<string | null> {
  try {
    console.log("[VoiceScreening] Searching for conversation:", {
      phoneNumber,
      agentId,
      timeWindowMinutes,
    });

    const res = await fetch("https://api.elevenlabs.io/v1/convai/conversations", {
      method: "GET",
      headers: { "xi-api-key": apiKey },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[VoiceScreening] Failed to list conversations:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const conversations = data.conversations || data || [];

    console.log("[VoiceScreening] Found conversations count:", conversations.length);

    // Look for a conversation with matching phone number within time window
    const now = Date.now();
    const timeWindowMs = timeWindowMinutes * 60 * 1000;

    for (const conv of conversations) {
      const convId = conv.conversation_id || conv.id;
      const convTime = new Date(conv.created_at || conv.timestamp || 0).getTime();
      const timeDiff = now - convTime;

      console.log("[VoiceScreening] Checking conversation:", {
        convId,
        timeDiffMs: timeDiff,
        withinWindow: timeDiff < timeWindowMs,
      });

      // Check if this conversation is within the time window
      if (timeDiff >= timeWindowMs) {
        console.log("[VoiceScreening] Conversation too old, skipping");
        continue;
      }

      // Try to match by phone number in conversation metadata
      if (conv.agent_output_last_message?.messages) {
        const messages = conv.agent_output_last_message.messages;
        for (const msg of messages) {
          if (msg.includes(phoneNumber)) {
            console.log("[VoiceScreening] ✓ Found conversation by phone match:", convId);
            return convId;
          }
        }
      }

      // Check other message locations
      if (conv.messages && Array.isArray(conv.messages)) {
        for (const msg of conv.messages) {
          const msgText = msg.message || msg.text || String(msg);
          if (msgText.includes(phoneNumber)) {
            console.log("[VoiceScreening] ✓ Found conversation by message match:", convId);
            return convId;
          }
        }
      }
    }

    // Fallback: return the most recent conversation if within time window
    if (conversations.length > 0) {
      const mostRecent = conversations[0];
      const convId = mostRecent.conversation_id || mostRecent.id;
      const convTime = new Date(mostRecent.created_at || mostRecent.timestamp || 0).getTime();
      if (now - convTime < timeWindowMs) {
        console.log("[VoiceScreening] ⚠ Using most recent conversation (within time window):", convId);
        return convId;
      }
    }

    console.warn("[VoiceScreening] No matching conversation found");
    return null;
  } catch (e: any) {
    console.error("[VoiceScreening] Error finding conversation:", e?.message, e?.stack);
    return null;
  }
}

/**
 * Fetch conversation transcript and analysis from ElevenLabs API.
 * Called after a Twilio call completes to proactively pull conversation data.
 */
async function fetchElevenLabsConversation(
  screening: {
    id: string;
    conversationId: string | null;
    phoneNumber: string;
    candidateId?: string | null;
  },
  apiKeyOverride?: string,
  tenantContext?: TenantContext | null,
) {
  const voiceScreeningRepo = tenantContext ? (tenantPrisma.voiceScreening as any).withContext(tenantContext) : tenantPrisma.voiceScreening;
  const integrationSettingRepo = tenantContext ? (tenantPrisma.integrationSetting as any).withContext(tenantContext) : tenantPrisma.integrationSetting;
  let conversationId = screening.conversationId;
  
  // If no conversationId is set, try to find it from ElevenLabs
  if (!conversationId) {
    console.log("[VoiceScreening] conversationId not set, attempting to find from ElevenLabs...");
    const elevenLabs = await integrationSettingRepo.findUnique({
      where: { provider: "ELEVENLABS" },
    });
    if (elevenLabs) {
      const cfg = (elevenLabs.config as any) || {};
      const apiKey = cfg.apiKey;
      const agentId = cfg.agentId;
      if (apiKey && agentId) {
        conversationId = await findConversationIdFromElevenLabs(screening.phoneNumber, apiKey, agentId);
        if (conversationId) {
          // Store it for future use
          await voiceScreeningRepo.update({
            where: { id: screening.id },
            data: { conversationId },
          }).catch((e: any) => console.error("[VoiceScreening] Failed to store found conversationId:", e));
        } else {
          console.warn("[VoiceScreening] Could not find conversation ID from ElevenLabs for:", screening.phoneNumber);
        }
      } else {
        console.warn("[VoiceScreening] Missing API key or Agent ID for conversation lookup");
      }
    }
  }
  
  if (!conversationId) {
    console.log("[VoiceScreening] No conversationId to fetch transcript for screening:", screening.id);
    return;
  }

  try {
    // Get ElevenLabs API key
    const elevenLabs = await integrationSettingRepo.findUnique({
      where: { provider: "ELEVENLABS" },
    });
    if (!elevenLabs) return;
    const cfg = (elevenLabs.config as any) || {};
    const apiKey = cfg.apiKey;
    if (!apiKey) return;

    console.log("[VoiceScreening] Fetching conversation from ElevenLabs:", screening.conversationId);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${screening.conversationId}`,
      {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[VoiceScreening] ElevenLabs conversation fetch failed:", res.status, errText);
      return;
    }

    const data = await res.json();
    console.log("[VoiceScreening] ElevenLabs conversation data keys:", Object.keys(data));

    // Build transcript from messages array
    let transcriptText = "";
    if (data.transcript && Array.isArray(data.transcript)) {
      transcriptText = data.transcript
        .map((t: any) => `${t.role === "agent" ? "Agent" : "Candidate"}: ${t.message}`)
        .join("\n\n");
    }

    // Extract analysis data
    const analysis = data.analysis || {};
    const summary = analysis.transcript_summary || analysis.summary || null;
    const evalResults = analysis.evaluation_criteria_results || {};
    const dataCollection = analysis.data_collection_results || {};
    const callSuccessful = analysis.call_successful;

    // Build score breakdown from evaluation criteria
    const scoreBreakdown: Record<string, number> = {};
    let totalScore = 0;
    let scoreCount = 0;
    if (evalResults && typeof evalResults === "object") {
      for (const [key, val] of Object.entries(evalResults)) {
        if (val && typeof val === "object") {
          const result = (val as any).result;
          const score = (val as any).score;
          if (typeof score === "number") {
            scoreBreakdown[key] = score;
            totalScore += score;
            scoreCount++;
          } else if (result === "success" || result === "pass") {
            scoreBreakdown[key] = 100;
            totalScore += 100;
            scoreCount++;
          } else if (result === "failure" || result === "fail") {
            scoreBreakdown[key] = 0;
            totalScore += 0;
            scoreCount++;
          }
        }
      }
    }

    // Calculate overall score
    const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;

    // Extract metadata
    const metadata = data.metadata || {};
    const callDurationSecs = metadata.call_duration_secs || null;

    // Extract collected data as additional info in summary
    let collectedInfo = "";
    if (dataCollection && typeof dataCollection === "object") {
      const entries = Object.entries(dataCollection);
      if (entries.length > 0) {
        collectedInfo = "\n\nCollected Information:\n" +
          entries.map(([k, v]: [string, any]) => `• ${k}: ${v?.value || v?.result || "N/A"}`).join("\n");
      }
    }

    const fullSummary = (summary || "") + collectedInfo;

    // Update the screening record
    const updateData: any = {};
    if (transcriptText) updateData.transcript = transcriptText;
    if (fullSummary) updateData.aiSummary = fullSummary;
    if (overallScore !== null) updateData.aiScore = overallScore;
    if (Object.keys(scoreBreakdown).length > 0) updateData.aiScoreBreakdown = scoreBreakdown;
    if (callDurationSecs) updateData.callDuration = Math.round(callDurationSecs);

    if (Object.keys(updateData).length > 0) {
      await voiceScreeningRepo.update({
        where: { id: screening.id },
        data: updateData,
      });
      console.log("[VoiceScreening] Updated screening with ElevenLabs data:", screening.id, Object.keys(updateData));
      const candidateId = screening.candidateId ?? tenantContext?.candidateId ?? null;
      if (tenantContext && candidateId) {
        const insights = extractInsightsFromTranscript(transcriptText, fullSummary, overallScore, scoreBreakdown);
        await captureConversationMemory({
          ctx: tenantContext,
          userId: null,
          candidateId,
          entityType: "voiceScreening",
          entityId: screening.id,
          action: "screening_completed",
          channel: "voice",
          sourceModel: "voiceScreening",
          sourceId: screening.id,
          text: [transcriptText, fullSummary].filter(Boolean).join("\n\n"),
          summary: `Voice transcript captured${overallScore != null ? ` (Score: ${overallScore}/100)` : ""}`,
          direction: "inbound",
          insights,
          conversationId: getConversationId(candidateId, "voice"),
        });
      }
    }
  } catch (e: any) {
    console.error("[VoiceScreening] Error fetching ElevenLabs conversation:", e.message);
  }
}

/**
 * POST /api/voice-screening/callback
 * Handles both:
 * 1. Twilio status callbacks (form-encoded) — updates call status
 * 2. ElevenLabs post-call data (JSON) — stores transcript/scores directly
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // ── Handle Twilio status callback (form-encoded) ──
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const twilioCallSid = formData.get("CallSid") as string;
      const twilioStatus = formData.get("CallStatus") as string;
      const twilioCallDuration = formData.get("CallDuration") as string;

      console.log("[VoiceScreening Callback] Twilio status update:", {
        callSid: twilioCallSid,
        status: twilioStatus,
        duration: twilioCallDuration,
      });

      // Map Twilio terminal statuses to our call statuses
      if (twilioStatus === "completed" || twilioStatus === "busy" || twilioStatus === "no-answer" || twilioStatus === "failed" || twilioStatus === "canceled") {
        const statusMap: Record<string, VoiceCallStatus> = {
          completed: VoiceCallStatus.COMPLETED,
          busy: VoiceCallStatus.BUSY,
          "no-answer": VoiceCallStatus.NO_ANSWER,
          failed: VoiceCallStatus.FAILED,
          canceled: VoiceCallStatus.CANCELLED,
        };

        // Find screening by externalCallId (Twilio CallSid), then derive tenant from the record.
        let resolved = twilioCallSid
          ? await resolveRecordTenantContextByWhere("voiceScreening", { externalCallId: twilioCallSid })
          : { record: null, tenantContext: null };
        let screening = resolved.record && resolved.tenantContext
          ? await (tenantPrisma.voiceScreening as any).withContext(resolved.tenantContext).findUnique({ where: { id: resolved.record.id } })
          : null;
        // Fallback to most recent RINGING (legacy)
        if (!screening) {
          resolved = await resolveRecordTenantContextByWhere("voiceScreening", { callStatus: "RINGING" });
          screening = resolved.record && resolved.tenantContext
            ? await (tenantPrisma.voiceScreening as any).withContext(resolved.tenantContext).findUnique({ where: { id: resolved.record.id } })
            : null;
        }

        if (screening && resolved.tenantContext) {
          const voiceScreeningRepo = (tenantPrisma.voiceScreening as any).withContext(resolved.tenantContext);
          await voiceScreeningRepo.update({
            where: { id: screening.id },
            data: {
              callStatus: statusMap[twilioStatus] || VoiceCallStatus.COMPLETED,
              callDuration: twilioCallDuration ? Number(twilioCallDuration) : null,
              completedAt: new Date(),
            },
          });
          console.log("[VoiceScreening Callback] Updated screening:", screening.id, "→", statusMap[twilioStatus]);

          // If call completed, try to fetch transcript from ElevenLabs immediately
          // Will also attempt to find conversationId if not already set
          // This may be too early; UI also has a "Fetch Transcript" button for manual retry
      if (twilioStatus === "completed") {
            captureMemoryWithContext(resolved.tenantContext, {
              userId: null,
              entityType: "voiceScreening",
              entityId: screening.id,
              action: "call_outcome",
              metadata: {
                memoryType: "candidate",
                summary: "Voice screening call completed",
                sourceModel: "voiceScreening",
                sourceId: screening.id,
                tags: [...deriveTagsFromEntityType("voiceScreening"), ...deriveTagsFromAction("screening_completed")],
                confidence: "auto",
                importance: "medium",
                conversationId: getConversationId(screening.candidateId, "voice"),
                channel: "voice",
                direction: "inbound",
                newValue: { candidateId: screening.candidateId },
              },
            });
            // Don't await — fire and forget so the callback response isn't delayed
            fetchElevenLabsConversation(screening, undefined, resolved.tenantContext).catch((e: any) =>
              console.error("[VoiceScreening Callback] Transcript fetch error:", e.message)
            );
          }
        } else {
          console.warn("[VoiceScreening Callback] No matching screening found for callSid:", twilioCallSid);
        }
      }

      return NextResponse.json({ success: true });
    }

    // ── Handle JSON callback (ElevenLabs post-call webhook or manual) ──
    const body = await req.json();
    const {
      screeningId,
      transcript,
      summary,
      score,
      scoreBreakdown,
      callDuration,
      callStatus,
      recordingUrl,
    } = body ?? {};

    if (!screeningId) {
      return NextResponse.json({ error: "screeningId is required" }, { status: 400 });
    }

    const { tenantContext } = await resolveRecordTenantContext("voiceScreening", screeningId);
    if (!tenantContext) {
      return NextResponse.json({ error: "Screening not found" }, { status: 404 });
    }
    const voiceScreeningRepo = (tenantPrisma.voiceScreening as any).withContext(tenantContext);

    const existing = await voiceScreeningRepo.findUnique({ where: { id: screeningId } });
    if (!existing) {
      return NextResponse.json({ error: "Screening not found" }, { status: 404 });
    }

    const updated = await voiceScreeningRepo.update({
      where: { id: screeningId },
      data: {
        transcript: transcript || null,
        aiSummary: summary || null,
        aiScore: score != null ? Number(score) : null,
        aiScoreBreakdown: scoreBreakdown || null,
        callDuration: callDuration != null ? Number(callDuration) : null,
        callStatus: (callStatus as VoiceCallStatus) || VoiceCallStatus.COMPLETED,
        completedAt: new Date(),
        recordingUrl: recordingUrl || null,
      },
    });

    const candidateId = existing.candidateId ?? tenantContext.candidateId ?? null;
    const insights = extractInsightsFromTranscript(transcript ?? "", summary ?? "", score != null ? Number(score) : null, scoreBreakdown ?? null);
    captureMemoryWithContext(tenantContext, {
      userId: null,
      entityType: "voiceScreening",
      entityId: screeningId,
      action: "screening_completed",
      metadata: {
        memoryType: "candidate",
        summary: `Voice screening completed${updated.aiScore != null ? ` (Score: ${updated.aiScore}/100)` : ""}`,
        details: updated.aiSummary ?? null,
        sourceModel: "voiceScreening",
        sourceId: screeningId,
        tags: [...deriveTagsFromEntityType("voiceScreening"), ...deriveTagsFromAction("screening_completed")],
        confidence: "auto",
        importance: updated.aiScore != null && updated.aiScore >= 80 ? "high" : "medium",
        conversationId: candidateId ? getConversationId(candidateId, "voice") : undefined,
        channel: "voice",
        direction: "inbound",
        extractedInsights: insights,
        newValue: candidateId ? { candidateId } : undefined,
      },
    });
    if (candidateId) {
      await captureConversationMemory({
        ctx: tenantContext,
        userId: null,
        candidateId,
        entityType: "voiceScreening",
        entityId: screeningId,
        action: "screening_completed",
        channel: "voice",
        sourceModel: "voiceScreening",
        sourceId: screeningId,
        text: [transcript, summary].filter(Boolean).join("\n\n"),
        summary: `Voice screening insights: ${insights.length} signal${insights.length === 1 ? "" : "s"} found`,
        direction: "inbound",
        insights,
        conversationId: getConversationId(candidateId, "voice"),
      });
    }

    return NextResponse.json({ success: true, id: updated.id });
  } catch (e: any) {
    console.error("Voice callback error:", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
