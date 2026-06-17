import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = await tenantPrisma.emailCampaign.findMany({
    where: user.role === "ADMIN" ? {} : { createdById: user.id },
    include: { _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, type, subject, body: emailBody, recipients, aiGenerated } = body;
  if (!name || !subject || !emailBody) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const campaign = await tenantPrisma.emailCampaign.create({
    data: {
      name,
      type: type || "CANDIDATE",
      subject,
      body: emailBody,
      aiGenerated: aiGenerated || false,
      createdById: user.id,
      totalRecipients: recipients?.length || 0,
      recipients: recipients?.length ? {
        create: recipients.map((r: any) => ({
          email: r.email,
          name: r.name || null,
          candidateId: r.candidateId || null,
        })),
      } : undefined,
    },
    include: { recipients: true },
  });
  return NextResponse.json(campaign);
}
