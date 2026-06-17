import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { logActivity } from "@/lib/activity";
import { randomBytes } from "crypto";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

interface CsvRow {
  name: string;
  email?: string;
  phone?: string;
  currentCity?: string;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperience?: string;
  skills?: string;
  degree?: string;
  institution?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  linkedinUrl?: string;
  source?: string;
  notes?: string;
  tags?: string;
}

const VALID_SOURCES = ["LINKEDIN", "NAUKRI", "REFERRAL", "INTERNAL_DB", "DIRECT", "OTHER"];

function parseCsvText(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  // Map common header variations
  const HEADER_MAP: Record<string, string> = {
    name: "name", fullname: "name", candidatename: "name",
    email: "email", emailid: "email", emailaddress: "email",
    phone: "phone", mobile: "phone", phonenumber: "phone", mobilenumber: "phone", contact: "phone",
    city: "currentCity", currentcity: "currentCity", location: "currentCity",
    company: "currentCompany", currentcompany: "currentCompany", organization: "currentCompany",
    designation: "currentDesignation", currentdesignation: "currentDesignation", title: "currentDesignation", jobtitle: "currentDesignation", role: "currentDesignation",
    experience: "totalExperience", totalexperience: "totalExperience", exp: "totalExperience", yearsofexperience: "totalExperience",
    skills: "skills", keyskills: "skills", skillset: "skills",
    degree: "degree", qualification: "degree", education: "degree",
    institution: "institution", college: "institution", university: "institution",
    currentctc: "currentCtc", ctc: "currentCtc", salary: "currentCtc",
    expectedctc: "expectedCtc",
    noticeperiod: "noticePeriod", notice: "noticePeriod",
    linkedin: "linkedinUrl", linkedinurl: "linkedinUrl",
    source: "source",
    notes: "notes", remarks: "notes", comments: "notes",
    tags: "tags",
  };

  const mappedHeaders = headers.map((h) => HEADER_MAP[h] ?? null);

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: any = {};
    for (let j = 0; j < mappedHeaders.length; j++) {
      const key = mappedHeaders[j];
      if (key && values[j]?.trim()) {
        row[key] = values[j].trim();
      }
    }
    if (row.name) rows.push(row as CsvRow);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!((["ADMIN", "RECRUITER"] as string[]).includes(user.role)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { csvText, sourceDetail } = body;

  if (!csvText?.trim()) return NextResponse.json({ error: "CSV data is required" }, { status: 400 });

  const rows = parseCsvText(csvText);
  if (rows.length === 0) return NextResponse.json({ error: "No valid rows found in CSV. Ensure a 'Name' column is present." }, { status: 400 });

  const batchId = randomBytes(8).toString("hex");
  let imported = 0;
  let skipped = 0;
  const errors: { row: number; name: string; reason: string }[] = [];

  // Collect emails for duplicate check
  const emails = rows.map((r) => r.email?.toLowerCase()).filter(Boolean) as string[];
  const existingProspects = emails.length > 0
    ? await prisma.prospect.findMany({ where: { email: { in: emails } }, select: { email: true } })
    : [];
  const existingCandidates = emails.length > 0
    ? await tenantPrisma.candidate.findMany({ where: { email: { in: emails } }, select: { email: true } })
    : [];
  const existingEmails = new Set([
    ...existingProspects.map((p) => p.email?.toLowerCase()),
    ...existingCandidates.map((c) => c.email.toLowerCase()),
  ]);

  const createData: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (row.email && existingEmails.has(row.email.toLowerCase())) {
      errors.push({ row: i + 2, name: row.name, reason: "Duplicate email — already exists as prospect or candidate" });
      skipped++;
      continue;
    }

    const src = row.source?.toUpperCase();
    createData.push({
      name: row.name.trim(),
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      currentCity: row.currentCity?.trim() || null,
      currentCompany: row.currentCompany?.trim() || null,
      currentDesignation: row.currentDesignation?.trim() || null,
      totalExperience: row.totalExperience ? parseFloat(row.totalExperience) || null : null,
      skills: row.skills ? row.skills.split(/[,;|]/).map((s) => s.trim()).filter(Boolean) : [],
      degree: row.degree?.trim() || null,
      institution: row.institution?.trim() || null,
      currentCtc: row.currentCtc ? parseFloat(row.currentCtc.replace(/[^0-9.]/g, "")) || null : null,
      expectedCtc: row.expectedCtc ? parseFloat(row.expectedCtc.replace(/[^0-9.]/g, "")) || null : null,
      noticePeriod: row.noticePeriod ? parseInt(row.noticePeriod.replace(/[^0-9]/g, "")) || null : null,
      linkedinUrl: row.linkedinUrl?.trim() || null,
      source: src && VALID_SOURCES.includes(src) ? src : "OTHER",
      sourceDetail: sourceDetail || "Bulk CSV Import",
      notes: row.notes?.trim() || null,
      tags: row.tags ? row.tags.split(/[,;|]/).map((s) => s.trim()).filter(Boolean) : [],
      ownerId: user.id,
      importBatchId: batchId,
      status: "NEW",
    });

    if (row.email) existingEmails.add(row.email.toLowerCase());
  }

  // Batch create
  if (createData.length > 0) {
    const result = await prisma.prospect.createMany({ data: createData });
    imported = result.count;
  }

  await logActivity({ userId: user.id, entityType: "prospect", entityId: batchId, action: "bulk_imported", metadata: {
    imported,
    skipped,
    total: rows.length,
  } });

  return NextResponse.json({
    batchId,
    total: rows.length,
    imported,
    skipped,
    errors,
  });
}
