import { PageTitle } from "@/components/workspace/page-title";
import { AdminNewCandidateForm } from "./admin-new-candidate-form";

export const dynamic = "force-dynamic";

export default function AdminNewCandidatePage() {
  return (<><PageTitle title="Add Candidate" description="Upload a resume and let AI parse structured data." /><AdminNewCandidateForm /></>);
}
