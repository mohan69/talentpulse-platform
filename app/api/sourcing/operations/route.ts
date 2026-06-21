import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

const entityByType: Record<string, string> = {
  assignment: "managed_sourcing_assignment",
  search_log: "portal_search_log",
  delivery: "customer_delivery_package",
};

export async function GET() {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await tenantPrisma.activityLog.findMany({
    where: {
      entityType: { in: Object.values(entityByType) },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
    select: {
      id: true,
      entityType: true,
      entityId: true,
      action: true,
      metadata: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type = String(body.type ?? "");
  const entityType = entityByType[type];
  if (!entityType) return NextResponse.json({ error: "Invalid operation type" }, { status: 400 });

  const entityId = String(body.entityId || body.assignmentId || `${entityType}-${Date.now()}`);
  const action = type === "assignment"
    ? "managed_sourcing_assignment_saved"
    : type === "search_log"
      ? "portal_search_log_recorded"
      : "customer_delivery_package_prepared";

  const row = await tenantPrisma.activityLog.create({
    data: {
      userId: user.id,
      entityType,
      entityId,
      action,
      metadata: body.metadata ?? {},
    },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      action: true,
      metadata: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(row, { status: 201 });
}
