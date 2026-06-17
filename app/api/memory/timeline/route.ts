import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenant/context";
import { requireUser } from "@/lib/guards";
import { getMemoryTimeline } from "@/lib/memory/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  const result = await getMemoryTimeline(ctx, entityType, entityId, {
    limit: parseInt(url.searchParams.get("limit") ?? "100"),
    includeDismissed: url.searchParams.get("includeDismissed") === "true",
  });

  return NextResponse.json(result);
}
