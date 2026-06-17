import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";
import { captureMemory } from "@/lib/memory/service";
import { extractTags, deriveTagsFromEntityType, deriveTagsFromAction } from "@/lib/memory/tags";

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
    },
  });
  return NextResponse.json(note);
}
