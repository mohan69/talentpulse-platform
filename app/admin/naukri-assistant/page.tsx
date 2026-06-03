import { PageTitle } from "@/components/workspace/page-title";
import { NaukriAssistantClient } from "@/components/workspace/naukri-assistant-client";

export const dynamic = "force-dynamic";

export default function AdminNaukriAssistantPage() {
  return (
    <>
      <PageTitle
        title="Naukri Search Assistant"
        description="Import candidates from Naukri RESDEX, AI-match them to jobs, and add to your pipeline"
      />
      <NaukriAssistantClient role="admin" />
    </>
  );
}
