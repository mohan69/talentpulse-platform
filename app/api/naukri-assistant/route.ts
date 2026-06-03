import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";

export const dynamic = "force-dynamic";

// GET /api/naukri-assistant — list all imports for the current user
export async function GET() {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const imports = await prisma.naukriImport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      candidates: {
        include: { matchedJob: { select: { id: true, title: true, client: { select: { name: true } } } } },
        orderBy: { matchScore: { sort: "desc", nulls: "last" } },
      },
      user: { select: { name: true } },
    },
  });

  return NextResponse.json(imports);
}
