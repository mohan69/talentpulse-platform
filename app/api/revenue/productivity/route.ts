import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { revenueIntelligenceEnabled } from "@/lib/revenue/flag";
import { computeRecruiterProductivity, computeAllRecruiterProductivity } from "@/lib/revenue/productivity";
import { captureRevenueMemory } from "@/lib/revenue/memory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!revenueIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });

  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const recruiterId = url.searchParams.get("recruiterId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const options: { from?: Date; to?: Date } = {};
  if (from) options.from = new Date(from);
  if (to) options.to = new Date(to);

  if (recruiterId) {
    if (user.role !== "ADMIN" && user.id !== recruiterId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await computeRecruiterProductivity(ctx, recruiterId, options);
    captureRevenueMemory(ctx, {
      userId: user.id,
      entityType: "user",
      entityId: recruiterId,
      action: "summary_updated",
      summary: "Productivity report viewed",
      tags: ["revenue", "productivity-viewed"],
      importance: "low",
    });
    return NextResponse.json(result);
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const results = await computeAllRecruiterProductivity(ctx, options);
  captureRevenueMemory(ctx, {
    userId: user.id,
    entityType: "organization",
    entityId: ctx.organizationId,
    action: "summary_updated",
    summary: "All-recruiter productivity report viewed",
    tags: ["revenue", "productivity-viewed"],
    importance: "low",
  });
  return NextResponse.json(results);
}
