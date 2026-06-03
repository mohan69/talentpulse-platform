import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const data: any = {};
  if (body.username !== undefined) data.username = body.username || null;
  if (body.password !== undefined) data.encryptedPass = body.password || null;
  if (body.planName !== undefined) data.planName = body.planName || null;
  if (body.profileLimit !== undefined) data.profileLimit = body.profileLimit ? parseInt(body.profileLimit) : null;
  if (body.jobPostLimit !== undefined) data.jobPostLimit = body.jobPostLimit ? parseInt(body.jobPostLimit) : null;
  if (body.profilesUsed !== undefined) data.profilesUsed = parseInt(body.profilesUsed) || 0;
  if (body.jobsPosted !== undefined) data.jobsPosted = parseInt(body.jobsPosted) || 0;
  if (body.monthlyCost !== undefined) data.monthlyCost = body.monthlyCost ? parseFloat(body.monthlyCost) : null;
  if (body.validFrom !== undefined) data.validFrom = body.validFrom ? new Date(body.validFrom) : null;
  if (body.validUntil !== undefined) data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.notes !== undefined) data.notes = body.notes || null;
  const sub = await prisma.platformSubscription.update({
    where: { id: params.id },
    data,
    include: { platform: true, recruiter: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(sub);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.platformSubscription.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
