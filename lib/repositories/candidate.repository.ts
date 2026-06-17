import { tenantPrisma } from "@/lib/tenant/prisma";

export const candidateRepository = tenantPrisma.candidate;
