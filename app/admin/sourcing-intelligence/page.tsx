import { PageTitle } from "@/components/workspace/page-title";
import { tenantPrisma } from "@/lib/repositories";
import {
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

export default async function AdminSourcingIntelligence() {
  const [{ candidates, error }, jobs, leads] = await Promise.all([loadCandidates(), loadJobs(), loadLeads()]);

  return (
    <>
      <PageTitle
        title="Sourcing Intelligence"
        description="Requisition-centric candidate acquisition, import quality, public discovery, freshness and source conversion intelligence."
      />
      <SourcingIntelligenceClient candidates={candidates} jobs={jobs} leads={leads} discoveryConfig={discoveryConfig()} loadError={error} />
    </>
  );
}
