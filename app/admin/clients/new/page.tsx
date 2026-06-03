import { PageTitle } from "@/components/workspace/page-title";
import { NewClientForm } from "./new-client-form";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <>
      <PageTitle title="Add Client" description="Register a new enterprise customer." />
      <NewClientForm />
    </>
  );
}
