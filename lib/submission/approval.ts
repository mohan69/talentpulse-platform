import type { MemoryEntry } from "@/lib/memory/types";
import type { TenantContext } from "@/lib/tenant/context";
import { captureSubmissionMemory, getSubmissionHistory } from "@/lib/submission/memory";
import type { SubmissionApprovalConfig, SubmissionApprovalStatus } from "@/lib/submission/types";

export const DEFAULT_APPROVAL_CONFIG: SubmissionApprovalConfig = {
  requiresApproval: process.env.SUBMISSION_APPROVAL_REQUIRED === "true",
  approverRoles: ["ADMIN"],
  autoApproveLevels: ["ready_for_interview"],
};

function approvalEntry(history: MemoryEntry[], tag: string) {
  return history.find((entry) => entry.metadata?.tags?.includes("approval") && entry.metadata?.tags?.includes(tag));
}

export class SubmissionApprovalService {
  constructor(private readonly config: SubmissionApprovalConfig = DEFAULT_APPROVAL_CONFIG) {}

  requiresApproval(readinessLevel?: string) {
    if (!this.config.requiresApproval) return false;
    return !this.config.autoApproveLevels.includes(readinessLevel ?? "");
  }

  canApprove(role: string | null | undefined) {
    return this.config.approverRoles.includes(String(role ?? ""));
  }

  async createApprovalRequest(ctx: TenantContext, userId: string, applicationId: string) {
    const requestId = `approval_${applicationId}_${Date.now()}`;
    await captureSubmissionMemory(ctx, {
      userId,
      applicationId,
      action: "action_completed",
      summary: "Submission approval requested",
      tags: ["approval", "pending"],
      newValue: { submissionStatus: "pending_approval", requestId },
    });
    return requestId;
  }

  async approve(ctx: TenantContext, approverId: string, applicationId: string) {
    await captureSubmissionMemory(ctx, {
      userId: approverId,
      applicationId,
      action: "action_completed",
      summary: "Submission approval granted",
      tags: ["approval", "success"],
      newValue: { submissionStatus: "approved", approvedAt: new Date().toISOString() },
    });
    return true;
  }

  async reject(ctx: TenantContext, approverId: string, applicationId: string, reason: string) {
    await captureSubmissionMemory(ctx, {
      userId: approverId,
      applicationId,
      action: "action_completed",
      summary: "Submission approval rejected",
      details: reason,
      tags: ["approval", "rejection"],
      newValue: { submissionStatus: "not_submitted", rejectedAt: new Date().toISOString(), reason },
    });
    return true;
  }

  async getApprovalStatus(ctx: TenantContext, applicationId: string): Promise<SubmissionApprovalStatus> {
    const history = await getSubmissionHistory(ctx, applicationId);
    return getApprovalStatusFromHistory(history);
  }
}

export function getApprovalStatusFromHistory(history: MemoryEntry[]): SubmissionApprovalStatus {
  const approved = approvalEntry(history, "success");
  const rejected = approvalEntry(history, "rejection");
  const pending = approvalEntry(history, "pending");

  if (approved) {
    return {
      status: "approved",
      requestedAt: pending?.createdAt?.toISOString?.() ?? null,
      approvedAt: approved.createdAt.toISOString(),
      rejectedAt: null,
      approverId: approved.userId,
      reason: null,
    };
  }
  if (rejected) {
    return {
      status: "rejected",
      requestedAt: pending?.createdAt?.toISOString?.() ?? null,
      approvedAt: null,
      rejectedAt: rejected.createdAt.toISOString(),
      approverId: rejected.userId,
      reason: rejected.metadata?.details ?? null,
    };
  }
  if (pending) {
    return {
      status: "pending",
      requestedAt: pending.createdAt.toISOString(),
      approvedAt: null,
      rejectedAt: null,
      approverId: null,
      reason: null,
    };
  }
  return { status: "not_required", requestedAt: null, approvedAt: null, rejectedAt: null, approverId: null, reason: null };
}

