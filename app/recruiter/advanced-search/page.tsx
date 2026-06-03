import { PageTitle } from "@/components/workspace/page-title";
import { AdvancedSearchClient } from "@/components/workspace/advanced-search-client";

export const dynamic = "force-dynamic";

export default function RecruiterAdvancedSearchPage() {
  return (
    <>
      <PageTitle
        title="Search in Portal"
        description="Search across Internal Database, Naukri, and FoundIT to find the right candidates"
      />
      <AdvancedSearchClient role="recruiter" />
    </>
  );
}
