import { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      organizationId?: string | null;
      workspaceId?: string | null;
      clientId?: string | null;
      candidateId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId?: string | null;
    workspaceId?: string | null;
    clientId?: string | null;
    candidateId?: string | null;
  }
}
