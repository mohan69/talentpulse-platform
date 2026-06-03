import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCompanyProfile } from "@/lib/company";

export const dynamic = "force-dynamic";

/**
 * ElevenLabs Conversational AI webhook.
 * Called by the agent during a screening call to fetch job + candidate context.
 *
 * POST /api/voice-screening/webhook
 * Body: { screeningId: string }
 * Returns: job description, candidate info, screening questions
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Accept both camelCase (screeningId) and snake_case (screening_id) from ElevenLabs
    const screeningId = body?.screeningId || body?.screening_id;

    console.log("[VoiceScreening Webhook] Received request:", {
      bodyKeys: Object.keys(body || {}),
      screeningId,
      rawBody: JSON.stringify(body).slice(0, 500),
    });

    if (!screeningId) {
      console.error("[VoiceScreening Webhook] Missing screeningId in body:", body);
      return NextResponse.json({ error: "screeningId is required" }, { status: 400 });
    }

    const screening = await prisma.voiceScreening.findUnique({
      where: { id: screeningId },
      include: {
        candidate: true,
        application: { include: { job: { include: { client: { select: { name: true } } } } } },
      },
    });

    if (!screening) {
      return NextResponse.json({ error: "Screening not found" }, { status: 404 });
    }

    // Mark call as in progress
    if (screening.callStatus === "QUEUED") {
      await prisma.voiceScreening.update({
        where: { id: screeningId },
        data: { callStatus: "IN_PROGRESS", startedAt: new Date() },
      });
    }

    const job = screening.application.job;
    const candidate = screening.candidate;
    const customQuestions = (screening.questions as string[] | null) || [];

    const companyProfile = await getCompanyProfile();

    return NextResponse.json({
      screening_id: screening.id,
      candidate: {
        name: candidate.name,
        email: candidate.email || "Not available",
        current_company: candidate.currentCompany || "Not specified",
        current_role: candidate.currentDesignation || "Not specified",
        experience_years: candidate.totalExperience,
        relevant_experience_years: candidate.relevantExperience,
        skills: candidate.skills,
        city: candidate.currentCity || "Not specified",
        notice_period_days: candidate.noticePeriod,
        expected_ctc: candidate.expectedCtc,
      },
      job: {
        title: job.title,
        client_name: (job as any).client?.name || "Not specified",
        description: (job.description || "").slice(0, 2000),
        required_skills: job.skills,
        experience_range: `${job.experienceMin}-${job.experienceMax} years`,
        salary_range: job.salaryMin && job.salaryMax ? `${job.salaryMin}-${job.salaryMax} INR` : "Not disclosed",
        location: job.location,
        employment_type: job.jobType || "Full-time",
      },
      company: {
        name: companyProfile.brandName,
        full_name: companyProfile.name,
        website: companyProfile.website,
        email: companyProfile.email,
        phone: companyProfile.phone,
        address: companyProfile.registeredOffice.address,
      },
      screening_questions: customQuestions.length > 0 ? customQuestions : [
        `Tell me about your current role at ${candidate.currentCompany || "your company"} and what you do day-to-day.`,
        `This role requires ${(job.skills || []).slice(0, 3).join(", ")}. Can you walk me through your experience with these?`,
        `The position is based in ${job.location}. Are you open to this location?`,
        `What is your notice period, and what are your salary expectations?`,
        `Why are you looking for a change right now?`,
      ],
    });
  } catch (e: any) {
    console.error("Voice webhook error:", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
