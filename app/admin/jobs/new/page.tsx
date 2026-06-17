import { PageTitle } from "@/components/workspace/page-title";
import { prisma } from "@/lib/db";
import { NewJobForm } from "./new-job-form";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const clients = await tenantPrisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const recruiters = await prisma.user.findMany({
    where: { role: "RECRUITER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageTitle title="Create New Job" description="Paste a JD to auto-fill with AI, or fill in manually." />
      <NewJobForm clients={clients} recruiters={recruiters} />
    </>
  );
}
