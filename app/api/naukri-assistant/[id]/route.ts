import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

// DELETE an import and all its candidates
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await tenantPrisma.naukriImport.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }
}

// PATCH - update candidate status (reject, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { candidateId, status } = await request.json();
    if (!candidateId || !status) {
      return NextResponse.json({ error: "candidateId and status required" }, { status: 400 });
    }

    const updated = await tenantPrisma.naukriCandidate.update({
      where: { id: candidateId },
      data: { status },
      include: { matchedJob: { select: { id: true, title: true, client: { select: { name: true } } } } },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
