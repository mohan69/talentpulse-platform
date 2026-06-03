import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const dynamic = "force-dynamic";

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "RECRUITER" && role !== "ADMIN") redirect("/dashboard");
  const displayRole = role === "ADMIN" ? "ADMIN" : "RECRUITER";
  return (
    <WorkspaceShell role={displayRole} userName={session.user.name ?? "Recruiter"} userEmail={session.user.email ?? ""}>
      {children}
    </WorkspaceShell>
  );
}
