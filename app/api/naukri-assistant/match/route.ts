import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { importId, candidateIds } = await request.json();
    if (!importId) return NextResponse.json({ error: "importId required" }, { status: 400 });

    // Fetch candidates to match
    const where: any = { importId, status: { in: ["NEW", "MATCHED"] } };
    if (candidateIds?.length) where.id = { in: candidateIds };
    const naukriCandidates = await prisma.naukriCandidate.findMany({ where });

    if (naukriCandidates.length === 0) {
      return NextResponse.json({ error: "No candidates to match" }, { status: 400 });
    }

    // Fetch open jobs
    const openJobs = await tenantPrisma.job.findMany({
      where: { status: "OPEN" },
      include: { client: { select: { name: true } } },
    });

    if (openJobs.length === 0) {
      return NextResponse.json({ error: "No open jobs to match against" }, { status: 400 });
    }

    // Build AI prompt
    const jobsSummary = openJobs.map((j: any) => ({
      id: j.id,
      title: j.title,
      client: j.client.name,
      location: j.location,
      skills: j.skills,
      experienceRange: `${j.experienceMin}-${j.experienceMax} years`,
      salaryRange: j.salaryMin && j.salaryMax ? `${j.salaryMin}-${j.salaryMax} ${j.currency}` : "Not specified",
    }));

    const candidatesSummary = naukriCandidates.map((c: any) => ({
      id: c.id,
      name: c.name,
      skills: c.skills,
      experience: c.experience,
      location: c.location,
      designation: c.designation,
      currentCtc: c.currentCtc,
      expectedCtc: c.expectedCtc,
    }));

    const systemPrompt = `You are an expert AI recruitment matcher. Given a list of candidates and open jobs, match each candidate to their BEST fitting job.

For each candidate, provide:
- candidateId: the candidate's id
- matchedJobId: the best matching job's id (or null if no good match)
- matchScore: 0-100 score indicating fit quality
- matchReason: 1-2 sentence explanation of why this is a good/poor match

Consider: skills overlap, experience level, location preference, salary expectations vs budget, job seniority.

Respond ONLY with raw JSON:
{ "matches": [ { "candidateId": "...", "matchedJobId": "...", "matchScore": 85, "matchReason": "..." }, ... ] }`;

    const resp = await fetch("https://apps.abacus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Open Jobs:\n${JSON.stringify(jobsSummary, null, 2)}\n\nCandidates to match:\n${JSON.stringify(candidatesSummary, null, 2)}`,
          },
        ],
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return NextResponse.json({ error: `AI matching failed: ${resp.status}. ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const llmResult = await resp.json();
    const content = llmResult.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { matches: [] };
    }

    const matches = parsed.matches || [];
    const validJobIds = new Set(openJobs.map((j: any) => j.id));

    // Update each candidate with match results
    let matchedCount = 0;
    for (const match of matches) {
      if (!match.candidateId) continue;
      const jobId = validJobIds.has(match.matchedJobId) ? match.matchedJobId : null;
      await prisma.naukriCandidate.update({
        where: { id: match.candidateId },
        data: {
          matchedJobId: jobId,
          matchScore: match.matchScore != null ? parseFloat(String(match.matchScore)) : null,
          matchReason: match.matchReason || null,
          status: jobId ? "MATCHED" : "NEW",
        },
      });
      if (jobId) matchedCount++;
    }

    // Refetch updated candidates
    const updated = await prisma.naukriCandidate.findMany({
      where: { importId },
      include: { matchedJob: { select: { id: true, title: true, client: { select: { name: true } } } } },
      orderBy: { matchScore: { sort: "desc", nulls: "last" } },
    });

    return NextResponse.json({ matchedCount, totalCandidates: naukriCandidates.length, candidates: updated });
  } catch (err: any) {
    console.error("Naukri match error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
