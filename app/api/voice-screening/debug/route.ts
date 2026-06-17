import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

/**
 * Debug endpoint to check ElevenLabs agent configuration.
 * Admin-only. GET /api/voice-screening/debug
 */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const elevenLabs = await tenantPrisma.integrationSetting.findUnique({
    where: { provider: "ELEVENLABS" },
  });

  if (!elevenLabs) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 400 });
  }

  const cfg = (elevenLabs.config as any) || {};
  const apiKey = cfg.apiKey;
  const agentId = cfg.agentId;

  if (!apiKey || !agentId) {
    return NextResponse.json({ error: "Missing API Key or Agent ID" }, { status: 400 });
  }

  try {
    // Get agent details
    const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "GET",
      headers: { "xi-api-key": apiKey },
    });
    const agentData = await agentRes.json();

    return NextResponse.json({
      agentId,
      agentStatus: agentRes.status,
      agent: agentData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
