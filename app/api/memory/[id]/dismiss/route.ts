import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/tenant/context";
import { requireRole } from "@/lib/guards";
import { dismissMemory } from "@/lib/memory/confidence";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const ok = await dismissMemory(ctx, params.id, body.reason);

  if (!ok) return NextResponse.json({ error: "Memory entry not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
