import { tenantPrisma } from "@/lib/tenant/prisma";
import type { TenantContext } from "@/lib/tenant/context";
import { buildSubmissionPackage } from "@/lib/submission/package";
import { SubmissionApprovalService } from "@/lib/submission/approval";
import { captureSubmissionMemory, getSubmissionHistory } from "@/lib/submission/memory";
import { generateSubmissionEmailDraft } from "@/lib/submission/email-draft";

const approvalService = new SubmissionApprovalService();

export async function getSubmissionPackage(ctx: TenantContext, applicationId: string, force = false) {
  return buildSubmissionPackage(ctx, applicationId, { force });
}

export async function submitCandidate(ctx: TenantContext, user: { id: string; name?: string | null }, applicationId: string, force = false) {
  const pkg = await buildSubmissionPackage(ctx, applicationId, { force, includeEmailDraft: true, recruiterName: user.name ?? "Recruiter" });
  if (!pkg) return { status: "blocked" as const, package: null };

  if (pkg.readiness.level === "caution" && !force) return { status: "blocked" as const, package: pkg };

  if (force && pkg.readiness.level === "caution") {
    await captureSubmissionMemory(ctx, {
      userId: user.id,
      applicationId,
      action: "screening_confirmed",
      summary: "Submission overrode caution readiness",
      tags: ["override-caution"],
      importance: "high",
      newValue: { readinessLevel: pkg.readiness.level },
    });
  }

  if (approvalService.requiresApproval(pkg.readiness.level)) {
    await approvalService.createApprovalRequest(ctx, user.id, applicationId);
    return { status: "pending_approval" as const, package: { ...pkg, submissionStatus: "pending_approval" as const } };
  }

  await captureSubmissionMemory(ctx, {
    userId: user.id,
    applicationId,
    action: "stage_changed",
    summary: "Submission draft created for recruiter review",
    tags: ["submission-initiated", "draft"],
    newValue: { submissionStatus: "draft" },
  });
  return { status: "draft" as const, package: { ...pkg, submissionStatus: "draft" as const } };
}

export async function generateEmailDraftForSubmission(ctx: TenantContext, user: { id: string; name?: string | null }, applicationId: string) {
  const pkg = await buildSubmissionPackage(ctx, applicationId, { force: true });
  if (!pkg) return null;
  const draft = generateSubmissionEmailDraft(pkg, user.name ?? "Recruiter");
  await captureSubmissionMemory(ctx, {
    userId: user.id,
    applicationId,
    action: "summary_updated",
    summary: "Submission email draft generated",
    details: draft.subject,
    tags: ["draft-generated"],
    newValue: { draft },
  });
  return draft;
}

export async function approveSubmission(ctx: TenantContext, user: { id: string; role: string }, applicationId: string) {
  if (!approvalService.canApprove(user.role)) return false;
  return approvalService.approve(ctx, user.id, applicationId);
}

export async function rejectSubmission(ctx: TenantContext, user: { id: string; role: string }, applicationId: string, reason: string) {
  if (!approvalService.canApprove(user.role)) return false;
  return approvalService.reject(ctx, user.id, applicationId, reason);
}

export async function confirmSubmission(ctx: TenantContext, userId: string, applicationId: string, action: "confirm" | "cancel") {
  const repo = (tenantPrisma.application as any).withContext(ctx);
  const existing = await repo.findUnique({ where: { id: applicationId }, select: { id: true, stage: true, submittedAt: true } });
  if (!existing) return false;

  if (action === "confirm") {
    await repo.update({ where: { id: applicationId }, data: { stage: "SUBMITTED", submittedAt: new Date() } });
    await captureSubmissionMemory(ctx, {
      userId,
      applicationId,
      action: "stage_changed",
      summary: "Candidate submitted to client",
      tags: ["submitted", "success"],
      memoryType: "outcome",
      importance: "high",
      previousValue: { stage: existing.stage, submittedAt: existing.submittedAt },
      newValue: { submissionStatus: "submitted", stage: "SUBMITTED" },
    });
    return true;
  }

  await captureSubmissionMemory(ctx, {
    userId,
    applicationId,
    action: "stage_changed",
    summary: "Submission cancelled by recruiter",
    tags: ["cancelled"],
    previousValue: { stage: existing.stage, submittedAt: existing.submittedAt },
    newValue: { submissionStatus: "not_submitted" },
  });
  return true;
}

export { getSubmissionHistory };

