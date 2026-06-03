import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data: Record<string, any> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.role !== undefined) data.role = body.role;
    if (body.clientId !== undefined) data.clientId = body.clientId || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.password && body.password.trim()) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    // Handle email — only update if changed, with unique constraint check
    if (body.email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { id: params.id } });
      if (existing && body.email !== existing.email) {
        if (body.email) {
          const emailTaken = await prisma.user.findFirst({
            where: { email: body.email, id: { not: params.id } },
          });
          if (emailTaken) {
            return NextResponse.json({ error: "This email is already used by another user" }, { status: 409 });
          }
        }
        data.email = body.email;
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      include: { client: { select: { name: true } }, _count: { select: { assignedJobs: true } } },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating team member:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "This email is already used by another user" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}
