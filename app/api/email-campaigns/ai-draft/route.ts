import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const client = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY,
  baseURL: "https://api.abacus.ai/v1",
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, context, tone, recipientInfo } = body;

  const systemPrompt = `You are a professional recruitment email writer for CloudCXO, a top recruitment consultancy in India. Write concise, personalised outreach emails.
Return ONLY a JSON object with "subject" and "body" (HTML formatted) fields. No markdown wrapping.
Use {{name}} placeholder for recipient name. Keep emails professional but warm, under 200 words.`;

  const userPrompt = type === "BD"
    ? `Write a business development email to a potential client company.
Context: ${context || "General BD outreach for recruitment services"}
Tone: ${tone || "Professional and consultative"}
Recipient info: ${recipientInfo || "HR/Talent Acquisition head"}`
    : `Write a candidate outreach email.
Context: ${context || "Reaching out about a new opportunity"}
Tone: ${tone || "Friendly and professional"}
Recipient info: ${recipientInfo || "Experienced professional"}`;

  try {
    const resp = await client.chat.completions.create({
      model: "claude-sonnet-4-20250514",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    // Parse JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ subject: parsed.subject, body: parsed.body });
    }
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 });
  } catch (e: any) {
    console.error("AI draft error", e);
    return NextResponse.json({ error: e?.message || "AI generation failed" }, { status: 500 });
  }
}
