import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

/**
 * POST /api/voice-screening/fetch-transcript
 * Manually fetches conversation transcript from ElevenLabs for a screening.
 * Body: { screeningId: string }
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { screeningId } = await req.json();
  if (!screeningId) {
    return NextResponse.json({ error: "screeningId is required" }, { status: 400 });
  }

  const screening = await tenantPrisma.voiceScreening.findUnique({
    where: { id: screeningId },
  });
  if (!screening) {
    return NextResponse.json({ error: "Screening not found" }, { status: 404 });
  }
  if (!screening.conversationId) {
    return NextResponse.json({ error: "No ElevenLabs conversation ID associated with this screening. The call may not have connected to the AI agent." }, { status: 400 });
  }

  // Get ElevenLabs API key
  const elevenLabs = await tenantPrisma.integrationSetting.findUnique({
    where: { provider: "ELEVENLABS" },
  });
  if (!elevenLabs) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 400 });
  }
  const cfg = (elevenLabs.config as any) || {};
  const apiKey = cfg.apiKey;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs API key missing" }, { status: 400 });
  }

  try {
    console.log("[FetchTranscript] Fetching conversation:", screening.conversationId);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${screening.conversationId}`,
      {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[FetchTranscript] Failed:", res.status, errText);
      return NextResponse.json({ error: `ElevenLabs API error: ${res.status}`, details: errText }, { status: 502 });
    }

    const data = await res.json();

    // Build transcript text
    let transcriptText = "";
    if (data.transcript && Array.isArray(data.transcript)) {
      transcriptText = data.transcript
        .map((t: any) => `${t.role === "agent" ? "Agent" : "Candidate"}: ${t.message}`)
        .join("\n\n");
    }

    // Extract analysis
    const analysis = data.analysis || {};
    const summary = analysis.transcript_summary || analysis.summary || null;
    const evalResults = analysis.evaluation_criteria_results || {};
    const dataCollection = analysis.data_collection_results || {};

    // Build score breakdown
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

    const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;

    // Collected data
    let collectedInfo = "";
    if (dataCollection && typeof dataCollection === "object") {
      const entries = Object.entries(dataCollection);
      if (entries.length > 0) {
        collectedInfo = "\n\nCollected Information:\n" +
          entries.map(([k, v]: [string, any]) => `• ${k}: ${v?.value || v?.result || "N/A"}`).join("\n");
      }
    }

    const fullSummary = (summary || "") + collectedInfo;

    // Metadata
    const metadata = data.metadata || {};
    const callDurationSecs = metadata.call_duration_secs || null;

    // Update screening
    const updateData: any = {};
    if (transcriptText) updateData.transcript = transcriptText;
    if (fullSummary.trim()) updateData.aiSummary = fullSummary;
    if (overallScore !== null) updateData.aiScore = overallScore;
    if (Object.keys(scoreBreakdown).length > 0) updateData.aiScoreBreakdown = scoreBreakdown;
    if (callDurationSecs) updateData.callDuration = Math.round(callDurationSecs);

    if (Object.keys(updateData).length > 0) {
      const updated = await tenantPrisma.voiceScreening.update({
        where: { id: screeningId },
        data: updateData,
      });
      console.log("[FetchTranscript] Updated screening:", screeningId, Object.keys(updateData));
      return NextResponse.json({
        success: true,
        updated: Object.keys(updateData),
        screening: updated,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: "Conversation found but no transcript/analysis data available yet. ElevenLabs may still be processing. Try again in a few seconds.",
        rawStatus: data.status,
      });
    }
  } catch (e: any) {
    console.error("[FetchTranscript] Error:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
