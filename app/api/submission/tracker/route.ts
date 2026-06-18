import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { submissionIntelligenceEnabled } from "@/lib/submission/flag";
import { buildSubmissionPackage } from "@/lib/submission/package";
import { trackerRowToCsv } from "@/lib/submission/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!submissionIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });
  const url = new URL(req.url);
  const applicationId = url.searchParams.get("applicationId");
  const format = url.searchParams.get("format") ?? "json";
  if (!applicationId) return NextResponse.json({ error: "applicationId is required" }, { status: 400 });

  const pkg = await buildSubmissionPackage(ctx, applicationId, { force: true });
  if (!pkg) return NextResponse.json({ error: "Submission package not found" }, { status: 404 });

  if (format === "csv") {
    return new NextResponse(trackerRowToCsv(pkg.trackerRow), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submission-${applicationId}.csv"`,
      },
    });
  }
  return NextResponse.json(pkg.trackerRow);
}

