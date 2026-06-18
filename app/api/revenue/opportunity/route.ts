import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { revenueIntelligenceEnabled } from "@/lib/revenue/flag";
import { computeRevenueOpportunity } from "@/lib/revenue/opportunity";
import { captureRevenueMemory } from "@/lib/revenue/memory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!revenueIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });

  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const options: { from?: Date; to?: Date } = {};
  if (from) options.from = new Date(from);
  if (to) options.to = new Date(to);

  const result = await computeRevenueOpportunity(ctx, options);

  captureRevenueMemory(ctx, {
    userId: user.id,
    entityType: "organization",
    entityId: ctx.organizationId,
    action: "action_completed",
    summary: "Revenue opportunity analysis viewed",
    tags: ["revenue", "opportunity-analysis"],
    importance: "medium",
  });

  return NextResponse.json(result);
}
