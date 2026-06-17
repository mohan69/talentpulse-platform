import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as any).id as string,
    name: session.user.name as string,
    email: session.user.email as string,
    role: (session.user as any).role as UserRole,
    organizationId: (session.user as any).organizationId as string | null,
    workspaceId: (session.user as any).workspaceId as string | null,
    clientId: (session.user as any).clientId as string | null,
    candidateId: (session.user as any).candidateId as string | null,
  };
}

export async function requireRole(roles: UserRole[]) {
  const u = await requireUser();
  if (!u) return null;
  if (!roles.includes(u.role)) return null;
  return u;
}
