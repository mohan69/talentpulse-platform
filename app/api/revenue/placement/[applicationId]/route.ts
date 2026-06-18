import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { revenueIntelligenceEnabled } from "@/lib/revenue/flag";
import { computePlacementProbability } from "@/lib/revenue/placement";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { applicationId: string } },
) {
  if (!revenueIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });

  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const result = await computePlacementProbability(ctx, params.applicationId);
  if (!result) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  return NextResponse.json(result);
}
