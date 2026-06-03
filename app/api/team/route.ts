import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      clientId: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { email, password, name, role, clientId, phone } = body ?? {};
  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const emailLower = String(email).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: { email: emailLower, passwordHash, name, role, phone: phone ?? null, clientId: clientId ?? null },
  });
  return NextResponse.json(newUser);
}
