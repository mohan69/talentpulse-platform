import { PageTitle } from "@/components/workspace/page-title";
import { tenantPrisma } from "@/lib/repositories";
import { SourcingIntelligenceClient, type SourcingCandidate } from "./sourcing-intelligence-client";

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
        applications: {
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: {
            id: true,
            stage: true,
            matchScore: true,
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

export default async function AdminSourcingIntelligence() {
  const { candidates, error } = await loadCandidates();

  return (
    <>
      <PageTitle
        title="Sourcing Intelligence"
        description="Search the Talent Repository with natural language and explainable deterministic matching."
      />
      <SourcingIntelligenceClient candidates={candidates} loadError={error} />
    </>
  );
}
