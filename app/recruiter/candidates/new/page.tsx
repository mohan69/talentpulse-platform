import { PageTitle } from "@/components/workspace/page-title";
import { NewCandidateForm } from "./new-candidate-form";

export const dynamic = "force-dynamic";

export default function NewCandidatePage() {
  return (<><PageTitle title="Add Candidate" description="Upload a resume and let AI parse structured data." /><NewCandidateForm /></>);
}
