import { COMPANY } from "@/lib/company";
import { tenantPrisma } from "@/lib/tenant/prisma";
import type { TenantContext } from "@/lib/tenant/context";
import { getScreeningWorkbench } from "@/lib/screening/service";
import { generateFitGapExplanation } from "@/lib/submission/fit-gap";
import { generateRiskDisclosure } from "@/lib/submission/risk-disclosure";
import { buildClientReadySummary } from "@/lib/submission/summary";
import { generateSubmissionEmailDraft } from "@/lib/submission/email-draft";
import { buildTrackerRow } from "@/lib/submission/tracker";
import { getSubmissionHistory, getSubmissionStatusFromHistory } from "@/lib/submission/memory";
import type { SubmissionPackage, SubmissionStatus } from "@/lib/submission/types";

async function getCompanyProfileForTenant(ctx: TenantContext) {
  const row = await (tenantPrisma.companyProfile as any).withContext(ctx).findUnique({ where: { id: "default" } }).catch(() => null);
  return {
    name: row?.name || COMPANY.name,
    brandName: row?.brandName || COMPANY.brandName,
    website: row?.website || COMPANY.website,
    email: row?.email || COMPANY.email,
    phone: row?.phone || COMPANY.phone,
    tagline: row?.tagline || COMPANY.tagline,
  };
}

function candidateSnapshot(candidate: any) {
  return {
    name: candidate?.name ?? "",
    email: candidate?.email ?? null,
    phone: candidate?.phone ?? null,
    currentCompany: candidate?.currentCompany ?? null,
    currentDesignation: candidate?.currentDesignation ?? null,
    totalExperience: candidate?.totalExperience ?? 0,
    relevantExperience: candidate?.relevantExperience ?? 0,
    skills: candidate?.skills ?? [],
    degree: candidate?.degree ?? null,
    institution: candidate?.institution ?? null,
    currentCity: candidate?.currentCity ?? null,
    preferredLocations: candidate?.preferredLocations ?? [],
    willRelocate: candidate?.willRelocate ?? false,
    currentCtc: candidate?.currentCtc ?? null,
    expectedCtc: candidate?.expectedCtc ?? null,
    noticePeriod: candidate?.noticePeriod ?? null,
    canBuyOut: candidate?.canBuyOut ?? false,
    resumeUrl: candidate?.resumeUrl ?? null,
    linkedinUrl: candidate?.linkedinUrl ?? null,
    aiSummary: candidate?.aiSummary ?? null,
    projects: candidate?.projects ?? [],
  };
}

function jobSnapshot(job: any) {
  const client = job?.client ?? {};
  return {
    title: job?.title ?? "",
    location: job?.location ?? "",
    experienceMin: job?.experienceMin ?? 0,
    experienceMax: job?.experienceMax ?? 0,
    skills: job?.skills ?? [],
    salaryMin: job?.salaryMin ?? null,
    salaryMax: job?.salaryMax ?? null,
    description: job?.description ?? "",
    clientName: client.name ?? "",
    clientContactName: client.contactName ?? null,
    clientContactEmail: client.contactEmail ?? null,
  };
}

function latestRecruiterNote(history: any[]) {
  return history.find((entry) => entry.metadata?.tags?.includes("recruiter-note"))?.metadata?.details ?? null;
}

export function assembleSubmissionPackage(params: {
  application: any;
  workbench: any;
  companyProfile: SubmissionPackage["companyProfile"];
  history?: any[];
  recruiterNote?: string | null;
  includeEmailDraft?: boolean;
  recruiterName?: string;
}): SubmissionPackage {
  const { application, workbench, companyProfile } = params;
  const history = params.history ?? [];
  const recruiterNote = params.recruiterNote ?? latestRecruiterNote(history);
  const enrichedApplication = {
    ...application,
    candidate: {
      ...(workbench.application?.candidate ?? {}),
      ...(application.candidate ?? {}),
    },
    job: {
      ...(workbench.application?.job ?? {}),
      ...(application.job ?? {}),
    },
    summary: workbench.summary,
  };
  const fitGapExplanation = generateFitGapExplanation(workbench.facts, workbench.readiness, workbench.summary);
  const riskDisclosure = generateRiskDisclosure(workbench.risks);
  const summary = buildClientReadySummary(enrichedApplication, workbench.facts, workbench.readiness, recruiterNote);
  const submissionStatus = getSubmissionStatusFromHistory(history, application.submittedAt) as SubmissionStatus;
  const basePackage: SubmissionPackage = {
    applicationId: application.id,
    candidateId: application.candidateId,
    jobId: application.jobId,
    clientId: application.job?.clientId ?? "",
    candidate: candidateSnapshot(enrichedApplication.candidate),
    job: jobSnapshot(enrichedApplication.job),
    facts: workbench.facts,
    gaps: workbench.gaps,
    risks: workbench.risks,
    readiness: workbench.readiness,
    summary,
    fitGapExplanation,
    riskDisclosure,
    emailDraft: null,
    trackerRow: {},
    submissionStatus,
    submittedAt: application.submittedAt ? new Date(application.submittedAt).toISOString() : null,
    clientFeedback: application.clientFeedback ?? null,
    recruiterNote,
    companyProfile,
    history,
  };
  const withTracker = { ...basePackage, trackerRow: buildTrackerRow(basePackage) };
  return {
    ...withTracker,
    emailDraft: params.includeEmailDraft ? generateSubmissionEmailDraft(withTracker, params.recruiterName) : null,
  };
}

export async function buildSubmissionPackage(
  ctx: TenantContext,
  applicationId: string,
  options?: { force?: boolean; includeEmailDraft?: boolean; recruiterName?: string },
) {
  const [application, workbench, companyProfile, history] = await Promise.all([
    (tenantPrisma.application as any).withContext(ctx).findUnique({
      where: { id: applicationId },
      include: {
        candidate: { include: { projects: true } },
        job: { include: { client: true } },
      },
    }),
    getScreeningWorkbench(ctx, { applicationId }),
    getCompanyProfileForTenant(ctx),
    getSubmissionHistory(ctx, applicationId).catch(() => []),
  ]);

  if (!application || !workbench) return null;
  if (workbench.readiness.level === "caution" && !options?.force) return null;

  return assembleSubmissionPackage({
    application,
    workbench,
    companyProfile,
    history,
    includeEmailDraft: options?.includeEmailDraft,
    recruiterName: options?.recruiterName,
  });
}

