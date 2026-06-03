import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const jdText = body?.jdText ?? "";
  if (!jdText) return NextResponse.json({ error: "jdText required" }, { status: 400 });

  const systemPrompt = `You are an expert recruitment AI that extracts structured data from job descriptions. Respond ONLY with raw JSON matching the schema. No markdown.`;
  const userInstruction = `Extract job requirements from this JD. Respond with JSON only in this schema:
{
  "title": "string",
  "location": "string",
  "jobType": "Full-time",
  "experienceMin": 0,
  "experienceMax": 0,
  "skills": ["string"],
  "salaryMin": null,
  "salaryMax": null,
  "description": "string",
  "summary": "string"
}

JD:
${jdText}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
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
              { role: "user", content: userInstruction },
            ],
            stream: true,
            max_tokens: 2000,
            response_format: { type: "json_object" },
          }),
        });
        if (!resp.ok || !resp.body) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", message: "LLM API error" })}\n\n`));
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
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "completed", result: parsed ?? {} })}\n\n`));
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "completed", result: parsed ?? {} })}\n\n`));
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
