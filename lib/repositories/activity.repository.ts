import { tenantPrisma } from "@/lib/tenant/prisma";

export const activityRepository = tenantPrisma.activityLog;
