import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const where: any = {};
  if (jobId) where.jobId = jobId;

  const postings = await tenantPrisma.jobPosting.findMany({
    where,
    include: {
      platform: true,
      postedBy: { select: { id: true, name: true } },
    },
    orderBy: { platform: { name: "asc" } },
  });
  return NextResponse.json(postings);
}

// Manually add a posting for a specific platform
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "RECRUITER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { jobId, platformId } = body;
  if (!jobId || !platformId) return NextResponse.json({ error: "jobId and platformId required" }, { status: 400 });
  try {
    const posting = await tenantPrisma.jobPosting.create({
      data: { jobId, platformId, status: "PENDING" },
      include: { platform: true },
    });
    return NextResponse.json(posting, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Already exists" }, { status: 409 });
    throw e;
  }
}
