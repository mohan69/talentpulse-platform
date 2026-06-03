import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      company,
      designation,
      experience,
      location,
      skills,
      education,
      expectedCtc,
      source,
      profileUrl,
      summary,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check for duplicates by email or name+company
    if (email) {
      const existing = await prisma.candidate.findFirst({
        where: { email: email },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Candidate with this email already exists", candidateId: existing.id },
          { status: 409 }
        );
      }
    }

    // Generate a placeholder email if none provided — marked clearly as unavailable
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/, "");
    const candidateEmail = email || `${slug}@not-available.placeholder`;

    // Check if this email already exists — if placeholder collides, make it unique
    let finalEmail = candidateEmail;
    const existingCandidate = await prisma.candidate.findFirst({
      where: { email: candidateEmail },
    });
    if (existingCandidate) {
      if (candidateEmail.includes("@not-available.placeholder")) {
        finalEmail = `${slug}.${Date.now().toString(36)}@not-available.placeholder`;
      } else {
        return NextResponse.json(
          { error: "Candidate already imported", candidateId: existingCandidate.id },
          { status: 409 }
        );
      }
    }

    // Map source string to enum
    let candidateSource: any = "OTHER";
    const srcLower = (source || "").toLowerCase();
    if (srcLower.includes("linkedin")) candidateSource = "LINKEDIN";
    else if (srcLower.includes("naukri")) candidateSource = "NAUKRI";
    else if (srcLower.includes("github")) candidateSource = "OTHER";
    else if (srcLower.includes("referral")) candidateSource = "REFERRAL";
    else if (srcLower.includes("direct")) candidateSource = "DIRECT";
    // All other web platforms (Indeed, Glassdoor, Shine, Instahyre, Hirist, IIMJobs, Cutshort, FoundIT, Web)
    // map to OTHER since the Prisma enum only has: NAUKRI, LINKEDIN, REFERRAL, DIRECT, OTHER

    const candidate = await prisma.candidate.create({
      data: {
        name: name.trim(),
        email: finalEmail,
        phone: phone || null,
        currentCompany: company || null,
        currentDesignation: designation || null,
        totalExperience: parseFloat(experience) || 0,
        currentCity: location || null,
        skills: Array.isArray(skills) ? skills : (skills ? skills.split(",").map((s: string) => s.trim()) : []),
        degree: education || null,
        expectedCtc: expectedCtc ? parseFloat(expectedCtc) * 100000 : null,
        source: candidateSource,
        linkedinUrl: profileUrl || null,
        aiSummary: summary || null,
        ownerId: (session.user as any).id,
      },
    });

    return NextResponse.json({
      success: true,
      candidateId: candidate.id,
      message: `${candidate.name} imported to database`,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Candidate with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
