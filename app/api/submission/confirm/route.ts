import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { submissionIntelligenceEnabled } from "@/lib/submission/flag";
import { confirmSubmission } from "@/lib/submission/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!submissionIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const applicationId = typeof body.applicationId === "string" ? body.applicationId : null;
  const action = body.action === "cancel" ? "cancel" : body.action === "confirm" ? "confirm" : null;
  if (!applicationId || !action) return NextResponse.json({ error: "applicationId and action are required" }, { status: 400 });

  const ok = await confirmSubmission(ctx, user.id, applicationId, action);
  if (!ok) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

