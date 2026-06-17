import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { generatePresignedUploadUrl } from "@/lib/s3";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { fileName, contentType, isPublic, candidateId, clientId } = body ?? {};
  if (!fileName || !contentType) return NextResponse.json({ error: "fileName & contentType required" }, { status: 400 });
  if (candidateId) {
    const candidate = await tenantPrisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }
  if (clientId) {
    const client = await tenantPrisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const result = await generatePresignedUploadUrl(fileName, contentType, !!isPublic);
  return NextResponse.json(result);
}
