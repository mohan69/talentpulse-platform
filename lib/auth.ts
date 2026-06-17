import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user || !user.isActive) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.defaultOrganizationId,
          workspaceId: user.defaultWorkspaceId,
          clientId: user.clientId,
          candidateId: user.candidateId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.workspaceId = (user as any).workspaceId;
        token.clientId = (user as any).clientId;
        token.candidateId = (user as any).candidateId;
      }
      if (token.id && !token.organizationId) {
        const membership = await prisma.organizationMembership.findFirst({
          where: { userId: token.id as string, status: "ACTIVE", organization: { status: "ACTIVE" } },
          include: { organization: { select: { id: true } } },
          orderBy: { joinedAt: "asc" },
        });
        if (membership) {
          token.organizationId = membership.organizationId;
          const workspaceMembership = await prisma.workspaceMembership.findFirst({
            where: {
              userId: token.id as string,
              organizationId: membership.organizationId,
              status: "ACTIVE",
              workspace: { status: "ACTIVE" },
            },
            orderBy: { createdAt: "asc" },
          });
          token.workspaceId = workspaceMembership?.workspaceId ?? null;
        } else {
          console.warn(`[tenant-auth] User ${token.id} has no active organization membership`);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).workspaceId = token.workspaceId;
        (session.user as any).clientId = token.clientId;
        (session.user as any).candidateId = token.candidateId;
      }
      return session;
    },
  },
};
