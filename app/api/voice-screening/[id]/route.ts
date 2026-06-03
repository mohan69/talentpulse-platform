import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const screening = await prisma.voiceScreening.findUnique({
    where: { id: params.id },
    include: { candidate: true, application: { include: { job: true } } },
  });
  if (!screening) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(screening);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const screening = await prisma.voiceScreening.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(screening);
}
