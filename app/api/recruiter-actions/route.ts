import { NextResponse } from "next/server";
import { PipelineStage } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

const stageByAction: Record<string, PipelineStage | null> = {
  "Screen Now": PipelineStage.AI_SCREENING,
  "Verify Compensation": null,
  "Verify Notice": null,
  "Request Updated Resume": null,
  "Submit To Client": PipelineStage.SUBMITTED,
  "Schedule Interview": PipelineStage.INTERVIEW_SCHEDULED,
  "Generate Submission Package": null,
  "Move To Offer Stage": PipelineStage.OFFER_EXTENDED,
  "Keep Warm": PipelineStage.ON_HOLD,
  "Archive": PipelineStage.REJECTED,
};

function actionKey(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const action = actionKey(body.action);
  if (!Object.prototype.hasOwnProperty.call(stageByAction, action)) {
    return NextResponse.json({ error: "Unsupported recruiter action" }, { status: 400 });
  }

  const applicationRepo = (tenantPrisma.application as any).withContext(ctx);
  const activityRepo = (tenantPrisma.activityLog as any).withContext(ctx);

  let application = null;
  if (body.applicationId) {
    application = await applicationRepo.findUnique({
      where: { id: String(body.applicationId) },
      select: { id: true, stage: true, candidateId: true, jobId: true },
    });
  } else if (body.candidateId) {
    application = await applicationRepo.findFirst({
      where: { candidateId: String(body.candidateId), stage: { notIn: [PipelineStage.JOINED, PipelineStage.REJECTED] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, stage: true, candidateId: true, jobId: true },
    });
  }

  const targetStage = stageByAction[action];
  let updated = null;
  if (application && targetStage && application.stage !== targetStage) {
    const data: any = { stage: targetStage };
    if (targetStage === PipelineStage.SUBMITTED) data.submittedAt = new Date();
    updated = await applicationRepo.update({ where: { id: application.id }, data });
  }

  await activityRepo.create({
    data: {
      userId: user.id,
      entityType: application ? "application" : "candidate",
      entityId: application?.id ?? String(body.candidateId ?? "unknown"),
      action: "recruiter_action",
      metadata: {
        action,
        previousStage: application?.stage ?? null,
        newStage: targetStage ?? application?.stage ?? null,
        candidateId: application?.candidateId ?? body.candidateId ?? null,
        jobId: application?.jobId ?? body.jobId ?? null,
        note: body.note ?? null,
        source: body.source ?? "phase4-action-center",
      },
    },
  });

  return NextResponse.json({
    ok: true,
    action,
    applicationId: application?.id ?? null,
    previousStage: application?.stage ?? null,
    newStage: updated?.stage ?? targetStage ?? application?.stage ?? null,
    message: application
      ? `${action} recorded${targetStage ? ` and stage moved to ${targetStage}` : ""}.`
      : `${action} recorded for candidate.`,
  });
}
