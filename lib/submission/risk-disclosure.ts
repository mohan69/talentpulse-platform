import type { RiskSignal } from "@/lib/screening/types";
import type { RiskDisclosure } from "@/lib/submission/types";

export const DISCLOSURE_TEMPLATES: Record<string, { disclosure: string; mitigation: string }> = {
  counter_offer: {
    disclosure: "Candidate may receive a counter-offer from the current employer, which could affect acceptance.",
    mitigation: "Confirm motivations beyond compensation before offer stage.",
  },
  long_notice: {
    disclosure: "Candidate has an extended notice period that may delay joining.",
    mitigation: "Confirm buyout options, early release possibility, and backup coverage.",
  },
  ctc_mismatch: {
    disclosure: "Expected compensation exceeds the role budget and may require negotiation.",
    mitigation: "Confirm client flexibility and candidate minimum acceptable range.",
  },
  no_show: {
    disclosure: "Historical signals indicate elevated interview no-show risk.",
    mitigation: "Confirm availability 24 hours before interview and send calendar reminders.",
  },
  location_mismatch: {
    disclosure: "Candidate location does not currently match the role location.",
    mitigation: "Validate relocation, hybrid, or remote expectations before submission.",
  },
  voice_screening_concern: {
    disclosure: "Voice screening raised communication or readiness concerns.",
    mitigation: "Run a recruiter follow-up call and clarify the concern before client round.",
  },
  prior_rejection: {
    disclosure: "Candidate has a prior rejection or negative outcome in this pipeline.",
    mitigation: "Document what has changed before proceeding.",
  },
  low_match_score: {
    disclosure: "Current match score is below the ideal threshold for this role.",
    mitigation: "Re-check must-have skills and position only if client accepts the tradeoff.",
  },
};

function toDisclosure(risk: RiskSignal) {
  return (
    DISCLOSURE_TEMPLATES[risk.type] ?? {
      disclosure: risk.label,
      mitigation: "Recruiter should validate this risk before client presentation.",
    }
  );
}

export function generateRiskDisclosure(risks: RiskSignal[] = [], dismissedRisks = new Set<string>()): RiskDisclosure {
  const activeRisks = risks.filter((risk) => !dismissedRisks.has(risk.type));
  const items = activeRisks.map((risk) => {
    const template = toDisclosure(risk);
    return {
      riskType: risk.type,
      label: risk.label,
      severity: risk.severity,
      disclosure: template.disclosure,
      likelihood: risk.likelihood,
      mitigation: template.mitigation,
      dismissedByRecruiter: dismissedRisks.has(risk.type),
    };
  });

  const high = items.filter((risk) => risk.severity === "high").length;
  const medium = items.filter((risk) => risk.severity === "medium").length;
  const low = items.filter((risk) => risk.severity === "low").length;
  const noGoFlags = items.filter((item) => item.severity === "high" && item.likelihood >= 60).map((item) => item.label);

  return {
    hasRisks: items.length > 0,
    riskCount: items.length,
    highRiskCount: high,
    items,
    executiveSummary:
      items.length === 0
        ? "No material submission risks identified from available screening signals."
        : noGoFlags.length > 0
          ? `${noGoFlags.length} blocking risk(s). ${high} high, ${medium} medium, ${low} low risk(s) identified.`
          : `${high} high, ${medium} medium, ${low} low risk(s) identified and manageable with mitigation.`,
    noGoFlags,
    mitigationPlan: items.length > 0 ? items.map((item) => `${item.label}: ${item.mitigation}`).join("\n") : "No mitigation plan required.",
    disclaimer:
      "This risk assessment is generated from available profile data, conversation insights, and pipeline history. Recruiters should verify all concerns before client presentation.",
  };
}

