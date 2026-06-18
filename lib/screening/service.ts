import { tenantPrisma } from "@/lib/tenant/prisma";
import { captureMemoryWithContext, getMemoryTimeline } from "@/lib/memory/service";
import type { MemoryInput, MemoryQueryResult } from "@/lib/memory/types";
import type { TenantContext } from "@/lib/tenant/context";
import { computeScreeningFacts } from "@/lib/screening/facts";
import { computeMissingInfo } from "@/lib/screening/gaps";
import { computeJoiningRisks } from "@/lib/screening/risks";
import { computeReadinessScore } from "@/lib/screening/readiness";
import { generateNextQuestions } from "@/lib/screening/questions";
import { buildClientSummary } from "@/lib/screening/summary";
import type { ApplicationWithScreeningData, ScreeningWorkbench } from "@/lib/screening/types";

export type ScreeningLookup =
  | { applicationId: string; candidateId?: never; jobId?: never }
  | { applicationId?: never; candidateId: string; jobId: string };

const emptyMemory = (): MemoryQueryResult => ({ entries: [], total: 0, limit: 100, offset: 0 });

async function fetchApplication(ctx: TenantContext, lookup: ScreeningLookup): Promise<ApplicationWithScreeningData | null> {
  const applicationRepo = (tenantPrisma.application as any).withContext(ctx);
  const application =
    "applicationId" in lookup && lookup.applicationId
      ? await applicationRepo.findUnique({
          where: { id: lookup.applicationId },
          include: { candidate: true, job: true },
        })
      : await applicationRepo.findFirst({
          where: { candidateId: lookup.candidateId, jobId: lookup.jobId },
          include: { candidate: true, job: true },
        });

  if (!application) return null;

  const [notes, voiceScreenings, whatsappMessages, interviews, offers] = await Promise.all([
    (tenantPrisma.note as any).withContext(ctx).findMany({
      where: { candidateId: application.candidateId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    (tenantPrisma.voiceScreening as any).withContext(ctx).findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    (tenantPrisma.whatsAppMessage as any).withContext(ctx).findMany({
      where: { candidateId: application.candidateId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    (tenantPrisma.interview as any).withContext(ctx).findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: "desc" },
    }),
    (tenantPrisma.offer as any).withContext(ctx).findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    ...application,
    candidate: {
      ...(application.candidate ?? {}),
      notes,
      voiceScreenings,
      whatsappMessages,
      interviews,
      offers,
    },
    interviews,
    offers,
    voiceScreenings,
  };
}

export async function getScreeningWorkbench(ctx: TenantContext, lookup: ScreeningLookup): Promise<ScreeningWorkbench | null> {
  const application = await fetchApplication(ctx, lookup);
  if (!application) return null;

  const [memory, candidateMemory] = await Promise.all([
    getMemoryTimeline(ctx, "application", application.id, { limit: 100, includeDismissed: true }).catch(() => emptyMemory()),
    getMemoryTimeline(ctx, "candidate", application.candidateId, { limit: 100, includeDismissed: true }).catch(() => emptyMemory()),
  ]);

  const facts = computeScreeningFacts(application);
  const gaps = computeMissingInfo(application);
  const risks = computeJoiningRisks(application, memory, candidateMemory, facts);
  const readiness = computeReadinessScore(facts, risks);
  const questions = generateNextQuestions(facts, gaps, risks, application);
  const summary = buildClientSummary(application, facts, readiness, risks, gaps);

  return { application, facts, gaps, risks, readiness, questions, summary, memory, candidateMemory };
}

export async function confirmScreeningVerdict(
  ctx: TenantContext,
  userId: string,
  applicationId: string,
  verdict: string,
  notes?: string | null,
) {
  const application = await (tenantPrisma.application as any).withContext(ctx).findUnique({
    where: { id: applicationId },
    select: { id: true },
  });
  if (!application) return false;

  const input: MemoryInput = {
    userId,
    entityType: "application",
    entityId: applicationId,
    action: "screening_confirmed",
    metadata: {
      memoryType: "decision",
      summary: `Screening confirmed: ${verdict}`,
      details: notes ?? null,
      sourceModel: "application",
      sourceId: applicationId,
      tags: ["screening", "confirmed"],
      confidence: "confirmed",
      importance: "high",
      channel: "screening",
      newValue: { verdict },
    },
  };
  await captureMemoryWithContext(ctx, input);
  return true;
}

export async function dismissScreeningRisk(
  ctx: TenantContext,
  userId: string,
  applicationId: string,
  riskType: string,
  reason?: string | null,
) {
  const application = await (tenantPrisma.application as any).withContext(ctx).findUnique({
    where: { id: applicationId },
    select: { id: true },
  });
  if (!application) return false;

  const input: MemoryInput = {
    userId,
    entityType: "application",
    entityId: applicationId,
    action: "risk_dismissed",
    metadata: {
      memoryType: "decision",
      summary: `Risk dismissed: ${riskType}`,
      details: reason ?? null,
      sourceModel: "application",
      sourceId: applicationId,
      tags: ["screening", "risk-dismissed", riskType],
      confidence: "dismissed",
      importance: "medium",
      channel: "screening",
      newValue: { riskType },
    },
  };
  await captureMemoryWithContext(ctx, input);
  return true;
}

