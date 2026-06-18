import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";
import { captureMemory } from "@/lib/memory/service";
import { extractTags, deriveTagsFromEntityType, deriveTagsFromAction } from "@/lib/memory/tags";
import { captureConversationMemory, getConversationId } from "@/lib/conversation/capture";
import { extractInsightsFromNote } from "@/lib/conversation/note-insights";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "RECRUITER"] as string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const note = await tenantPrisma.note.create({
    data: {
      candidateId: params.id,
      authorId: user.id,
      body: body.body ?? "",
    },
    include: { author: { select: { id: true, name: true } } },
  });
  const tags = [...deriveTagsFromEntityType("note"), ...deriveTagsFromAction("note_added"), ...extractTags(body.body ?? "")];
  const conversationId = getConversationId(params.id, "note");
  const insights = extractInsightsFromNote(body.body ?? "");
  captureMemory({
    userId: user.id,
    entityType: "note",
    entityId: note.id,
    action: "note_added",
    metadata: {
      memoryType: "candidate",
      summary: `Note: ${(body.body ?? "").slice(0, 100)}${(body.body ?? "").length > 100 ? "..." : ""}`,
      details: body.body ?? null,
      sourceModel: "note",
      sourceId: note.id,
      tags,
      confidence: "auto",
      importance: "medium",
      conversationId,
      channel: "note",
      direction: "internal",
      extractedInsights: insights,
      newValue: { candidateId: params.id },
    },
  });
  await captureConversationMemory({
    userId: user.id,
    candidateId: params.id,
    entityType: "note",
    entityId: note.id,
    action: "note_added",
    channel: "note",
    sourceModel: "note",
    sourceId: note.id,
    text: body.body ?? "",
    summary: `Insights from note: ${insights.length} signal${insights.length === 1 ? "" : "s"} found`,
    direction: "internal",
    insights,
    conversationId,
  });
  return NextResponse.json(note);
}
