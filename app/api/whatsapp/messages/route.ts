import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidateId");
  const where: any = {};
  if (candidateId) where.candidateId = candidateId;
  const messages = await prisma.whatsAppMessage.findMany({
    where,
    include: { candidate: { select: { id: true, name: true, phone: true } }, template: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(messages);
}
