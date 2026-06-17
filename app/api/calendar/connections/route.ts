import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connections = await tenantPrisma.calendarConnection.findMany({
    where: { userId: user.id },
  });
  // Mask tokens
  const masked = connections.map((c: any) => ({ ...c, accessToken: c.accessToken ? "••••" : null, refreshToken: c.refreshToken ? "••••" : null }));
  return NextResponse.json(masked);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerSetting = await tenantPrisma.integrationSetting.findFirst({
    where: { provider: { in: ["GOOGLE_CALENDAR", "OUTLOOK_CALENDAR"] }, isActive: true },
  });
  if (!providerSetting) {
    return NextResponse.json({ error: "Calendar integration not configured. Please set up in Admin Settings → Integrations." }, { status: 400 });
  }

  const body = await req.json();
  const { provider, email } = body;
  if (!provider) return NextResponse.json({ error: "Provider required" }, { status: 400 });

  // Create placeholder connection — OAuth flow would populate tokens
  const connection = await tenantPrisma.calendarConnection.upsert({
    where: { userId_provider: { userId: user.id, provider } },
    create: { userId: user.id, provider, email: email || user.email },
    update: { email: email || user.email, updatedAt: new Date() },
  });
  return NextResponse.json(connection);
}
