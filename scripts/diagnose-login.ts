import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo123";
const DEMO_USERS = [
  "admin@talentpulse.demo",
  "recruiter1@talentpulse.demo",
  "recruiter2@talentpulse.demo",
] as const;

type CheckResult = {
  ok: boolean;
  details?: unknown;
  error?: string;
};

function describeDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return {
      configured: false,
      host: null,
      database: null,
      user: null,
      sslmode: null,
    };
  }

  try {
    const parsed = new URL(rawUrl);
    return {
      configured: true,
      host: parsed.host,
      database: parsed.pathname.replace(/^\//, "") || null,
      user: parsed.username || null,
      sslmode: parsed.searchParams.get("sslmode"),
    };
  } catch {
    return {
      configured: true,
      host: "unparseable",
      database: null,
      user: null,
      sslmode: null,
    };
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function safeCheck<T>(fn: () => Promise<T>): Promise<CheckResult> {
  try {
    const details = await fn();
    return { ok: true, details };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

async function diagnoseUser(email: string) {
  return safeCheck(async () => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        passwordHash: true,
        defaultOrganizationId: true,
        defaultWorkspaceId: true,
      },
    });

    if (!user) {
      return {
        email,
        exists: false,
        loginReady: false,
      };
    }

    const passwordHashExists = Boolean(user.passwordHash);
    const bcryptMatches = passwordHashExists
      ? await bcrypt.compare(DEMO_PASSWORD, user.passwordHash)
      : false;

    const organization = user.defaultOrganizationId
      ? await prisma.organization.findUnique({
          where: { id: user.defaultOrganizationId },
          select: { id: true, name: true, slug: true, status: true },
        })
      : null;

    const workspace = user.defaultWorkspaceId
      ? await prisma.workspace.findUnique({
          where: { id: user.defaultWorkspaceId },
          select: { id: true, name: true, slug: true, status: true, organizationId: true },
        })
      : null;

    const organizationMembership =
      user.defaultOrganizationId &&
      (await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: user.defaultOrganizationId,
            userId: user.id,
          },
        },
        select: {
          id: true,
          status: true,
          role: { select: { systemKey: true, name: true, scope: true } },
        },
      }));

    const workspaceMembership =
      user.defaultWorkspaceId &&
      (await prisma.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: user.defaultWorkspaceId,
            userId: user.id,
          },
        },
        select: {
          id: true,
          organizationId: true,
          status: true,
          role: { select: { systemKey: true, name: true, scope: true } },
        },
      }));

    const loginReady = Boolean(
      user.isActive &&
        bcryptMatches &&
        organization?.status === "ACTIVE" &&
        workspace?.status === "ACTIVE" &&
        organizationMembership &&
        organizationMembership.status === "ACTIVE" &&
        workspaceMembership &&
        workspaceMembership.status === "ACTIVE",
    );

    return {
      email: user.email,
      exists: true,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      passwordHashExists,
      passwordHashPrefix: user.passwordHash ? user.passwordHash.slice(0, 7) : null,
      bcryptCompareDemo123: bcryptMatches,
      defaultOrganizationId: user.defaultOrganizationId,
      defaultWorkspaceId: user.defaultWorkspaceId,
      organization: organization
        ? {
            exists: true,
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            status: organization.status,
          }
        : { exists: false },
      workspace: workspace
        ? {
            exists: true,
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            status: workspace.status,
            organizationId: workspace.organizationId,
          }
        : { exists: false },
      organizationMembership: organizationMembership
        ? {
            exists: true,
            status: organizationMembership.status,
            role: organizationMembership.role,
          }
        : { exists: false },
      workspaceMembership: workspaceMembership
        ? {
            exists: true,
            organizationId: workspaceMembership.organizationId,
            status: workspaceMembership.status,
            role: workspaceMembership.role,
          }
        : { exists: false },
      loginReady,
    };
  });
}

async function main() {
  const users = await Promise.all(DEMO_USERS.map((email) => diagnoseUser(email)));
  const allReady = users.every((result) => {
    const details = result.details as { loginReady?: boolean } | undefined;
    return result.ok && details?.loginReady === true;
  });

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        environment: {
          databaseUrl: describeDatabaseUrl(),
          nextauthUrl: process.env.NEXTAUTH_URL ?? null,
          tenantEnforcementMode: process.env.TENANT_ENFORCEMENT_MODE ?? null,
        },
        demoUsers: users,
        allDemoUsersLoginReady: allReady,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          fatal: true,
          error: getErrorMessage(error),
        },
        null,
        2,
      ),
    );
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
