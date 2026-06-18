import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { screeningIntelligenceEnabled } from "@/lib/screening/flag";
import { getScreeningWorkbench } from "@/lib/screening/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!screeningIntelligenceEnabled) return NextResponse.json({ enabled: false }, { status: 404 });

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const url = new URL(req.url);
  const applicationId = url.searchParams.get("applicationId");
  const candidateId = url.searchParams.get("candidateId");
  const jobId = url.searchParams.get("jobId");
  const summaryOnly = url.searchParams.get("summaryOnly") === "true";

  if (!applicationId && !(candidateId && jobId)) {
    return NextResponse.json({ error: "applicationId or candidateId + jobId required" }, { status: 400 });
  }

  const workbench = applicationId
    ? await getScreeningWorkbench(ctx, { applicationId })
    : await getScreeningWorkbench(ctx, { candidateId: candidateId!, jobId: jobId! });

  if (!workbench) return NextResponse.json({ error: "Screening application not found" }, { status: 404 });

  if (summaryOnly) {
    return NextResponse.json({
      applicationId: workbench.application.id,
      candidateId: workbench.application.candidateId,
      jobId: workbench.application.jobId,
      summary: workbench.summary,
      readiness: workbench.readiness,
      risks: workbench.risks,
    });
  }

  return NextResponse.json(workbench);
}

