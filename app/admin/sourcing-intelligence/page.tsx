import { PageTitle } from "@/components/workspace/page-title";
import { prisma } from "@/lib/db";
import { tenantPrisma } from "@/lib/repositories";
import {
  type ManagedOpsActivity,
  type ManagedPortal,
  type ManagedRecruiter,
  SourcingIntelligenceClient,
  type CandidateLead,
  type DiscoveryConfig,
  type SourcingCandidate,
  type SourcingJob,
} from "./sourcing-intelligence-client";

export const dynamic = "force-dynamic";

async function loadCandidates(): Promise<{ candidates: SourcingCandidate[]; error?: string }> {
  try {
    const candidates = await tenantPrisma.candidate.findMany({
      orderBy: { updatedAt: "desc" },
      take: 150,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        currentCity: true,
        preferredLocations: true,
        willRelocate: true,
        currentCompany: true,
        currentDesignation: true,
        totalExperience: true,
        relevantExperience: true,
        currentCtc: true,
        expectedCtc: true,
        noticePeriod: true,
        skills: true,
        source: true,
        aiSummary: true,
        linkedinUrl: true,
        createdAt: true,
        updatedAt: true,
        emailLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, status: true },
        },
        applications: {
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: {
            id: true,
            stage: true,
            matchScore: true,
            submittedAt: true,
            job: {
              select: {
                id: true,
                title: true,
                location: true,
                skills: true,
                client: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return { candidates: candidates as SourcingCandidate[] };
  } catch (error) {
    return {
      candidates: [],
      error: error instanceof Error ? error.message : "Unable to load candidate repository.",
    };
  }
}

async function loadJobs(): Promise<SourcingJob[]> {
  try {
    const jobs = await tenantPrisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 40,
      select: {
        id: true,
        title: true,
        location: true,
        experienceMin: true,
        experienceMax: true,
        skills: true,
        salaryMin: true,
        salaryMax: true,
        openings: true,
        priority: true,
        status: true,
        aiParsedData: true,
        client: { select: { name: true } },
      },
    });
    return jobs as SourcingJob[];
  } catch {
    return [];
  }
}

async function loadLeads(): Promise<CandidateLead[]> {
  try {
    const leads = await tenantPrisma.prospect.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        currentCity: true,
        currentCompany: true,
        currentDesignation: true,
        skills: true,
        linkedinUrl: true,
        source: true,
        sourceDetail: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return leads as CandidateLead[];
  } catch {
    return [];
  }
}

function discoveryConfig(): DiscoveryConfig {
  return {
    githubEnabled: Boolean(process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN),
    googleEnabled: Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX),
  };
}

async function loadManagedOps(): Promise<{
  portals: ManagedPortal[];
  recruiters: ManagedRecruiter[];
  activities: ManagedOpsActivity[];
}> {
  try {
    const [platforms, recruiters, activities] = await Promise.all([
      prisma.recruitingPlatform.findMany({
        orderBy: { name: "asc" },
        include: {
          subscriptions: {
            include: { recruiter: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.user.findMany({
        where: { role: { in: ["ADMIN", "RECRUITER"] }, isActive: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      }),
      tenantPrisma.activityLog.findMany({
        where: { entityType: { in: ["managed_sourcing_assignment", "portal_search_log", "customer_delivery_package"] } },
        orderBy: { createdAt: "desc" },
        take: 150,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);
    return {
      portals: platforms as unknown as ManagedPortal[],
      recruiters: recruiters as unknown as ManagedRecruiter[],
      activities: activities as unknown as ManagedOpsActivity[],
    };
  } catch {
    return { portals: [], recruiters: [], activities: [] };
  }
}

export default async function AdminSourcingIntelligence() {
  const [{ candidates, error }, jobs, leads, managedOps] = await Promise.all([loadCandidates(), loadJobs(), loadLeads(), loadManagedOps()]);

  return (
    <>
      <PageTitle
        title="Sourcing Intelligence"
        description="Requisition-centric candidate acquisition, import quality, public discovery, freshness and source conversion intelligence."
      />
      <SourcingIntelligenceClient
        candidates={candidates}
        jobs={jobs}
        leads={leads}
        discoveryConfig={discoveryConfig()}
        managedPortals={managedOps.portals}
        recruiters={managedOps.recruiters}
        managedActivities={managedOps.activities}
        loadError={error}
      />
    </>
  );
}
