import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { getFileUrl, getInlineFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const inline = url.searchParams.get("inline") === "1";
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const signed = inline ? await getInlineFileUrl(key) : await getFileUrl(key, false);
  return NextResponse.json({ url: signed });
}
