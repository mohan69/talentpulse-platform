import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      candidateId: params.id,
      projectName: body.projectName ?? "",
      role: body.role ?? "",
      skillsUsed: body.skillsUsed ?? [],
      description: body.description ?? "",
      contribution: body.contribution ?? "",
    },
  });
  return NextResponse.json(project);
}
