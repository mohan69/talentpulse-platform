import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenant/context";
import { requireUser } from "@/lib/guards";
import { getMemory } from "@/lib/memory/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const result = await getMemory(ctx, {
    entityType: url.searchParams.get("entityType") ?? undefined,
    entityId: url.searchParams.get("entityId") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    memoryType: url.searchParams.get("memoryType") as any ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    tags: url.searchParams.get("tags")?.split(",").filter(Boolean),
    since: url.searchParams.get("since") ? new Date(url.searchParams.get("since")!) : undefined,
    until: url.searchParams.get("until") ? new Date(url.searchParams.get("until")!) : undefined,
    includeDismissed: url.searchParams.get("includeDismissed") === "true",
    limit: parseInt(url.searchParams.get("limit") ?? "50"),
    offset: parseInt(url.searchParams.get("offset") ?? "0"),
  });

  return NextResponse.json(result);
}
