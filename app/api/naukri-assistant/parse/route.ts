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
    const { rawData, searchQuery } = await request.json();
    if (!rawData || typeof rawData !== "string" || rawData.trim().length < 20) {
      return NextResponse.json({ error: "Please paste valid RESDEX search results (min 20 chars)" }, { status: 400 });
    }

    // Create import record
    const importRecord = await tenantPrisma.naukriImport.create({
      data: { userId: user.id, rawData, searchQuery: searchQuery || null, status: "PARSING" },
    });

    // Call LLM to parse
    const systemPrompt = `You are an expert recruitment data parser. You receive raw text copied from Naukri.com RESDEX (Resume Database) search results. Extract ALL candidate profiles from the text.

For each candidate found, extract:
- name (full name)
- email (if visible)
- phone (if visible)
- currentCompany
- designation (current job title)
- experience (total years as number)
- skills (array of skill strings)
- location (current city)
- currentCtc (as string with currency, e.g. "12 LPA")
- expectedCtc (as string)
- noticePeriod (e.g. "30 days", "Immediate")
- education (highest degree + institution)
- summary (1-2 line profile summary)
- naukriProfileId (if any ID is visible)

Respond ONLY with raw JSON:
{ "candidates": [ { ...fields... }, ... ] }

If no candidates can be extracted, return { "candidates": [], "error": "Could not parse any candidates from the provided text" }.
Do NOT invent data. If a field is not available, set it to null.`;

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
          { role: "user", content: `Parse the following Naukri RESDEX search results:\n\n${rawData.slice(0, 15000)}` },
        ],
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      await tenantPrisma.naukriImport.update({ where: { id: importRecord.id }, data: { status: "FAILED" } });
      return NextResponse.json({ error: `AI parsing failed: ${resp.status}. ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const llmResult = await resp.json();
    const content = llmResult.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { candidates: [] };
    }

    const candidates = parsed.candidates || [];
    if (candidates.length === 0) {
      await tenantPrisma.naukriImport.update({ where: { id: importRecord.id }, data: { status: "FAILED" } });
      return NextResponse.json({ error: parsed.error || "Could not parse any candidates from the provided text" }, { status: 400 });
    }

    // Save parsed candidates
    const created = await Promise.all(
      candidates.map((c: any) =>
        tenantPrisma.naukriCandidate.create({
          data: {
            importId: importRecord.id,
            name: c.name || "Unknown",
            email: c.email || null,
            phone: c.phone || null,
            currentCompany: c.currentCompany || null,
            designation: c.designation || null,
            experience: c.experience != null ? parseFloat(String(c.experience)) || null : null,
            skills: Array.isArray(c.skills) ? c.skills.filter(Boolean) : [],
            location: c.location || null,
            currentCtc: c.currentCtc || null,
            expectedCtc: c.expectedCtc || null,
            noticePeriod: c.noticePeriod || null,
            education: c.education || null,
            summary: c.summary || null,
            naukriProfileId: c.naukriProfileId || null,
          },
        })
      )
    );

    await tenantPrisma.naukriImport.update({
      where: { id: importRecord.id },
      data: { status: "PARSED", candidateCount: created.length },
    });

    // Return full import with candidates
    const fullImport = await tenantPrisma.naukriImport.findUnique({
      where: { id: importRecord.id },
      include: {
        candidates: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(fullImport);
  } catch (err: any) {
    console.error("Naukri parse error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
