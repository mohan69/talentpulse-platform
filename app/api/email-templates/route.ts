import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await tenantPrisma.emailTemplate.findMany({ orderBy: { category: "asc" } });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || !(["ADMIN", "RECRUITER"] as string[]).includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const tpl = await tenantPrisma.emailTemplate.create({
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
      category: body.category ?? "general",
      variables: body.variables ?? [],
    },
  });
  return NextResponse.json(tpl);
}
