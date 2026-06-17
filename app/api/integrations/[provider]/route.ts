import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { provider: string } }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await tenantPrisma.integrationSetting.deleteMany({ where: { provider: params.provider } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: { provider: string } }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const existing = await tenantPrisma.integrationSetting.findUnique({ where: { provider: params.provider } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await tenantPrisma.integrationSetting.update({
    where: { provider: params.provider },
    data: { isActive: body.isActive ?? existing.isActive, lastTested: body.lastTested ? new Date() : undefined },
  });
  return NextResponse.json(updated);
}
