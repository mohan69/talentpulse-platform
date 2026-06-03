import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!((["ADMIN", "RECRUITER"] as string[]).includes(user.role)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { prospectIds, status, ownerId, tags, action } = body;

  if (!prospectIds?.length) return NextResponse.json({ error: "No prospects selected" }, { status: 400 });

  if (action === "delete") {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const result = await prisma.prospect.deleteMany({ where: { id: { in: prospectIds } } });
    return NextResponse.json({ deleted: result.count });
  }

  const data: any = {};
  if (status) data.status = status;
  if (ownerId !== undefined) data.ownerId = ownerId || null;
  if (tags) data.tags = tags;

  const result = await prisma.prospect.updateMany({
    where: { id: { in: prospectIds } },
    data,
  });

  await logActivity({ userId: user.id, entityType: "prospect", entityId: "bulk", action: "bulk_updated", metadata: {
    count: result.count,
    updates: data,
  } });

  return NextResponse.json({ updated: result.count });
}
