import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCompanyProfile } from "@/lib/company";

export const dynamic = "force-dynamic";

/**
 * API endpoint called by the ElevenLabs Voice AI agent to send
 * a Job Description email to the candidate during a screening call.
 *
 * POST /api/voice-screening/send-jd-email
 * Body: { screening_id: string }
 * Returns: { success: boolean, message: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const screeningId = body?.screening_id || body?.screeningId;

    console.log("[VoiceScreening SendJDEmail] Request received:", {
      screeningId,
      bodyKeys: Object.keys(body || {}),
    });

    if (!screeningId) {
      return NextResponse.json(
        { success: false, message: "screening_id is required" },
        { status: 400 }
      );
    }

    // Fetch screening with full candidate, job, and client details
    const screening = await prisma.voiceScreening.findUnique({
      where: { id: screeningId },
      include: {
        candidate: true,
        application: {
          include: {
            job: { include: { client: { select: { name: true } } } },
          },
        },
      },
    });

    if (!screening) {
      return NextResponse.json(
        { success: false, message: "Screening not found" },
        { status: 404 }
      );
    }

    const candidate = screening.candidate;
    const job = screening.application?.job;
    const clientName = (job as any)?.client?.name || "our client";

    if (!candidate?.email) {
      console.warn("[VoiceScreening SendJDEmail] No email for candidate:", candidate?.name);
      return NextResponse.json({
        success: false,
        message: "Candidate email not available",
      });
    }

    // Fetch live company profile from DB
    const COMPANY = await getCompanyProfile();

    // Build the email HTML with job description
    const salaryRange =
      job?.salaryMin && job?.salaryMax
        ? `₹${(job.salaryMin / 100000).toFixed(1)}L – ₹${(job.salaryMax / 100000).toFixed(1)}L`
        : "As per industry standards";
    const experienceRange = `${job?.experienceMin || 0}–${job?.experienceMax || 0} years`;
    const skills = (job?.skills || []).join(", ") || "Not specified";

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #1e40af; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">Job Description – ${job?.title || "Open Position"}</h2>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${clientName} via ${COMPANY.brandName}</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p>Hi ${candidate.name},</p>
          <p>Thank you for taking the time to speak with us. As discussed, here are the details of the <strong>${job?.title}</strong> opportunity at <strong>${clientName}</strong>:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Position</td>
              <td style="padding: 8px 0; font-weight: 600;">${job?.title || "—"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; color: #6b7280;">Company</td>
              <td style="padding: 8px 0;">${clientName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; color: #6b7280;">Location</td>
              <td style="padding: 8px 0;">${job?.location || "—"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; color: #6b7280;">Type</td>
              <td style="padding: 8px 0;">${job?.jobType || "Full-time"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; color: #6b7280;">Experience</td>
              <td style="padding: 8px 0;">${experienceRange}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; color: #6b7280;">CTC Range</td>
              <td style="padding: 8px 0;">${salaryRange}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Key Skills</td>
              <td style="padding: 8px 0;">${skills}</td>
            </tr>
          </table>

          ${job?.description ? `<h3 style="font-size: 14px; margin: 20px 0 8px;">About the Role</h3><div style="font-size: 13px; line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${job.description.slice(0, 3000)}</div>` : ""}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <p style="font-size: 13px;">Please review the above details and let us know your interest. We look forward to taking this forward with you.</p>
          
          <p style="font-size: 13px; margin-top: 16px;">
            Warm regards,<br/>
            <strong>${COMPANY.brandName} Team</strong><br/>
            ${COMPANY.email}<br/>
            ${COMPANY.phone}<br/>
            <a href="${COMPANY.website}" style="color: #1e40af;">${COMPANY.website}</a>
          </p>
          
          <p style="font-size: 11px; color: #9ca3af; margin-top: 16px;">
            ${COMPANY.name} | ${COMPANY.registeredOffice.address}
          </p>
        </div>
      </div>
    `;

    const subject = `Job Description – ${job?.title || "Open Position"} at ${clientName}`;

    // Send email via the notification API
    const appUrl = process.env.NEXTAUTH_URL || "https://cloudcxo.in";
    const hostname = new URL(appUrl).hostname;

    const resp = await fetch("https://apps.abacus.ai/api/sendNotificationEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_CANDIDATE_COMMUNICATION,
        subject,
        body: htmlBody,
        is_html: true,
        recipient_email: candidate.email,
        sender_email: `noreply@${hostname}`,
        sender_alias: COMPANY.brandName,
      }),
    });

    const result = await resp.json().catch(() => ({}));
    const success = result?.success !== false;

    // Log the email
    await prisma.emailLog.create({
      data: {
        candidateId: candidate.id,
        subject,
        body: htmlBody,
        recipient: candidate.email,
        templateUsed: "Voice AI - Job Description",
        status: success ? "sent" : "failed",
      },
    }).catch((e: any) => console.error("[VoiceScreening SendJDEmail] Log failed:", e?.message));

    console.log("[VoiceScreening SendJDEmail] Email sent:", {
      to: candidate.email,
      subject,
      success,
    });

    return NextResponse.json({
      success,
      message: success
        ? `Job description email sent to ${candidate.email}`
        : "Failed to send email",
      email_sent_to: candidate.email,
    });
  } catch (e: any) {
    console.error("[VoiceScreening SendJDEmail] Error:", e);
    return NextResponse.json(
      { success: false, message: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
