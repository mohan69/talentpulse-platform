import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaign = await tenantPrisma.emailCampaign.findUnique({
    where: { id: params.id },
    include: { recipients: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await tenantPrisma.emailCampaign.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const campaign = await tenantPrisma.emailCampaign.update({
    where: { id: params.id },
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
      type: body.type,
      status: body.status,
    },
  });
  return NextResponse.json(campaign);
}
