import { prisma } from "@/lib/db";
import { tenantEnforcementMode, type TenantContext } from "@/lib/tenant/context";

type ProviderModel = "voiceScreening" | "whatsAppMessage" | "emailCampaign" | "emailLog" | "naukriImport";

const providerSelect = {
      id: true,
      organizationId: true,
      workspaceId: true,
      candidateId: true,
      applicationId: true,
      jobId: true,
};

export async function buildTenantContextFromRecord(record: any) {
  if (!record?.organizationId) {
    return { record: record ?? null, tenantContext: null };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: record.organizationId },
    select: { status: true },
  });

  if (!organization || organization.status !== "ACTIVE") {
    return { record, tenantContext: null };
  }

  const tenantContext: TenantContext = {
    organizationId: record.organizationId,
    workspaceId: record.workspaceId ?? null,
    userId: null,
    organizationRole: null,
    workspaceRole: null,
    userRole: "SYSTEM",
    clientId: null,
    candidateId: record.candidateId ?? null,
    permissions: [],
    enforcementMode: tenantEnforcementMode === "off" ? "off" : "enforce",
  };

  return { record, tenantContext };
}

export async function resolveRecordTenantContext(model: ProviderModel, recordId: string) {
  const delegate = (prisma as any)[model];
  const record = await delegate.findUnique({
    where: { id: recordId },
    select: providerSelect,
  });

  return buildTenantContextFromRecord(record);
}

export async function resolveRecordTenantContextByWhere(model: ProviderModel, where: Record<string, unknown>) {
  const delegate = (prisma as any)[model];
  const record = await delegate.findFirst({
    where,
    select: providerSelect,
  });

  return buildTenantContextFromRecord(record);
}
