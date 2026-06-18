import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { submissionIntelligenceEnabled } from "@/lib/submission/flag";
import { approveSubmission } from "@/lib/submission/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!submissionIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const applicationId = typeof body.applicationId === "string" ? body.applicationId : null;
  if (!applicationId) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });

  const ok = await approveSubmission(ctx, user, applicationId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ success: true });
}

