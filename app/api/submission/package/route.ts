import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { submissionIntelligenceEnabled } from "@/lib/submission/flag";
import { buildSubmissionPackage } from "@/lib/submission/package";
import { captureSubmissionMemory } from "@/lib/submission/memory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!submissionIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const applicationId = url.searchParams.get("applicationId");
  const force = url.searchParams.get("force") === "true";
  if (!applicationId) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });

  const pkg = await buildSubmissionPackage(ctx, applicationId, { force });
  if (!pkg) {
    const forced = await buildSubmissionPackage(ctx, applicationId, { force: true });
    if (forced?.readiness.level === "caution" && !force) {
      return NextResponse.json({ error: "Candidate readiness is caution", readiness: forced.readiness, risks: forced.risks, canOverride: true }, { status: 409 });
    }
    return NextResponse.json({ error: "Submission package not found" }, { status: 404 });
  }

  await captureSubmissionMemory(ctx, {
    userId: user.id,
    applicationId,
    action: "summary_updated",
    summary: "Submission package viewed",
    tags: ["package-viewed"],
    newValue: { submissionStatus: pkg.submissionStatus },
  });
  return NextResponse.json(pkg);
}

