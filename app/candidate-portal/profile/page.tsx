import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { CandidateProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function CandidateProfile() {
  const session = await getServerSession(authOptions);
  const candidateId = session?.user?.candidateId;
  if (!candidateId) return <div className="p-6 rounded-xl bg-card"><p>Profile being set up.</p></div>;
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, include: { projects: true } });
  if (!candidate) return <div>Not found</div>;
  return (
    <>
      <PageTitle title="My Profile" description="Your personal and professional details." />
      <CandidateProfileClient candidate={JSON.parse(JSON.stringify(candidate))} />
    </>
  );
}
