import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { getFileUrl, getInlineFileUrl } from "@/lib/s3";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const candidateId = url.searchParams.get("candidateId");
  const clientId = url.searchParams.get("clientId");
  const inline = url.searchParams.get("inline") === "1";
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  if (candidateId) {
    const candidate = await tenantPrisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }
  if (clientId) {
    const client = await tenantPrisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const signed = inline ? await getInlineFileUrl(key) : await getFileUrl(key, false);
  return NextResponse.json({ url: signed });
}
