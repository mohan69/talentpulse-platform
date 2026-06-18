import { PageTitle } from "@/components/workspace/page-title";
import { IntelligenceWorkbenchClient } from "@/app/admin/intelligence/intelligence-workbench-client";

export const dynamic = "force-dynamic";

export default function AdminIntelligenceWorkbenchPage() {
  return (
    <>
      <PageTitle
        title="Intelligence Workbench"
        description="Screening, submission, recruiter productivity, and revenue intelligence in one CareerPaths demo view."
      />
      <IntelligenceWorkbenchClient />
    </>
  );
}

