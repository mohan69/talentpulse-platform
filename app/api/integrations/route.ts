import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await tenantPrisma.integrationSetting.findMany({ orderBy: { provider: "asc" } });
  // Mask sensitive fields
  const masked = settings.map((s: any) => {
    const cfg = s.config as Record<string, any>;
    const maskedCfg: Record<string, any> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (typeof v === "string" && v.length > 4) {
        maskedCfg[k] = v.slice(0, 4) + "•".repeat(Math.min(v.length - 4, 20));
      } else {
        maskedCfg[k] = v;
      }
    }
    return { ...s, config: maskedCfg };
  });
  return NextResponse.json(masked);
}

export async function POST(req: Request) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { provider, config, isActive } = body ?? {};
  if (!provider || !config) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const setting = await tenantPrisma.integrationSetting.upsert({
    where: { provider },
    create: { provider, config, isActive: isActive ?? false },
    update: { config, isActive: isActive ?? undefined, updatedAt: new Date() },
  });
  return NextResponse.json(setting);
}
