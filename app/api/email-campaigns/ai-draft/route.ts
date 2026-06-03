import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function createClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ABACUSAI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const baseURL = process.env.OPENROUTER_BASE_URL || undefined;
  const isOpenRouter = baseURL || !!process.env.OPENROUTER_API_KEY;

  const { OpenAI } = require("openai");
  return new OpenAI({
    apiKey,
    baseURL: baseURL || (isOpenRouter ? "https://openrouter.ai/api/v1" : "https://api.abacus.ai/v1"),
  });
}

function getModel(isOpenRouter: boolean): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  if (isOpenRouter) return "openai/gpt-4o-mini";
  return "claude-sonnet-4-20250514";
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = createClient();
  if (!client) {
    return NextResponse.json({ error: "AI provider API key is not configured" }, { status: 500 });
  }

  const isOpenRouter = !!(process.env.OPENROUTER_BASE_URL || process.env.OPENROUTER_API_KEY);

  const body = await req.json();
  const { type, context, tone, recipientInfo } = body;

  const systemPrompt = `You are a professional recruitment email writer for TalentPulse, an AI-powered recruitment platform. Write concise, personalised outreach emails.
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
      model: getModel(isOpenRouter),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const raw = resp.choices?.[0]?.message?.content || "";
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
