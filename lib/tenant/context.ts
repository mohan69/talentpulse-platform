import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type TenantEnforcementMode = "observe" | "enforce";

export type TenantContext = {
  organizationId: string;
  workspaceId: string | null;
  userId: string | null;
  organizationRole: string | null;
  workspaceRole: string | null;
  userRole: string | null;
  clientId: string | null;
  candidateId: string | null;
  permissions: string[];
  enforcementMode: TenantEnforcementMode;
};

export const tenantEnforcementMode: TenantEnforcementMode =
  process.env.TENANT_ENFORCEMENT_MODE === "enforce" ? "enforce" : "observe";

function logObserve(message: string, metadata?: Record<string, unknown>) {
  if (tenantEnforcementMode === "observe") {
    console.warn(`[tenant-observe] ${message}`, metadata ?? {});
  }
}

export function observeTenantIssue(message: string, metadata?: Record<string, unknown>) {
  logObserve(message, metadata);
}

async function resolveDefaultTenant(): Promise<TenantContext | null> {
  try {
    const organization = await prisma.organization.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!organization) return null;

    const workspace = await prisma.workspace.findFirst({
      where: { organizationId: organization.id, status: "ACTIVE" },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    return {
      organizationId: organization.id,
      workspaceId: workspace?.id ?? null,
      userId: null,
      organizationRole: null,
      workspaceRole: null,
      userRole: null,
      clientId: null,
      candidateId: null,
      permissions: [],
      enforcementMode: tenantEnforcementMode,
    };
  } catch (error) {
    logObserve("Default tenant resolution failed", { error: String(error) });
    return null;
  }
}

export async function resolveTenantContext(): Promise<TenantContext | null> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return resolveDefaultTenant();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        clientId: true,
        candidateId: true,
        defaultOrganizationId: true,
        defaultWorkspaceId: true,
        organizationMemberships: {
          where: { status: "ACTIVE" },
          include: { role: { select: { systemKey: true } } },
          orderBy: { joinedAt: "asc" },
        },
        workspaceMemberships: {
          where: { status: "ACTIVE" },
          include: { role: { select: { systemKey: true } }, workspace: { select: { status: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      logObserve("Tenant context requested for missing user", { userId });
      return resolveDefaultTenant();
    }

    const membership =
      user.organizationMemberships.find((item) => item.organizationId === user.defaultOrganizationId) ??
      user.organizationMemberships[0];

    const organizationId = user.defaultOrganizationId ?? membership?.organizationId;

    if (!organizationId) {
      logObserve("User has no active organization context", { userId });
      return resolveDefaultTenant();
    }

    const organization = await prisma.organization.findFirst({
      where: { id: organizationId, status: "ACTIVE" },
      select: { id: true },
    });

    if (!organization) {
      logObserve("Resolved organization is not active", { userId, organizationId });
      return resolveDefaultTenant();
    }

    const workspaceMembership =
      user.workspaceMemberships.find(
        (item) =>
          item.organizationId === organizationId &&
          item.workspaceId === user.defaultWorkspaceId &&
          item.workspace.status === "ACTIVE",
      ) ??
      user.workspaceMemberships.find(
        (item) => item.organizationId === organizationId && item.workspace.status === "ACTIVE",
      );

    let workspaceId = user.defaultWorkspaceId ?? workspaceMembership?.workspaceId ?? null;

    if (!workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: { organizationId, status: "ACTIVE" },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      workspaceId = workspace?.id ?? null;
    }

    return {
      organizationId,
      workspaceId,
      userId: user.id,
      organizationRole: membership?.role.systemKey ?? null,
      workspaceRole: workspaceMembership?.role.systemKey ?? null,
      userRole: user.role,
      clientId: user.clientId,
      candidateId: user.candidateId,
      permissions: [],
      enforcementMode: tenantEnforcementMode,
    };
  } catch (error) {
    logObserve("Tenant context resolution failed", { error: String(error) });
    return resolveDefaultTenant();
  }
}

