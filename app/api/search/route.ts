import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      searchMode = "keyword",
      source = "INTERNAL",
      // Keyword fields
      anyKeywords = "",
      allKeywords = "",
      excludeKeywords = "",
      // Experience
      minExperience,
      maxExperience,
      // Salary (in lacs)
      minSalary,
      maxSalary,
      includeZeroSalary = false,
      // Location
      currentLocation = "",
      preferredLocation = "",
      locationOperator = "AND",
      exactPreferredLocation = false,
      // Employment details
      currentCompany = "",
      currentDesignation = "",
      excludeCompany = "",
      // Education details
      degree = "",
      institution = "",
      graduationYear,
      // Additional filters
      noticePeriod,
      candidateSource = "",
      skills = "",
      // Sidebar filters
      resumeFreshness = 90,
      sortBy = "relevance",
      showAll = true,
      // Boolean search
      booleanQuery = "",
      // Pagination
      page = 1,
      pageSize = 25,
    } = body;

    // Build Prisma where clause
    const where: Prisma.CandidateWhereInput = {};
    const andConditions: Prisma.CandidateWhereInput[] = [];

    // Resume freshness filter
    if (resumeFreshness && resumeFreshness > 0) {
      const freshDate = new Date();
      freshDate.setDate(freshDate.getDate() - resumeFreshness);
      andConditions.push({ updatedAt: { gte: freshDate } });
    }

    if (searchMode === "boolean" && booleanQuery.trim()) {
      // Parse boolean query for OR/AND/NOT logic
      const parsed = parseBooleanQuery(booleanQuery);
      if (parsed.must.length > 0) {
        for (const term of parsed.must) {
          andConditions.push(buildTextSearch(term));
        }
      }
      if (parsed.should.length > 0) {
        andConditions.push({
          OR: parsed.should.map((t: string) => buildTextSearch(t)),
        });
      }
      if (parsed.mustNot.length > 0) {
        for (const term of parsed.mustNot) {
          andConditions.push({
            NOT: buildTextSearch(term),
          });
        }
      }
    } else {
      // Keyword search mode
      if (anyKeywords.trim()) {
        const terms = anyKeywords.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (terms.length > 0) {
          andConditions.push({
            OR: terms.map((t: string) => buildTextSearch(t)),
          });
        }
      }

      if (allKeywords.trim()) {
        const terms = allKeywords.split(",").map((s: string) => s.trim()).filter(Boolean);
        for (const term of terms) {
          andConditions.push(buildTextSearch(term));
        }
      }

      if (excludeKeywords.trim()) {
        const terms = excludeKeywords.split(",").map((s: string) => s.trim()).filter(Boolean);
        for (const term of terms) {
          andConditions.push({ NOT: buildTextSearch(term) });
        }
      }
    }

    // Experience filter
    if (minExperience !== undefined && minExperience !== null && minExperience !== "") {
      andConditions.push({ totalExperience: { gte: parseFloat(minExperience) } });
    }
    if (maxExperience !== undefined && maxExperience !== null && maxExperience !== "") {
      andConditions.push({ totalExperience: { lte: parseFloat(maxExperience) } });
    }

    // Salary filter (in lacs - store as lakhs * 100000)
    if (minSalary !== undefined && minSalary !== null && minSalary !== "") {
      const minVal = parseFloat(minSalary) * 100000;
      if (includeZeroSalary) {
        andConditions.push({
          OR: [
            { currentCtc: { gte: minVal } },
            { currentCtc: null },
            { currentCtc: 0 },
          ],
        });
      } else {
        andConditions.push({ currentCtc: { gte: minVal } });
      }
    }
    if (maxSalary !== undefined && maxSalary !== null && maxSalary !== "") {
      const maxVal = parseFloat(maxSalary) * 100000;
      if (includeZeroSalary) {
        andConditions.push({
          OR: [
            { currentCtc: { lte: maxVal } },
            { currentCtc: null },
            { currentCtc: 0 },
          ],
        });
      } else {
        andConditions.push({ currentCtc: { lte: maxVal } });
      }
    }

    // Location filters with city alias support
    if (currentLocation.trim()) {
      const locVariants = getCityVariants(currentLocation.trim());
      if (locVariants.length === 1) {
        andConditions.push({
          currentCity: { contains: locVariants[0], mode: "insensitive" },
        });
      } else {
        andConditions.push({
          OR: locVariants.map(v => ({ currentCity: { contains: v, mode: "insensitive" } })),
        });
      }
    }
    if (preferredLocation.trim()) {
      const prefVariants = getCityVariants(preferredLocation.trim());
      if (exactPreferredLocation) {
        andConditions.push({
          OR: prefVariants.map(v => ({ preferredLocations: { has: v } })),
        });
      } else {
        andConditions.push({
          OR: [
            ...prefVariants.map(v => ({ preferredLocations: { has: v } })),
            ...prefVariants.map(v => ({ currentCity: { contains: v, mode: "insensitive" as const } })),
          ],
        });
      }
    }

    // Employment details
    if (currentCompany.trim()) {
      andConditions.push({
        currentCompany: { contains: currentCompany.trim(), mode: "insensitive" },
      });
    }
    if (currentDesignation.trim()) {
      andConditions.push({
        currentDesignation: { contains: currentDesignation.trim(), mode: "insensitive" },
      });
    }
    if (excludeCompany.trim()) {
      const companies = excludeCompany.split(",").map((s: string) => s.trim()).filter(Boolean);
      for (const comp of companies) {
        andConditions.push({
          NOT: { currentCompany: { contains: comp, mode: "insensitive" } },
        });
      }
    }

    // Education details
    if (degree.trim()) {
      andConditions.push({
        degree: { contains: degree.trim(), mode: "insensitive" },
      });
    }
    if (institution.trim()) {
      andConditions.push({
        institution: { contains: institution.trim(), mode: "insensitive" },
      });
    }
    if (graduationYear) {
      andConditions.push({ graduationYear: parseInt(graduationYear) });
    }

    // Notice period
    if (noticePeriod !== undefined && noticePeriod !== null && noticePeriod !== "") {
      andConditions.push({ noticePeriod: { lte: parseInt(noticePeriod) } });
    }

    // Source
    if (candidateSource && candidateSource !== "ALL") {
      andConditions.push({ source: candidateSource as any });
    }

    // Skills — search case-insensitively across skills array and also in summary/designation
    if (skills.trim()) {
      const skillTerms = skills.split(",").map((s: string) => s.trim()).filter(Boolean);
      for (const skill of skillTerms) {
        andConditions.push({
          OR: [
            { skills: { has: skill } },
            // Also try common casings
            { skills: { has: skill.toLowerCase() } },
            { skills: { has: skill.toUpperCase() } },
            { skills: { has: skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase() } },
            // Fallback: search in text fields for the skill name
            { aiSummary: { contains: skill, mode: "insensitive" } },
            { currentDesignation: { contains: skill, mode: "insensitive" } },
          ],
        });
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Sorting
    let orderBy: any = { updatedAt: "desc" };
    if (sortBy === "experience_high") orderBy = { totalExperience: "desc" };
    else if (sortBy === "experience_low") orderBy = { totalExperience: "asc" };
    else if (sortBy === "salary_high") orderBy = { currentCtc: "desc" };
    else if (sortBy === "salary_low") orderBy = { currentCtc: "asc" };
    else if (sortBy === "name") orderBy = { name: "asc" };
    else if (sortBy === "newest") orderBy = { createdAt: "desc" };

    const skip = (page - 1) * pageSize;

    const [candidates, totalCount] = await Promise.all([
      tenantPrisma.candidate.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          currentCity: true,
          preferredLocations: true,
          currentCompany: true,
          currentDesignation: true,
          totalExperience: true,
          relevantExperience: true,
          skills: true,
          degree: true,
          institution: true,
          graduationYear: true,
          currentCtc: true,
          expectedCtc: true,
          noticePeriod: true,
          source: true,
          resumeUrl: true,
          linkedinUrl: true,
          aiSummary: true,
          updatedAt: true,
          createdAt: true,
          _count: { select: { applications: true } },
        },
      }),
      tenantPrisma.candidate.count({ where }),
    ]);

    return NextResponse.json({
      candidates,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

// Common Indian city name aliases
const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ["Bangalore", "Bengaluru"],
  bengaluru: ["Bangalore", "Bengaluru"],
  mumbai: ["Mumbai", "Bombay"],
  bombay: ["Mumbai", "Bombay"],
  chennai: ["Chennai", "Madras"],
  madras: ["Chennai", "Madras"],
  kolkata: ["Kolkata", "Calcutta"],
  calcutta: ["Kolkata", "Calcutta"],
  gurgaon: ["Gurgaon", "Gurugram"],
  gurugram: ["Gurgaon", "Gurugram"],
  trivandrum: ["Trivandrum", "Thiruvananthapuram"],
  thiruvananthapuram: ["Trivandrum", "Thiruvananthapuram"],
  varanasi: ["Varanasi", "Banaras", "Benares"],
  banaras: ["Varanasi", "Banaras", "Benares"],
  pune: ["Pune", "Poona"],
  poona: ["Pune", "Poona"],
  cochin: ["Cochin", "Kochi"],
  kochi: ["Cochin", "Kochi"],
};

function getCityVariants(city: string): string[] {
  const key = city.toLowerCase().trim();
  return CITY_ALIASES[key] || [city];
}

function buildTextSearch(term: string): Prisma.CandidateWhereInput {
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { skills: { has: term } },
      { currentDesignation: { contains: term, mode: "insensitive" } },
      { currentCompany: { contains: term, mode: "insensitive" } },
      { aiSummary: { contains: term, mode: "insensitive" } },
      { degree: { contains: term, mode: "insensitive" } },
      { currentCity: { contains: term, mode: "insensitive" } },
    ],
  };
}

function parseBooleanQuery(query: string) {
  const must: string[] = [];
  const should: string[] = [];
  const mustNot: string[] = [];

  // Simple boolean parsing: AND, OR, NOT
  const tokens = query.match(/"[^"]+"|\S+/g) || [];
  let currentOp = "AND";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].replace(/^"|"$/g, "");
    const upper = token.toUpperCase();

    if (upper === "AND" || upper === "OR" || upper === "NOT") {
      currentOp = upper;
      continue;
    }

    if (currentOp === "NOT") {
      mustNot.push(token);
      currentOp = "AND";
    } else if (currentOp === "OR") {
      should.push(token);
    } else {
      must.push(token);
    }
  }

  return { must, should, mustNot };
}
