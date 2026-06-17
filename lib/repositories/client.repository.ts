import { tenantPrisma } from "@/lib/tenant/prisma";

export const clientRepository = tenantPrisma.client;
