import { PageTitle } from "@/components/workspace/page-title";
import { ResumeIntelligenceClient } from "./resume-intelligence-client";

export const dynamic = "force-dynamic";

export default function ResumeIntelligencePage() {
  return (
    <>
      <PageTitle
        title="Resume Intelligence"
        description="Upload PDF or DOCX resumes, extract candidate facts, review confidence, and save into the Talent Repository."
      />
      <ResumeIntelligenceClient />
    </>
  );
}
