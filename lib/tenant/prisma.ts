import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { observeTenantIssue, resolveTenantContext, type TenantContext } from "@/lib/tenant/context";

type TenantScope = "organization" | "workspace";
type PrismaDelegate = Record<string, any>;
type RepositoryModel =
  | "candidate"
  | "client"
  | "job"
  | "application"
  | "interview"
  | "project"
  | "note"
  | "activityLog"
  | "offer"
  | "jobPosting"
  | "platformSubscription"
  | "integrationSetting"
  | "voiceScreening"
  | "whatsAppTemplate"
  | "whatsAppMessage"
  | "emailCampaign"
  | "campaignRecipient"
  | "emailTemplate"
  | "emailLog"
  | "calendarConnection"
  | "prospect"
  | "savedSearch"
  | "naukriImport"
  | "naukriCandidate"
  | "companyProfile";

const scopeByModel: Record<RepositoryModel, TenantScope> = {
  candidate: "workspace",
  client: "organization",
  job: "workspace",
  application: "workspace",
  interview: "workspace",
  project: "workspace",
  note: "workspace",
  activityLog: "workspace",
  offer: "workspace",
  jobPosting: "workspace",
  platformSubscription: "workspace",
  integrationSetting: "workspace",
  voiceScreening: "workspace",
  whatsAppTemplate: "workspace",
  whatsAppMessage: "workspace",
  emailCampaign: "workspace",
  campaignRecipient: "workspace",
  emailTemplate: "workspace",
  emailLog: "workspace",
  calendarConnection: "workspace",
  prospect: "workspace",
  savedSearch: "workspace",
  naukriImport: "workspace",
  naukriCandidate: "workspace",
  companyProfile: "organization",
};

const delegateByModel: Record<RepositoryModel, PrismaDelegate> = {
  candidate: prisma["candidate"],
  client: prisma["client"],
  job: prisma["job"],
  application: prisma["application"],
  interview: prisma["interview"],
  project: prisma["project"],
  note: prisma["note"],
  activityLog: prisma["activityLog"],
  offer: prisma["offer"],
  jobPosting: prisma["jobPosting"],
  platformSubscription: prisma["platformSubscription"],
  integrationSetting: prisma["integrationSetting"],
  voiceScreening: prisma["voiceScreening"],
  whatsAppTemplate: prisma["whatsAppTemplate"],
  whatsAppMessage: prisma["whatsAppMessage"],
  emailCampaign: prisma["emailCampaign"],
  campaignRecipient: prisma["campaignRecipient"],
  emailTemplate: prisma["emailTemplate"],
  emailLog: prisma["emailLog"],
  calendarConnection: prisma["calendarConnection"],
  prospect: prisma["prospect"],
  savedSearch: prisma["savedSearch"],
  naukriImport: prisma["naukriImport"],
  naukriCandidate: prisma["naukriCandidate"],
  companyProfile: prisma["companyProfile"],
};

function getPortalWhere(ctx: TenantContext | null, where: any = {}, model?: RepositoryModel) {
  if (!ctx?.portalContext || !model) return where;

  if (ctx.portalContext.type === "client" && ctx.portalContext.id) {
    if (model === "client") return { ...where, id: where?.id ?? ctx.portalContext.id };
    if (model === "job") return { ...where, clientId: where?.clientId ?? ctx.portalContext.id };
    if (["application", "interview", "offer"].includes(model)) {
      return { ...where, application: { ...(where?.application ?? {}), job: { ...(where?.application?.job ?? {}), clientId: ctx.portalContext.id } } };
    }
  }

  if (ctx.portalContext.type === "candidate" && ctx.portalContext.id) {
    if (model === "candidate") return { ...where, id: where?.id ?? ctx.portalContext.id };
    if (["application", "interview", "offer", "project", "note", "voiceScreening", "whatsAppMessage", "emailLog"].includes(model)) {
      return { ...where, candidateId: where?.candidateId ?? ctx.portalContext.id };
    }
  }

  return where;
}

