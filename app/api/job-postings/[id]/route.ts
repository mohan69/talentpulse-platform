import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { JobPostingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "RECRUITER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const data: any = {};

  if (body.status !== undefined) {
    // Validate enum
    const validStatuses: string[] = Object.values(JobPostingStatus);
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
    if (body.status === "POSTED") {
      data.postedAt = new Date();
      data.postedById = user.id;
    }
  }
  if (body.postUrl !== undefined) data.postUrl = body.postUrl || null;
  if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const posting = await prisma.jobPosting.update({
    where: { id: params.id },
    data,
    include: { platform: true, postedBy: { select: { id: true, name: true } } },
  });
  return NextResponse.json(posting);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "RECRUITER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.jobPosting.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
