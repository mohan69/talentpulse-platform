import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageTitle } from "@/components/workspace/page-title";
import { StageBadge } from "@/components/workspace/stage-badge";
import { formatDate, formatCurrency } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CandidatePortal() {
  const session = await getServerSession(authOptions);
  const candidateId = session?.user?.candidateId;
  if (!candidateId) return <div className="p-6 rounded-xl bg-card shadow-sm"><h2 className="font-display text-xl font-semibold mb-2">Welcome!</h2><p className="text-muted-foreground">Your candidate profile is being set up. Please check back shortly.</p></div>;
  const [candidate, applications] = await Promise.all([
    prisma.candidate.findUnique({ where: { id: candidateId } }),
    prisma.application.findMany({ where: { candidateId }, orderBy: { updatedAt: "desc" }, include: { job: { include: { client: true } } } }),
  ]);

  return (
    <>
      <PageTitle title={`Welcome, ${candidate?.name?.split(" ")[0] ?? "Candidate"}`} description="Your applications and interview schedule." />
      <div className="rounded-xl bg-card shadow-sm p-5 mb-6">
        <h2 className="font-display text-lg font-semibold mb-4">My Applications</h2>
        <div className="space-y-2">
          {applications.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/40">
              <div>
                <div className="font-medium">{a.job.title}</div>
                <div className="text-xs text-muted-foreground">{a.job.client?.name} · Applied {formatDate(a.createdAt)}</div>
              </div>
              <StageBadge stage={a.stage} />
            </div>
          ))}
          {applications.length === 0 && <div className="text-sm text-muted-foreground">No applications yet.</div>}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/candidate-portal/profile" className="rounded-xl bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="font-display text-lg font-semibold mb-1">My Profile</div>
          <div className="text-sm text-muted-foreground">Update resume, skills & experience</div>
        </Link>
        <Link href="/candidate-portal/interviews" className="rounded-xl bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="font-display text-lg font-semibold mb-1">Upcoming Interviews</div>
          <div className="text-sm text-muted-foreground">View scheduled interviews</div>
        </Link>
      </div>
    </>
  );
}
