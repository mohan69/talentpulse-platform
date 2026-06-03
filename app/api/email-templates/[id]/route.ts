import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user || !(["ADMIN", "RECRUITER"] as string[]).includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const tpl = await prisma.emailTemplate.update({
    where: { id: params.id },
    data: { subject: body.subject, body: body.body, category: body.category },
  });
  return NextResponse.json(tpl);
}
