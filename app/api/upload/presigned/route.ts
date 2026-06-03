import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { fileName, contentType, isPublic } = body ?? {};
  if (!fileName || !contentType) return NextResponse.json({ error: "fileName & contentType required" }, { status: 400 });
  const result = await generatePresignedUploadUrl(fileName, contentType, !!isPublic);
  return NextResponse.json(result);
}