export function getTenantWhere(
  ctx: TenantContext | null,
  where: any = {},
  scope: TenantScope = "organization",
  model?: RepositoryModel,
) {
  if (!ctx) return where;

  const portalWhere = getPortalWhere(ctx, where, model);
  const scopedWhere = {
    ...portalWhere,
    organizationId: portalWhere?.organizationId ?? ctx.organizationId,
  };

  // Week 3 resolves workspace context but does not enforce workspace isolation yet.
  if (scope === "workspace" && portalWhere?.workspaceId) {
    scopedWhere.workspaceId = portalWhere.workspaceId;
  }

  return scopedWhere;
}

export function getTenantCreateData(ctx: TenantContext | null, data: any = {}, scope: TenantScope = "organization") {
  if (!ctx) return data;

  return {
    ...data,
    organizationId: data?.organizationId ?? ctx.organizationId,
    workspaceId: data?.workspaceId ?? (scope === "workspace" ? ctx.workspaceId : data?.workspaceId),
  };
}

function getScopedUniqueWhere(where: any, ctx: TenantContext | null, scope: TenantScope) {
  if (!where || typeof where !== "object") return where;

  const normalizedWhere = { ...where };
  if (normalizedWhere.candidateId_jobId) {
    normalizedWhere.candidateId = normalizedWhere.candidateId_jobId.candidateId;
    normalizedWhere.jobId = normalizedWhere.candidateId_jobId.jobId;
    delete normalizedWhere.candidateId_jobId;
  }

  if (!ctx) return normalizedWhere;
  return getTenantWhere(ctx, normalizedWhere, scope);
}

function createRepository(model: RepositoryModel, delegate: PrismaDelegate) {
  const scope = scopeByModel[model];
  const scoped = (ctx: TenantContext | null) => ({
    findMany: (args: any = {}) => delegate.findMany({ ...args, where: getTenantWhere(ctx, args.where, scope, model) }),
    findFirst: (args: any = {}) => delegate.findFirst({ ...args, where: getTenantWhere(ctx, args.where, scope, model) }),
    findUnique: (args: any) => delegate.findFirst({ ...args, where: getScopedUniqueWhere(args.where, ctx, scope) }),
    count: (args: any = {}) => delegate.count({ ...args, where: getTenantWhere(ctx, args.where, scope, model) }),
    groupBy: (args: any) => delegate.groupBy({ ...args, where: getTenantWhere(ctx, args.where, scope, model) }),
    aggregate: (args: any = {}) => delegate.aggregate({ ...args, where: getTenantWhere(ctx, args.where, scope, model) }),
    create: (args: any) => delegate.create({ ...args, data: getTenantCreateData(ctx, args.data, scope) }),
    createMany: (args: any) => {
      const data = Array.isArray(args.data)
        ? args.data.map((item: any) => getTenantCreateData(ctx, item, scope))
        : getTenantCreateData(ctx, args.data, scope);
      return delegate.createMany({ ...args, data });
    },
    update: async (args: any) => {
      if (ctx && ctx.enforcementMode !== "off") {
        const existing = await delegate.findFirst({
          where: getScopedUniqueWhere(args.where, ctx, scope),
          select: { id: true },
        });
        if (!existing) {
          observeTenantIssue("Scoped update target was not found", { model, where: args.where });
          if (ctx.enforcementMode === "enforce") {
            throw new Prisma.PrismaClientKnownRequestError("Record not found in tenant scope", {
              code: "P2025",
              clientVersion: Prisma.prismaVersion.client,
            });
          }
        }
      }
      return delegate.update(args);
    },
    updateMany: (args: any) => delegate.updateMany({ ...args, where: getTenantWhere(ctx, args.where, scope, model) }),
    delete: async (args: any) => {
      if (ctx && ctx.enforcementMode !== "off") {
        const existing = await delegate.findFirst({
          where: getScopedUniqueWhere(args.where, ctx, scope),
          select: { id: true },
        });
        if (!existing) {
          observeTenantIssue("Scoped delete target was not found", { model, where: args.where });
          if (ctx.enforcementMode === "enforce") {
            throw new Prisma.PrismaClientKnownRequestError("Record not found in tenant scope", {
              code: "P2025",
              clientVersion: Prisma.prismaVersion.client,
            });
          }
        }
      }
      return delegate.delete(args);
    },
    deleteMany: (args: any = {}) => delegate.deleteMany({ ...args, where: getTenantWhere(ctx, args.where, scope, model) }),
    upsert: (args: any) =>
      delegate.upsert({
        ...args,
        create: getTenantCreateData(ctx, args.create, scope),
      }),
  });

  return {
    withContext(ctx: TenantContext | null) {
      return scoped(ctx);
    },

    async findMany(args: any = {}) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).findMany(args);
    },

    async findFirst(args: any = {}) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).findFirst(args);
    },

    async findUnique(args: any) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).findUnique(args);
    },

    async count(args: any = {}) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).count(args);
    },

    async groupBy(args: any) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).groupBy(args);
    },

    async aggregate(args: any = {}) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).aggregate(args);
    },

    async create(args: any) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).create(args);
    },

    async createMany(args: any) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).createMany(args);
    },

    async update(args: any) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).update(args);
    },

    async updateMany(args: any) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).updateMany(args);
    },

    async delete(args: any) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).delete(args);
    },

    async deleteMany(args: any = {}) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).deleteMany(args);
    },

    async upsert(args: any) {
      const ctx = await resolveTenantContext();
      return scoped(ctx).upsert(args);
    },
  };
}

