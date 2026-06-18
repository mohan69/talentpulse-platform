import { NextResponse } from "next/server";
import { getConversationTimeline } from "@/lib/conversation/service";
import type { ConversationChannel } from "@/lib/conversation/types";
import { resolveTenantContext } from "@/lib/tenant/context";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

const allowedChannels = new Set(["voice", "whatsapp", "email", "note", "screening"]);

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");
  const candidateId = url.searchParams.get("candidateId");
  const channels = (url.searchParams.get("channels") ?? "")
    .split(",")
    .map((channel) => channel.trim())
    .filter((channel): channel is ConversationChannel => allowedChannels.has(channel));
  const limit = Number(url.searchParams.get("limit") ?? 200);

  if (!conversationId && !candidateId) {
    return NextResponse.json({ error: "conversationId or candidateId required" }, { status: 400 });
  }

  const result = await getConversationTimeline(ctx, {
    conversationId,
    candidateId,
    channels,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200,
  });

  return NextResponse.json(result);
}
