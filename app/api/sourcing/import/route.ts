import { NextResponse } from "next/server";
import { CandidateSource } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

type ImportRow = {
  name?: string;
  email?: string;
  phone?: string;
  currentDesignation?: string;
  currentCompany?: string;
  currentCity?: string;
  totalExperience?: number | string;
  currentCtc?: number | string;
  expectedCtc?: number | string;
  noticePeriod?: number | string;
  skills?: string[] | string;
  resumeHeadline?: string;
  linkedinUrl?: string;
  notes?: string;
  source?: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function nullable(value: unknown) {
  const text = clean(value);
  return text.length ? text : null;
}

function normalizedEmail(value: unknown) {
  const email = clean(value).toLowerCase();
  return email.includes("@") ? email : "";
}

function normalizedPhone(value: unknown) {
  return clean(value).replace(/[^\d+]/g, "");
}

function numberOrNull(value: unknown) {
  const text = clean(value).replace(/[^\d.]/g, "");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function skillsArray(value: unknown) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 30);
  return clean(value)
    .split(/[;,|]/)
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function candidateSource(value: unknown): CandidateSource {
  const raw = clean(value).toUpperCase();
  if (raw.includes("NAUKRI")) return "NAUKRI";
  if (raw.includes("LINKEDIN")) return "LINKEDIN";
  if (raw.includes("DIRECT") || raw.includes("GITHUB") || raw.includes("PUBLIC")) return "DIRECT";
  return "OTHER";
}

function compactUpdateData(row: ImportRow) {
  const skills = skillsArray(row.skills);
  return {
    phone: normalizedPhone(row.phone) || undefined,
    currentDesignation: nullable(row.currentDesignation) ?? undefined,
    currentCompany: nullable(row.currentCompany) ?? undefined,
    currentCity: nullable(row.currentCity) ?? undefined,
    totalExperience: numberOrNull(row.totalExperience) ?? undefined,
    currentCtc: numberOrNull(row.currentCtc) ?? undefined,
    expectedCtc: numberOrNull(row.expectedCtc) ?? undefined,
    noticePeriod: numberOrNull(row.noticePeriod) ?? undefined,
    linkedinUrl: nullable(row.linkedinUrl) ?? undefined,
    aiSummary: nullable(row.resumeHeadline ?? row.notes) ?? undefined,
    skills: skills.length ? skills : undefined,
  };
}

function missingOnly(existing: any, row: ImportRow) {
  const proposed = compactUpdateData(row);
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(proposed)) {
    if (value === undefined) continue;
    if (key === "skills") {
      const existingSkills = Array.isArray(existing.skills) ? existing.skills : [];
      const merged = Array.from(new Set([...existingSkills, ...(value as string[])]));
      if (merged.length > existingSkills.length) data.skills = merged;
      continue;
    }
    if (existing[key] === null || existing[key] === undefined || existing[key] === "" || existing[key] === 0) {
      data[key] = value;
    }
  }
  return data;
}

async function findDuplicate(row: ImportRow) {
  const email = normalizedEmail(row.email);
  const phone = normalizedPhone(row.phone);
  const name = clean(row.name);
  const company = clean(row.currentCompany);
  const OR: any[] = [];
  if (email) OR.push({ email });
  if (phone) OR.push({ phone });
  if (name && company) {
    OR.push({
      name: { equals: name, mode: "insensitive" },
      currentCompany: { equals: company, mode: "insensitive" },
    });
  }
  if (!OR.length) return null;
  return tenantPrisma.candidate.findFirst({ where: { OR } });
}

