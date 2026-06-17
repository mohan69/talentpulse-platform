import { tenantPrisma } from "@/lib/tenant/prisma";

export const applicationRepository = tenantPrisma.application;
