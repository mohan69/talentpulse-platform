import { PageTitle } from "@/components/workspace/page-title";
import { CopilotClient } from "@/components/workspace/copilot-client";

export const dynamic = "force-dynamic";

export default function RecruiterCopilot() {
  return (
    <>
      <PageTitle
        title="Recruiter Copilot"
        description="AI-powered recruiting assistant — candidate summaries, JD analysis, match scoring, interview questions, outreach, and LinkedIn messages."
      />
      <div className="rounded-xl bg-card shadow-sm p-5">
        <CopilotClient />
      </div>
    </>
  );
}
