import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are TalentPulse Copilot, an AI-native recruiting assistant for a Talent Intelligence Platform.

Your capabilities:
- Generate candidate summaries from raw profile data
- Analyze job descriptions and extract key requirements
- Score candidate-job matches with reasoning
- Generate interview questions tailored to roles
- Write personalized outreach emails (professional tone)
- Write LinkedIn InMail messages (concise, professional)
- Answer recruiting workflow questions

Rules:
- Be concise and actionable. Use bullet points where helpful.
- For match scores, provide a numeric score 0-100 with brief reasoning.
- For emails/messages, use {{name}} as placeholder for recipient name.
- Always sign off recruitment messages with "Best regards, [Recruiter Name]".
- If the user's request is unclear, ask clarifying questions.
- Keep responses under 400 words unless asked for detail.`;

function createClient() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  const { OpenAI } = require("openai");
  return new OpenAI({ apiKey, baseURL });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = createClient();
  if (!client) {
    return NextResponse.json({ error: "AI provider API key is not configured" }, { status: 500 });
  }

  try {
    const { message, history } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const model = process.env.AI_MODEL || "openai/gpt-4o-mini";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    const resp = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    const content = resp.choices?.[0]?.message?.content || "";
    return NextResponse.json({ content });
  } catch (e: any) {
    console.error("Copilot error:", e);
    return NextResponse.json({ error: e?.message || "Copilot generation failed" }, { status: 500 });
  }
}
