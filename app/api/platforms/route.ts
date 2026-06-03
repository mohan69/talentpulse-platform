import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const platforms = await prisma.recruitingPlatform.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });
  return NextResponse.json(platforms);
}

export async function POST(req: Request) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { name, websiteUrl, description } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Platform name is required" }, { status: 400 });
  try {
    const platform = await prisma.recruitingPlatform.create({
      data: { name: name.trim(), websiteUrl: websiteUrl || null, description: description || null },
    });
    return NextResponse.json(platform, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Platform already exists" }, { status: 409 });
    throw e;
  }
}
