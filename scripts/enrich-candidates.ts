// Script to enrich candidates: generate AI summaries, clean placeholder emails
import { prisma } from "@/lib/db";

const LLM_API_URL = "https://apps.abacus.ai/v1/chat/completions";

async function generateSummary(candidate: any, apiKey: string): Promise<string | null> {
  const info = [
    candidate.name,
    candidate.currentDesignation ? `works as ${candidate.currentDesignation}` : "",
    candidate.currentCompany ? `at ${candidate.currentCompany}` : "",
    candidate.totalExperience ? `with ${candidate.totalExperience} years of experience` : "",
    candidate.currentCity ? `based in ${candidate.currentCity}` : "",
    candidate.skills?.length ? `skilled in ${candidate.skills.join(", ")}` : "",
    candidate.degree ? `holds a ${candidate.degree}` : "",
    candidate.institution ? `from ${candidate.institution}` : "",
  ].filter(Boolean).join(", ");

  if (!info || info.length < 20) return null;

  try {
    const res = await fetch(LLM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a recruitment assistant. Write a concise professional summary (2-3 sentences) for a candidate based on their details. Focus on their expertise, experience level, and key strengths. Do not invent information not provided." },
          { role: "user", content: `Write a professional summary for this candidate: ${info}` },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function main() {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) { console.error("Missing ABACUSAI_API_KEY"); process.exit(1); }

  // Step 1: Clean placeholder emails
  console.log("=== Cleaning placeholder emails ===");
  const placeholderCandidates = await prisma.candidate.findMany({
    where: {
      OR: [
        { email: { contains: "placeholder.com" } },
        { email: { contains: "imported-" } },
      ],
    },
    select: { id: true, name: true, email: true },
  });
  console.log(`Found ${placeholderCandidates.length} candidates with placeholder emails`);

  for (const c of placeholderCandidates) {
    // Generate a clean "not available" marker instead of fake email
    // We can't remove email since it's required+unique, so we mark it clearly
    const cleanEmail = `${c.name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "")}@not-available.placeholder`;
    await prisma.candidate.update({
      where: { id: c.id },
      data: { email: cleanEmail },
    });
    console.log(`  Cleaned: ${c.name} (${c.email} -> ${cleanEmail})`);
  }

  // Step 2: Generate AI summaries for candidates missing them
  console.log("\n=== Generating AI summaries ===");
  const needsSummary = await prisma.candidate.findMany({
    where: { aiSummary: null },
    select: {
      id: true, name: true, currentDesignation: true, currentCompany: true,
      totalExperience: true, currentCity: true, skills: true, degree: true,
      institution: true,
    },
  });
  console.log(`Found ${needsSummary.length} candidates without AI summary`);

  let enriched = 0;
  for (const c of needsSummary) {
    const summary = await generateSummary(c, apiKey);
    if (summary) {
      await prisma.candidate.update({
        where: { id: c.id },
        data: { aiSummary: summary },
      });
      enriched++;
      console.log(`  ✓ ${c.name}: ${summary.substring(0, 80)}...`);
    } else {
      console.log(`  ✗ ${c.name}: Not enough data to generate summary`);
    }
  }
  console.log(`\nEnriched ${enriched}/${needsSummary.length} candidates with AI summaries`);

  // Step 3: Fix company field for candidates where it was incorrectly parsed
  console.log("\n=== Fixing misparse data ===");
  const badCompany = await prisma.candidate.findMany({
    where: { currentCompany: { contains: "·" } },
    select: { id: true, name: true, currentCompany: true },
  });
  for (const c of badCompany) {
    const fixed = c.currentCompany!.split("·")[0].trim();
    await prisma.candidate.update({ where: { id: c.id }, data: { currentCompany: fixed } });
    console.log(`  Fixed company: ${c.name} (${c.currentCompany} -> ${fixed})`);
  }

  // Also fix designation fields that contain company info (e.g. "Full Stack Developer (.net core")
  const badDesig = await prisma.candidate.findMany({
    where: { currentDesignation: { contains: "(" } },
    select: { id: true, name: true, currentDesignation: true },
  });
  for (const c of badDesig) {
    const fixed = c.currentDesignation!.split("(")[0].trim();
    if (fixed.length > 3) {
      await prisma.candidate.update({ where: { id: c.id }, data: { currentDesignation: fixed } });
      console.log(`  Fixed designation: ${c.name} (${c.currentDesignation} -> ${fixed})`);
    }
  }

  console.log("\n=== Done ===");
  await prisma.$disconnect();
}

main().catch(console.error);