export async function GET() {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await tenantPrisma.activityLog.findMany({
    where: { entityType: "sourcing_import_batch" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];
  const source = candidateSource(body.source);
  const fileName = clean(body.fileName) || "manual-import";

  let imported = 0;
  let leadCreated = 0;
  let enriched = 0;
  let duplicateSkipped = 0;
  let skipped = 0;
  const results = [];

  for (const row of rows.slice(0, 500)) {
    const name = clean(row.name);
    const email = normalizedEmail(row.email);
    if (!name || !email) {
      if (name) {
        const phone = normalizedPhone(row.phone);
        const company = clean(row.currentCompany);
        const leadOr: any[] = [];
        if (phone) leadOr.push({ phone });
        if (company) leadOr.push({ name: { equals: name, mode: "insensitive" }, currentCompany: { equals: company, mode: "insensitive" } });
        if (!leadOr.length) leadOr.push({ name: { equals: name, mode: "insensitive" } });
        const existingLead = await tenantPrisma.prospect.findFirst({
          where: { OR: leadOr },
        });
        if (existingLead) {
          duplicateSkipped += 1;
          results.push({ id: existingLead.id, name, email, status: "lead_duplicate" });
        } else {
          const lead = await tenantPrisma.prospect.create({
            data: {
              name,
              email: email || null,
              phone: phone || null,
              currentDesignation: nullable(row.currentDesignation),
              currentCompany: nullable(row.currentCompany),
              currentCity: nullable(row.currentCity),
              totalExperience: numberOrNull(row.totalExperience),
              currentCtc: numberOrNull(row.currentCtc),
              expectedCtc: numberOrNull(row.expectedCtc),
              noticePeriod: numberOrNull(row.noticePeriod),
              skills: skillsArray(row.skills),
              linkedinUrl: nullable(row.linkedinUrl),
              source,
              sourceDetail: fileName,
              notes: nullable(row.resumeHeadline ?? row.notes),
              ownerId: user.id,
              tags: ["sourcing-import", email ? "email-present" : "email-missing"],
            },
          });
          leadCreated += 1;
          results.push({ id: lead.id, name, email, status: "lead_created", reason: "Missing valid email; staged in Candidate Lead Inbox." });
        }
      } else {
        skipped += 1;
        results.push({ name, email, status: "skipped", reason: "Name is required." });
      }
      continue;
    }

    const duplicate = await findDuplicate(row);
    if (duplicate) {
      const data = missingOnly(duplicate, row);
      if (Object.keys(data).length > 0) {
        await tenantPrisma.candidate.update({ where: { id: duplicate.id }, data });
        enriched += 1;
        results.push({ id: duplicate.id, name, email, status: "enriched" });
      } else {
        duplicateSkipped += 1;
        results.push({ id: duplicate.id, name, email, status: "duplicate" });
      }
      continue;
    }

    const candidate = await tenantPrisma.candidate.create({
      data: {
        name,
        email,
        phone: normalizedPhone(row.phone) || null,
        currentDesignation: nullable(row.currentDesignation),
        currentCompany: nullable(row.currentCompany),
        currentCity: nullable(row.currentCity),
        totalExperience: numberOrNull(row.totalExperience) ?? 0,
        relevantExperience: numberOrNull(row.totalExperience) ?? 0,
        currentCtc: numberOrNull(row.currentCtc),
        expectedCtc: numberOrNull(row.expectedCtc),
        noticePeriod: numberOrNull(row.noticePeriod),
        skills: skillsArray(row.skills),
        source,
        linkedinUrl: nullable(row.linkedinUrl),
        aiSummary: nullable(row.resumeHeadline ?? row.notes),
        ownerId: user.id,
      },
    });
    imported += 1;
    results.push({ id: candidate.id, name, email, status: "imported" });
  }

  const summary = {
    source,
    fileName,
    recordsProcessed: rows.length,
    recordsImported: imported,
    leadsCreated: leadCreated,
    recordsEnriched: enriched,
    duplicatesSkipped: duplicateSkipped,
    recordsSkipped: skipped,
  };

  await logActivity({
    userId: user.id,
    entityType: "sourcing_import_batch",
    entityId: `sourcing-import-${Date.now()}`,
    action: "sourcing_import_completed",
    metadata: summary,
  });

  return NextResponse.json({ summary, results });
}
