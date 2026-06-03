import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/pdf";
    const base64 = buffer.toString("base64");

    const fileName = file.name || "resume.pdf";
    const lowerName = fileName.toLowerCase();
    const isPDF = mimeType.includes("pdf") || lowerName.endsWith(".pdf");
    const isDOCX = lowerName.endsWith(".docx") || mimeType.includes("officedocument");
    const isImage = mimeType.startsWith("image/");
    const isText = mimeType.startsWith("text/") || lowerName.endsWith(".txt");

    let messages: any[] = [];
    const systemPrompt = `You are an expert recruitment AI that extracts structured data from resumes. Respond ONLY with raw JSON matching the schema provided. No markdown, no code blocks.`;
    const userInstruction = `Extract the candidate information from this resume. Respond ONLY with JSON in this exact schema:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "currentCity": "string",
  "currentCompany": "string",
  "currentDesignation": "string",
  "totalExperience": 0,
  "skills": ["string"],
  "degree": "string",
  "institution": "string",
  "graduationYear": 2020,
  "currentCtc": null,
  "expectedCtc": null,
  "noticePeriod": null,
  "linkedinUrl": "string",
  "projects": [{"projectName": "string", "role": "string", "skillsUsed": ["string"], "description": "string", "contribution": "string"}],
  "summary": "string"
}
Leave unknown fields as null, empty array, or empty string. Total experience in years (decimal OK). CTC in INR if Indian candidate. Respond with raw JSON only.`;

    if (isPDF) {
      messages = [{
        role: "user",
        content: [
          { type: "file", file: { filename: fileName, file_data: `data:application/pdf;base64,${base64}` } },
          { type: "text", text: userInstruction },
        ],
      }];
    } else if (isImage) {
      messages = [{
        role: "user",
        content: [
          { type: "text", text: userInstruction },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      }];
    } else if (isDOCX) {
      const mammoth = await import("mammoth").catch(() => null as any);
      let text = "";
      if (mammoth) {
        try {
          const result = await mammoth.extractRawText({ buffer });
          text = result?.value ?? "";
        } catch {}
      }
      if (!text) text = buffer.toString("utf-8").substring(0, 20000);
      messages = [{ role: "user", content: `${userInstruction}\n\nHere is the resume content:\n\n${text}` }];
    } else if (isText) {
      const text = buffer.toString("utf-8");
      messages = [{ role: "user", content: `${userInstruction}\n\nHere is the resume content:\n\n${text}` }];
    } else {
      // Try PDF as fallback
      messages = [{
        role: "user",
        content: [
          { type: "file", file: { filename: fileName, file_data: `data:application/pdf;base64,${base64}` } },
          { type: "text", text: userInstruction },
        ],
      }];
    }

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
              messages: [{ role: "system", content: systemPrompt }, ...messages],
              stream: true,
              max_tokens: 3000,
              response_format: { type: "json_object" },
            }),
          });

          if (!resp.ok || !resp.body) {
            const errText = await resp.text().catch(() => "");
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", message: `LLM API error: ${resp.status}. ${errText.slice(0, 200)}` })}\n\n`));
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
                  const m = buffer.match(/\{[\s\S]*\}/);
                  if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
                }
                const finalData = JSON.stringify({ status: "completed", result: parsed ?? {} });
                controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
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
          // In case stream ended without [DONE]
          let parsed: any = null;
          try { parsed = JSON.parse(buffer); } catch {
            const m = buffer.match(/\{[\s\S]*\}/);
            if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "completed", result: parsed ?? {} })}\n\n`));
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", message: err?.message ?? "Stream error" })}\n\n`));
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
  } catch (e: any) {
    console.error("parse-resume error", e);
    return NextResponse.json({ error: e?.message ?? "Parse failed" }, { status: 500 });
  }
}
