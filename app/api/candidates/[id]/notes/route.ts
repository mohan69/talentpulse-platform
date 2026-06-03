import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(["ADMIN", "RECRUITER"] as string[]).includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const note = await prisma.note.create({
    data: {
      candidateId: params.id,
      authorId: user.id,
      body: body.body ?? "",
    },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(note);
}
