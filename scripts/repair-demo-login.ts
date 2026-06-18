import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo123";
const DEFAULT_ORG_SLUG = "careerpaths";
const DEFAULT_WORKSPACE_SLUG = "default";

const demoUsers = [
  {
    email: "admin@talentpulse.demo",
    name: "Agency Admin",
    role: "ADMIN" as const,
    roleKey: "organization_admin",
    roleName: "Organization Admin",
    roleScope: "ORGANIZATION" as const,
  },
  {
    email: "recruiter1@talentpulse.demo",
    name: "Priya Sharma",
    role: "RECRUITER" as const,
    roleKey: "recruiter",
    roleName: "Recruiter",
    roleScope: "WORKSPACE" as const,
  },
  {
    email: "recruiter2@talentpulse.demo",
    name: "Arun Kumar",
    role: "RECRUITER" as const,
    roleKey: "recruiter",
    roleName: "Recruiter",
    roleScope: "WORKSPACE" as const,
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function ensureTenant() {
  const organization = await prisma.organization.upsert({
    where: { slug: DEFAULT_ORG_SLUG },
    update: { status: "ACTIVE" },
    create: {
      name: "CareerPaths",
      slug: DEFAULT_ORG_SLUG,
      type: "AGENCY",
      status: "ACTIVE",
      defaultCurrency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: DEFAULT_WORKSPACE_SLUG,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      organizationId: organization.id,
      name: "Default Workspace",
      slug: DEFAULT_WORKSPACE_SLUG,
      type: "DEFAULT",
      status: "ACTIVE",
    },
  });

  return { organization, workspace };
}

async function ensureRole(
  organizationId: string,
  systemKey: string,
  name: string,
  scope: "ORGANIZATION" | "WORKSPACE",
) {
  return prisma.role.upsert({
    where: {
      organizationId_systemKey: {
        organizationId,
        systemKey,
      },
    },
    update: {
      name,
      scope,
      isSystemRole: true,
    },
    create: {
      organizationId,
      systemKey,
      name,
      scope,
      isSystemRole: true,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { organization, workspace } = await ensureTenant();

  const repairedUsers = [];

  for (const demoUser of demoUsers) {
    const role = await ensureRole(
      organization.id,
      demoUser.roleKey,
      demoUser.roleName,
      demoUser.roleScope,
    );

    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        name: demoUser.name,
        role: demoUser.role,
        passwordHash,
        isActive: true,
        defaultOrganizationId: organization.id,
        defaultWorkspaceId: workspace.id,
      },
      create: {
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        passwordHash,
        isActive: true,
        defaultOrganizationId: organization.id,
        defaultWorkspaceId: workspace.id,
      },
    });

    await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      update: {
        roleId: role.id,
        status: "ACTIVE",
      },
      create: {
        organizationId: organization.id,
        userId: user.id,
        roleId: role.id,
        status: "ACTIVE",
      },
    });

    await prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: {
        organizationId: organization.id,
        roleId: role.id,
        status: "ACTIVE",
      },
      create: {
        organizationId: organization.id,
        workspaceId: workspace.id,
        userId: user.id,
        roleId: role.id,
        status: "ACTIVE",
      },
    });

    repairedUsers.push({
      email: user.email,
      id: user.id,
      role: user.role,
      isActive: user.isActive,
      defaultOrganizationId: organization.id,
      defaultWorkspaceId: workspace.id,
      roleKey: role.systemKey,
    });
  }

  console.log(
    JSON.stringify(
      {
        repairedAt: new Date().toISOString(),
        organization: {
          id: organization.id,
          slug: organization.slug,
          status: organization.status,
        },
        workspace: {
          id: workspace.id,
          slug: workspace.slug,
          status: workspace.status,
        },
        demoUsers: repairedUsers,
        idempotent: true,
        deletedData: false,
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
          repairedAt: new Date().toISOString(),
          fatal: true,
          error: getErrorMessage(error),
          hint:
            "Confirm tenant foundation migrations are applied before running this repair script.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
