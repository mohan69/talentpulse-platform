import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

// GET saved searches for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searches = await tenantPrisma.savedSearch.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json(searches);
}

// POST create a new saved search
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, filters, source, resultCount } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const saved = await tenantPrisma.savedSearch.create({
    data: {
      userId: (session.user as any).id,
      name: name.trim(),
      filters: filters || {},
      source: source || "INTERNAL",
      resultCount: resultCount || null,
    },
  });

  return NextResponse.json(saved);
}

// DELETE a saved search
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await tenantPrisma.savedSearch.deleteMany({
    where: {
      id,
      userId: (session.user as any).id,
    },
  });

  return NextResponse.json({ success: true });
}
