import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await tenantPrisma.whatsAppTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, body: templateBody, category, variables } = body;
  if (!name || !templateBody || !category) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const template = await tenantPrisma.whatsAppTemplate.create({
    data: { name, body: templateBody, category, variables: variables || [] },
  });
  return NextResponse.json(template);
}
