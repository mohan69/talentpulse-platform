import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { computeHeuristicScore } from "@/lib/ai-screening";
import { tenantPrisma } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { applicationId } = body ?? {};
  if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

  const app = await tenantPrisma.application.findUnique({
    where: { id: applicationId },
    include: { candidate: { include: { projects: true } }, job: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const heuristic = computeHeuristicScore(app.candidate, app.job);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Push heuristic immediately
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "processing", heuristic })}\n\n`));

      const prompt = `You are an expert technical recruiter performing a detailed candidate screening. Produce a comprehensive screening report in JSON.

JOB:
Title: ${app.job.title}
Location: ${app.job.location}
Experience required: ${app.job.experienceMin}-${app.job.experienceMax} years
Skills required: ${(app.job.skills || []).join(", ")}
Salary range: ${app.job.salaryMin ?? "N/A"} - ${app.job.salaryMax ?? "N/A"} INR
Description: ${(app.job.description || "").slice(0, 1500)}

CANDIDATE:
Name: ${app.candidate.name}
Current Company: ${app.candidate.currentCompany ?? "N/A"}
Current Designation: ${app.candidate.currentDesignation ?? "N/A"}
Total Experience: ${app.candidate.totalExperience} years
Skills: ${(app.candidate.skills || []).join(", ")}
Location: ${app.candidate.currentCity ?? "N/A"}
Preferred locations: ${(app.candidate.preferredLocations || []).join(", ")}
Will relocate: ${app.candidate.willRelocate}
Current CTC: ${app.candidate.currentCtc ?? "N/A"}
Expected CTC: ${app.candidate.expectedCtc ?? "N/A"}
Notice period: ${app.candidate.noticePeriod ?? "N/A"} days
Employment gaps: ${app.candidate.employmentGapNotes ?? "None mentioned"}
Projects: ${(app.candidate.projects || []).map((p: any) => `${p.projectName} (${p.role})`).join("; ") || "N/A"}

Produce a JSON report with this exact schema (and nothing else):
{
  "overallVerdict": "strong_fit|moderate_fit|weak_fit|not_suitable",
  "matchScore": 0,
  "executiveSummary": "2-3 sentence recommendation for the client",
  "assessments": {
    "basicProfile": {"score": 0, "notes": "string"},
    "jdFitment": {"score": 0, "matchedSkills": ["string"], "missingSkills": ["string"], "notes": "string"},
    "ctcAnalysis": {"status": "ok|stretch|mismatch|unknown", "notes": "string"},
    "noticePeriod": {"status": "immediate|short|long", "notes": "string"},
    "location": {"status": "match|mismatch|relocation", "notes": "string"},
    "projectExperience": {"score": 0, "notes": "string"},
    "employmentGaps": {"status": "none|minor|major", "notes": "string"},
    "noShowRisk": {"score": 0, "reasons": ["string"]}
  },
  "strengths": ["string"],
  "redFlags": ["string"],
  "interviewQuestions": ["string"]
}
Scores 0-100. Respond with raw JSON only.`;

      try {
        const resp = await fetch("https://apps.abacus.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [{ role: "user", content: prompt }],
            stream: true,
            max_tokens: 3000,
            response_format: { type: "json_object" },
          }),
        });
        if (!resp.ok || !resp.body) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", message: "LLM API error" })}\n\n`));
          // Still save heuristic-only result
          await tenantPrisma.application.update({
            where: { id: applicationId },
            data: {
              matchScore: heuristic.matchScore,
              noShowRisk: heuristic.noShowRisk,
              aiReport: { heuristic } as any,
              stage: app.stage === "NEW" ? "AI_SCREENING" : app.stage,
            },
          });
          controller.close();
          return;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let partialRead = "";
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          partialRead += decoder.decode(value, { stream: true });
          const lines = partialRead.split("\n");
          partialRead = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;
            if (data === "[DONE]") {
              let parsed: any = null;
              try { parsed = JSON.parse(buffer); } catch {
                const m = buffer.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
              }
              const report = { heuristic, ai: parsed };
              await tenantPrisma.application.update({
                where: { id: applicationId },
                data: {
                  matchScore: parsed?.matchScore ?? heuristic.matchScore,
                  noShowRisk: parsed?.assessments?.noShowRisk?.score ?? heuristic.noShowRisk,
                  aiReport: report as any,
                  stage: app.stage === "NEW" ? "AI_SCREENING" : app.stage,
                },
              });
              if (parsed?.executiveSummary) {
                await tenantPrisma.candidate.update({
                  where: { id: app.candidateId },
                  data: { aiSummary: parsed.executiveSummary },
                });
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "completed", result: report })}\n\n`));
              controller.close();
              return;
            }
            try {
              const j = JSON.parse(data);
              const delta = j?.choices?.[0]?.delta?.content ?? "";
              if (delta) buffer += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "processing" })}\n\n`));
            } catch {}
          }
        }
        let parsed: any = null;
        try { parsed = JSON.parse(buffer); } catch {
          const m = buffer.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
        }
        const report = { heuristic, ai: parsed };
        await tenantPrisma.application.update({
          where: { id: applicationId },
          data: {
            matchScore: parsed?.matchScore ?? heuristic.matchScore,
            noShowRisk: parsed?.assessments?.noShowRisk?.score ?? heuristic.noShowRisk,
            aiReport: report as any,
            stage: app.stage === "NEW" ? "AI_SCREENING" : app.stage,
          },
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "completed", result: report })}\n\n`));
        controller.close();
      } catch (e: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", message: e?.message ?? "Error" })}\n\n`));
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
