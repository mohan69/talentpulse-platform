import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { screeningIntelligenceEnabled } from "@/lib/screening/flag";
import { confirmScreeningVerdict } from "@/lib/screening/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!screeningIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });

  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const applicationId = typeof body.applicationId === "string" ? body.applicationId : null;
  const verdict = typeof body.verdict === "string" ? body.verdict : null;
  const notes = typeof body.notes === "string" ? body.notes : null;

  if (!applicationId || !verdict) {
    return NextResponse.json({ error: "applicationId and verdict are required" }, { status: 400 });
  }

  const ok = await confirmScreeningVerdict(ctx, user.id, applicationId, verdict, notes);
  if (!ok) return NextResponse.json({ error: "Screening application not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

