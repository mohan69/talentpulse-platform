import { tenantPrisma } from "@/lib/tenant/prisma";

export const projectRepository = tenantPrisma.project;
