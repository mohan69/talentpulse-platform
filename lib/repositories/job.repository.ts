import { tenantPrisma } from "@/lib/tenant/prisma";

export const jobRepository = tenantPrisma.job;
