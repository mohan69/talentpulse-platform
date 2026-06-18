import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { revenueIntelligenceEnabled } from "@/lib/revenue/flag";
import { getOwnerDashboard } from "@/lib/revenue/dashboard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!revenueIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });

  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const options: { from?: Date; to?: Date } = {};
  if (from) options.from = new Date(from);
  if (to) options.to = new Date(to);

  const userId = targetUserId && user.role === "ADMIN" ? targetUserId : user.id;

  const result = await getOwnerDashboard(ctx, userId, options);
  if (!result) return NextResponse.json({ error: "Dashboard not available" }, { status: 404 });

  return NextResponse.json(result);
}
