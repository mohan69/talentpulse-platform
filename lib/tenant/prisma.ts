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
  | "activityLog";

const scopeByModel: Record<RepositoryModel, TenantScope> = {
  candidate: "workspace",
  client: "organization",
  job: "workspace",
  application: "workspace",
  interview: "workspace",
  project: "workspace",
  note: "workspace",
  activityLog: "workspace",
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
};

export function getTenantWhere(ctx: TenantContext | null, where: any = {}, scope: TenantScope = "organization") {
  if (!ctx) return where;

  const scopedWhere = {
    ...where,
    organizationId: where?.organizationId ?? ctx.organizationId,
  };

  // Week 3 resolves workspace context but does not enforce workspace isolation yet.
  if (scope === "workspace" && where?.workspaceId) {
    scopedWhere.workspaceId = where.workspaceId;
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

  return {
    async findMany(args: any = {}) {
      const ctx = await resolveTenantContext();
      return delegate.findMany({ ...args, where: getTenantWhere(ctx, args.where, scope) });
    },

    async findFirst(args: any = {}) {
      const ctx = await resolveTenantContext();
      return delegate.findFirst({ ...args, where: getTenantWhere(ctx, args.where, scope) });
    },

    async findUnique(args: any) {
      const ctx = await resolveTenantContext();
      return delegate.findFirst({ ...args, where: getScopedUniqueWhere(args.where, ctx, scope) });
    },

    async count(args: any = {}) {
      const ctx = await resolveTenantContext();
      return delegate.count({ ...args, where: getTenantWhere(ctx, args.where, scope) });
    },

    async groupBy(args: any) {
      const ctx = await resolveTenantContext();
      return delegate.groupBy({ ...args, where: getTenantWhere(ctx, args.where, scope) });
    },

    async aggregate(args: any = {}) {
      const ctx = await resolveTenantContext();
      return delegate.aggregate({ ...args, where: getTenantWhere(ctx, args.where, scope) });
    },

    async create(args: any) {
      const ctx = await resolveTenantContext();
      return delegate.create({ ...args, data: getTenantCreateData(ctx, args.data, scope) });
    },

    async createMany(args: any) {
      const ctx = await resolveTenantContext();
      const data = Array.isArray(args.data)
        ? args.data.map((item: any) => getTenantCreateData(ctx, item, scope))
        : getTenantCreateData(ctx, args.data, scope);
      return delegate.createMany({ ...args, data });
    },

    async update(args: any) {
      const ctx = await resolveTenantContext();
      if (ctx) {
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

    async updateMany(args: any) {
      const ctx = await resolveTenantContext();
      return delegate.updateMany({ ...args, where: getTenantWhere(ctx, args.where, scope) });
    },

    async delete(args: any) {
      const ctx = await resolveTenantContext();
      if (ctx) {
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

    async deleteMany(args: any = {}) {
      const ctx = await resolveTenantContext();
      return delegate.deleteMany({ ...args, where: getTenantWhere(ctx, args.where, scope) });
    },

    async upsert(args: any) {
      const ctx = await resolveTenantContext();
      return delegate.upsert({
        ...args,
        create: getTenantCreateData(ctx, args.create, scope),
      });
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
} as Pick<typeof prisma, RepositoryModel>;
