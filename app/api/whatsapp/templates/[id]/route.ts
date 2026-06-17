import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const template = await tenantPrisma.whatsAppTemplate.update({ where: { id: params.id }, data: body });
  return NextResponse.json(template);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await tenantPrisma.whatsAppTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
