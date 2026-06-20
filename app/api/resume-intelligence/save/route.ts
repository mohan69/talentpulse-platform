import { NextResponse } from "next/server";
import { CandidateSource } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function email(value: unknown) {
  const normalized = clean(value).toLowerCase();
  return normalized.includes("@") ? normalized : "";
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 40);
  return clean(value).split(/[;,|]/).map((item) => item.trim()).filter(Boolean).slice(0, 40);
}

export async function POST(request: Request) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = body.parsed ?? {};
  const candidateEmail = email(parsed.email);
  const name = clean(parsed.name);
  if (!name || !candidateEmail) {
    return NextResponse.json({ error: "Name and valid email are required before saving." }, { status: 400 });
  }

  const candidateRepo = (tenantPrisma.candidate as any).withContext(ctx);
  const activityRepo = (tenantPrisma.activityLog as any).withContext(ctx);
  const existing = await candidateRepo.findFirst({
    where: { OR: [{ email: candidateEmail }, ...(clean(parsed.phone) ? [{ phone: clean(parsed.phone) }] : [])] },
    select: { id: true, name: true, email: true },
  });

  const data = {
    name,
    email: candidateEmail,
    phone: clean(parsed.phone) || undefined,
    currentCity: clean(parsed.currentCity ?? parsed.location) || undefined,
    currentCompany: clean(parsed.currentCompany) || undefined,
    currentDesignation: clean(parsed.currentDesignation ?? parsed.title) || undefined,
    totalExperience: numberOrNull(parsed.totalExperience ?? parsed.experience) ?? 0,
    relevantExperience: numberOrNull(parsed.relevantExperience) ?? numberOrNull(parsed.totalExperience ?? parsed.experience) ?? 0,
    skills: stringArray(parsed.skills),
    degree: clean(parsed.degree ?? parsed.education) || undefined,
    institution: clean(parsed.institution) || undefined,
    currentCtc: numberOrNull(parsed.currentCtc),
    expectedCtc: numberOrNull(parsed.expectedCtc),
    noticePeriod: numberOrNull(parsed.noticePeriod),
    linkedinUrl: clean(parsed.linkedinUrl) || undefined,
    aiSummary: clean(parsed.summary) || undefined,
    source: CandidateSource.OTHER,
    ownerId: user.id,
  };

  const saved = existing
    ? await candidateRepo.update({
        where: { id: existing.id },
        data: Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== "")),
      })
    : await candidateRepo.create({ data });

  await activityRepo.create({
    data: {
      userId: user.id,
      entityType: "candidate",
      entityId: saved.id,
      action: existing ? "resume_intelligence_enriched" : "resume_intelligence_created",
      metadata: {
        confidence: body.confidence ?? null,
        missingFields: body.missingFields ?? [],
        fileName: body.fileName ?? null,
      },
    },
  });

  return NextResponse.json({ ok: true, candidate: saved, mode: existing ? "enriched" : "created" });
}
