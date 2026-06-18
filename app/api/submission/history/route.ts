import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { submissionIntelligenceEnabled } from "@/lib/submission/flag";
import { getSubmissionHistory } from "@/lib/submission/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!submissionIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });
  const applicationId = new URL(req.url).searchParams.get("applicationId");
  if (!applicationId) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });

  return NextResponse.json(await getSubmissionHistory(ctx, applicationId));
}

