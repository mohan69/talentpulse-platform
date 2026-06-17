import { tenantPrisma } from "@/lib/tenant/prisma";

export const noteRepository = tenantPrisma.note;
