import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body ?? {};
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const emailLower = String(email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        passwordHash,
        name,
        role: "CANDIDATE",
      },
    });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (e: any) {
    console.error("signup error", e);
    return NextResponse.json({ error: e?.message ?? "Signup failed" }, { status: 500 });
  }
}
