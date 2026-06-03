import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.websiteUrl !== undefined) data.websiteUrl = body.websiteUrl || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  const platform = await prisma.recruitingPlatform.update({ where: { id: params.id }, data });
  return NextResponse.json(platform);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.recruitingPlatform.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
