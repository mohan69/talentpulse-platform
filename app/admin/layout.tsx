import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "ADMIN") redirect("/dashboard");
  return (
    <WorkspaceShell role="ADMIN" userName={session.user.name ?? "Admin"} userEmail={session.user.email ?? ""}>
      {children}
    </WorkspaceShell>
  );
}
