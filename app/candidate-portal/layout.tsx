import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const dynamic = "force-dynamic";

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "CANDIDATE") redirect("/dashboard");
  return (
    <WorkspaceShell role="CANDIDATE" userName={session.user.name ?? "Candidate"} userEmail={session.user.email ?? ""}>
      {children}
    </WorkspaceShell>
  );
}
