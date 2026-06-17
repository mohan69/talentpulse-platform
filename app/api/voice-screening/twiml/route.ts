import { NextResponse } from "next/server";
import { getCompanyProfile } from "@/lib/company";
import { tenantPrisma } from "@/lib/repositories";
import { resolveRecordTenantContext } from "@/lib/tenant/provider-context";

export const dynamic = "force-dynamic";

/**
 * Twilio webhook endpoint for voice screening calls.
 * When Twilio connects the outbound call, it hits this endpoint.
 * We call ElevenLabs register-call to get fresh TwiML per call,
 * passing the screeningId via conversation_initiation_client_data
 * so the agent can use it to fetch candidate/job context.
 */
export async function POST(req: Request) {
  try {
    // Extract screeningId from the query string (appended by our call initiation)
    const url = new URL(req.url);
    const screeningId = url.searchParams.get("screeningId") || "";

    // Parse Twilio's webhook form data
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const fromNumber = formData.get("From") as string;
    const toNumber = formData.get("To") as string;
    const callStatus = formData.get("CallStatus") as string;

    console.log("[VoiceScreening TwiML] Webhook received:", {
      callSid,
      from: fromNumber,
      to: toNumber,
      callStatus,
      screeningId,
    });

    const { tenantContext } = screeningId
      ? await resolveRecordTenantContext("voiceScreening", screeningId)
      : { tenantContext: null };
    if (screeningId && !tenantContext) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice screening was not found. Goodbye.</Say><Hangup/></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }
    const voiceScreeningRepo = tenantContext ? (tenantPrisma.voiceScreening as any).withContext(tenantContext) : tenantPrisma.voiceScreening;
    const integrationSettingRepo = tenantContext ? (tenantPrisma.integrationSetting as any).withContext(tenantContext) : tenantPrisma.integrationSetting;

    // Get ElevenLabs config
    const elevenLabs = await integrationSettingRepo.findUnique({
      where: { provider: "ELEVENLABS" },
    });
    if (!elevenLabs || !elevenLabs.isActive) {
      console.error("[VoiceScreening TwiML] ElevenLabs not configured");
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice screening is not configured. Goodbye.</Say><Hangup/></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const cfg = (elevenLabs.config as any) || {};
    const apiKey = cfg.apiKey;
    const agentId = cfg.agentId;

    if (!apiKey || !agentId) {
      console.error("[VoiceScreening TwiML] Missing ElevenLabs apiKey or agentId");
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice agent is not configured. Goodbye.</Say><Hangup/></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Look up screening to get full candidate/job/client context for the agent
    let candidateName = "";
    let jobTitle = "";
    let clientName = "";
    let requiredSkills = "";
    let experienceRange = "";
    let salaryRange = "";
    let jobLocation = "";
    let jobType = "";
    let candidateCurrentCompany = "";
    let candidateCurrentRole = "";
    let candidateExperience = "";
    let candidateSkills = "";
    let candidateCity = "";
    let candidateNoticePeriod = "";
    let candidateExpectedCtc = "";
    let candidateEmail = "";
    let jobDescription = "";
    let screeningQuestions = "";
    let webhookUrl = "";
    if (screeningId) {
      const screening = await voiceScreeningRepo.findUnique({
        where: { id: screeningId },
        include: {
          candidate: true,
          application: {
            include: {
              job: {
                include: {
                  client: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      if (screening) {
        const candidate = screening.candidate;
        const job = screening.application?.job;
        
        candidateName = candidate?.name || "";
        jobTitle = job?.title || "";
        clientName = job?.client?.name || "";
        requiredSkills = (job?.skills || []).join(", ");
        experienceRange = `${job?.experienceMin || 0}-${job?.experienceMax || 0} years`;
        salaryRange = job?.salaryMin && job?.salaryMax ? `${job.salaryMin}-${job.salaryMax} INR` : "Not disclosed";
        jobLocation = job?.location || "";
        jobType = job?.jobType || "Full-time";
        candidateCurrentCompany = candidate?.currentCompany || "";
        candidateCurrentRole = candidate?.currentDesignation || "";
        candidateExperience = candidate?.totalExperience ? `${candidate.totalExperience} years` : "";
        candidateSkills = (candidate?.skills || []).join(", ");
        candidateCity = candidate?.currentCity || "";
        candidateNoticePeriod = candidate?.noticePeriod ? `${candidate.noticePeriod} days` : "";
        candidateExpectedCtc = candidate?.expectedCtc ? `${candidate.expectedCtc} INR` : "";
        candidateEmail = candidate?.email || "";
        jobDescription = (job?.description || "").slice(0, 1500);
        
        // Build screening questions
        const customQuestions = (screening.questions as string[] | null) || [];
        const questions = customQuestions.length > 0 ? customQuestions : [
          `Tell me about your current role at ${candidateCurrentCompany || "your company"} and what you do day-to-day.`,
          `This role requires ${(job?.skills || []).slice(0, 3).join(", ")}. Can you walk me through your experience with these?`,
          `The position is based in ${jobLocation}. Are you open to this location?`,
          `What is your notice period, and what are your salary expectations?`,
          `Why are you looking for a change right now?`,
        ];
        screeningQuestions = questions.join(" | ");
        
        // Update the screening with the Twilio callSid for accurate callback matching
        await voiceScreeningRepo.update({
          where: { id: screeningId },
          data: { externalCallId: callSid },
        });
      }
    }

    // Build the webhook URL for the agent's tools
    const baseUrl = process.env.NEXTAUTH_URL || "https://cloudcxo.in";
    webhookUrl = `${baseUrl}/api/voice-screening/webhook`;
    const callbackUrl = `${baseUrl}/api/voice-screening/callback`;

    // Call ElevenLabs register-call with conversation_initiation_client_data
    // This passes the screeningId and webhook URL to the agent so its tools can work
    console.log("[VoiceScreening TwiML] Calling ElevenLabs register-call:", {
      agentId,
      from: fromNumber,
      to: toNumber,
      direction: "outbound",
      screeningId,
      candidateName,
      jobTitle,
      clientName,
      requiredSkills: requiredSkills.slice(0, 100),
    });

    const registerBody: any = {
      agent_id: agentId,
      from_number: fromNumber,
      to_number: toNumber,
      direction: "outbound",
    };

    // Pass ALL context via dynamic variables so the agent has everything it needs
    // without relying on a webhook tool call (which may fail due to network/config issues).
    // These become available to the agent as {{screening_id}}, {{candidate_name}}, etc.
    if (screeningId) {
      // Fetch live company profile from DB
      const companyProfile = await getCompanyProfile();

      // Build email-sending URL for the agent to trigger JD emails
      const sendEmailUrl = `${baseUrl}/api/voice-screening/send-jd-email`;

      registerBody.conversation_initiation_client_data = {
        dynamic_variables: {
          // Core identifiers
          screening_id: screeningId,
          webhook_url: webhookUrl,
          callback_url: callbackUrl,
          send_email_url: sendEmailUrl,
          // Candidate info
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          candidate_current_company: candidateCurrentCompany,
          candidate_current_role: candidateCurrentRole,
          candidate_experience: candidateExperience,
          candidate_skills: candidateSkills,
          candidate_city: candidateCity,
          candidate_notice_period: candidateNoticePeriod,
          candidate_expected_ctc: candidateExpectedCtc,
          // Job info
          job_title: jobTitle,
          client_name: clientName,
          required_skills: requiredSkills,
          experience_range: experienceRange,
          salary_range: salaryRange,
          job_location: jobLocation,
          job_type: jobType,
          job_description: jobDescription,
          // Company info (from DB)
          company_name: companyProfile.brandName,
          company_full_name: companyProfile.name,
          company_website: companyProfile.website,
          company_email: companyProfile.email,
          company_phone: companyProfile.phone,
          company_address: companyProfile.registeredOffice.address,
          // Screening questions
          screening_questions: screeningQuestions,
        },
      };
    }

    const regRes = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerBody),
      }
    );

    const twiml = await regRes.text();

    console.log("[VoiceScreening TwiML] ElevenLabs register-call response:", {
      status: regRes.status,
      ok: regRes.ok,
      twiml: twiml.slice(0, 500),
    });

    if (!regRes.ok) {
      console.error("[VoiceScreening TwiML] register-call failed:", twiml);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Unable to connect to voice agent. Please try again later.</Say><Hangup/></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Parse conversation_id from the TwiML to store for later transcript fetching
    // The TwiML response from register-call contains an Enqueue element with the conversation_id as a hidden parameter
    // Example: <Enqueue name="conversation_id" value="conv_xxxxx">
    let conversationId: string | null = null;
    
    // Log the full response for debugging
    console.log("[VoiceScreening TwiML] ═══ ElevenLabs Response Debug ═══");
    console.log("[VoiceScreening TwiML] Response length:", twiml.length);
    console.log("[VoiceScreening TwiML] Response status:", regRes.status);
    console.log("[VoiceScreening TwiML] First 2000 chars:", twiml.slice(0, 2000));
    
    // Try multiple patterns to extract conversation_id
    // Pattern 1: Inside Enqueue element - name="conversation_id" value="..."
    let match = twiml.match(/<Enqueue[^>]*name=["']conversation_id["'][^>]*value=["']([^"']+)["']/);
    if (!match) {
      // Pattern 2: Reverse order - value="..." name="conversation_id"
      match = twiml.match(/<Enqueue[^>]*value=["']([^"']+)["'][^>]*name=["']conversation_id["']/);
    }
    if (!match) {
      // Pattern 3: Look for any conversation_id in the entire response (case-insensitive)
      match = twiml.match(/conversation_id=["']([^"']+)["']/i);
    }
    if (!match) {
      // Pattern 4: Look for conv_ prefix (ElevenLabs conversation IDs start with conv_)
      match = twiml.match(/(conv_[a-zA-Z0-9]+)/);
    }
    
    conversationId = match?.[1] || null;
    
    console.log("[VoiceScreening TwiML] Extracted conversationId:", conversationId);
    console.log("[VoiceScreening TwiML] ═══ End Debug ═══");

    if (conversationId && screeningId) {
      try {
        const updated = await voiceScreeningRepo.update({
          where: { id: screeningId },
          data: { conversationId },
        });
        console.log("[VoiceScreening TwiML] ✓ Successfully stored conversationId:", conversationId, "for screening:", screeningId);
      } catch (e: any) {
        console.error("[VoiceScreening TwiML] ✗ Failed to store conversationId:", e?.message || e);
      }
    } else {
      console.warn("[VoiceScreening TwiML] ⚠ conversationId not found or screeningId missing:", {
        found: !!conversationId,
        conversationId: conversationId || "null",
        hasScreeningId: !!screeningId,
        screeningId: screeningId || "null",
      });
    }

    // Return the TwiML from ElevenLabs directly to Twilio
    return new Response(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e: any) {
    console.error("[VoiceScreening TwiML] Exception:", e);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred. Goodbye.</Say><Hangup/></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