export const tenantPrisma = {
  candidate: createRepository("candidate", delegateByModel.candidate),
  client: createRepository("client", delegateByModel.client),
  job: createRepository("job", delegateByModel.job),
  application: createRepository("application", delegateByModel.application),
  interview: createRepository("interview", delegateByModel.interview),
  project: createRepository("project", delegateByModel.project),
  note: createRepository("note", delegateByModel.note),
  activityLog: createRepository("activityLog", delegateByModel.activityLog),
  offer: createRepository("offer", delegateByModel.offer),
  jobPosting: createRepository("jobPosting", delegateByModel.jobPosting),
  platformSubscription: createRepository("platformSubscription", delegateByModel.platformSubscription),
  integrationSetting: createRepository("integrationSetting", delegateByModel.integrationSetting),
  voiceScreening: createRepository("voiceScreening", delegateByModel.voiceScreening),
  whatsAppTemplate: createRepository("whatsAppTemplate", delegateByModel.whatsAppTemplate),
  whatsAppMessage: createRepository("whatsAppMessage", delegateByModel.whatsAppMessage),
  emailCampaign: createRepository("emailCampaign", delegateByModel.emailCampaign),
  campaignRecipient: createRepository("campaignRecipient", delegateByModel.campaignRecipient),
  emailTemplate: createRepository("emailTemplate", delegateByModel.emailTemplate),
  emailLog: createRepository("emailLog", delegateByModel.emailLog),
  calendarConnection: createRepository("calendarConnection", delegateByModel.calendarConnection),
  prospect: createRepository("prospect", delegateByModel.prospect),
  savedSearch: createRepository("savedSearch", delegateByModel.savedSearch),
  naukriImport: createRepository("naukriImport", delegateByModel.naukriImport),
  naukriCandidate: createRepository("naukriCandidate", delegateByModel.naukriCandidate),
  companyProfile: createRepository("companyProfile", delegateByModel.companyProfile),
} as unknown as Pick<typeof prisma, RepositoryModel> & Record<RepositoryModel, ReturnType<typeof createRepository>>;
