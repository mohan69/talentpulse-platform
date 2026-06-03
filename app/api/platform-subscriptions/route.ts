import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const recruiterId = searchParams.get("recruiterId");
  const platformId = searchParams.get("platformId");

  const where: any = {};
  if (user.role === "RECRUITER") {
    where.recruiterId = user.id;
  } else if (user.role === "ADMIN") {
    if (recruiterId) where.recruiterId = recruiterId;
    if (platformId) where.platformId = platformId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subs = await prisma.platformSubscription.findMany({
    where,
    include: { platform: true, recruiter: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(subs);
}

export async function POST(req: Request) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { platformId, recruiterId, username, password, planName, profileLimit, jobPostLimit, monthlyCost, validFrom, validUntil, notes } = body;
  if (!platformId || !recruiterId) return NextResponse.json({ error: "Platform and Recruiter are required" }, { status: 400 });
  try {
    const sub = await prisma.platformSubscription.create({
      data: {
        platformId,
        recruiterId,
        username: username || null,
        encryptedPass: password || null,
        planName: planName || null,
        profileLimit: profileLimit ? parseInt(profileLimit) : null,
        jobPostLimit: jobPostLimit ? parseInt(jobPostLimit) : null,
        monthlyCost: monthlyCost ? parseFloat(monthlyCost) : null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
      },
      include: { platform: true, recruiter: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(sub, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "This recruiter already has a subscription for this platform" }, { status: 409 });
    throw e;
  }
}
