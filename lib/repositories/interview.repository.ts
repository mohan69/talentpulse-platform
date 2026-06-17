import { tenantPrisma } from "@/lib/tenant/prisma";

export const interviewRepository = tenantPrisma.interview;
