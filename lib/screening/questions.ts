import type { ApplicationWithScreeningData, MissingInfo, RecruiterQuestion, RiskSignal, ScreeningFacts } from "@/lib/screening/types";

function addQuestion(questions: RecruiterQuestion[], question: RecruiterQuestion) {
  if (!questions.some((existing) => existing.question === question.question)) questions.push(question);
}

export function generateNextQuestions(
  facts: ScreeningFacts,
  gaps: MissingInfo[],
  risks: RiskSignal[],
  app?: ApplicationWithScreeningData,
): RecruiterQuestion[] {
  const questions: RecruiterQuestion[] = [];

  for (const skill of facts.skillFit.missing.slice(0, 3)) {
    addQuestion(questions, {
      question: `Can you describe your hands-on experience with ${skill}?`,
      reason: "Required skill is missing or weak in the current profile data.",
      priority: "high",
      category: "skill_clarification",
    });
  }

  for (const gap of gaps) {
    if (gap.category === "current_ctc" || gap.category === "expected_ctc" || gap.category === "ctc_split") {
      addQuestion(questions, {
        question: "Can you confirm your current, fixed, variable and expected CTC?",
        reason: gap.label,
        priority: gap.severity === "high" ? "high" : "medium",
        category: "compensation",
      });
    } else if (gap.category === "notice_period" || gap.category === "notice_buyout") {
      addQuestion(questions, {
        question: "What is your confirmed notice period, buyout option and earliest joining date?",
        reason: gap.label,
        priority: gap.severity === "high" ? "high" : "medium",
        category: "joining_timeline",
      });
    } else if (gap.category === "relocation" || gap.category === "location") {
      addQuestion(questions, {
        question: `Are you comfortable working from ${facts.locationFit.jobLocation ?? "the job location"} or relocating if needed?`,
        reason: gap.label,
        priority: "high",
        category: "location",
      });
    } else if (gap.category === "reference_check") {
      addQuestion(questions, {
        question: "Can you share two recent professional references for final validation?",
        reason: gap.label,
        priority: "medium",
        category: "reference_check",
      });
    }
  }

  for (const risk of risks) {
    if (risk.type === "counter_offer") {
      addQuestion(questions, {
        question: "If your current employer makes a counter-offer, what factors would still make you join this role?",
        reason: risk.label,
        priority: "medium",
        category: "joining_risk",
      });
    } else if (risk.type === "prior_rejection") {
      addQuestion(questions, {
        question: "What has changed since the previous rejection or concern, and how should we position that improvement?",
        reason: risk.label,
        priority: "medium",
        category: "pipeline_history",
      });
    } else if (risk.type === "ctc_mismatch") {
      addQuestion(questions, {
        question: "Is there flexibility on expected compensation if the role, brand and growth path are strong?",
        reason: risk.label,
        priority: "high",
        category: "compensation",
      });
    }
  }

  if (!facts.voiceScreeningSummary && app) {
    addQuestion(questions, {
      question: "Can we complete a short screening conversation to validate communication, motivation and joining constraints?",
      reason: "No completed screening conversation exists for this application.",
      priority: "medium",
      category: "screening_call",
    });
  }

  return questions.slice(0, 10);
}

