import type { ExtractedInsight } from "@/lib/conversation/types";

function excerpt(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[0]?.slice(0, 160);
}

export function extractInsightsFromNote(text: string, source: ExtractedInsight["source"] = "recruiter_note"): ExtractedInsight[] {
  const insights: ExtractedInsight[] = [];
  const body = text.trim();
  const lower = body.toLowerCase();
  if (!body) return insights;

  const salary = body.match(/(?:₹|rs\.?|inr)?\s?(\d+(?:\.\d+)?)\s?(?:lpa|lakhs?|lac|l|k|ctc)/i);
  if (salary) {
    insights.push({
      type: "salary_expectation",
      value: salary[0],
      source,
      confidence: 0.78,
      sentiment: "neutral",
      evidence: excerpt(body, /(?:₹|rs\.?|inr)?\s?\d+(?:\.\d+)?\s?(?:lpa|lakhs?|lac|l|k|ctc)/i),
    });
  }

  const notice = body.match(/(?:notice period|notice|joining|available|availability)[^\n.]{0,60}?(?:immediate|\d+\s?(?:days?|months?)|serving)/i);
  if (notice) {
    insights.push({
      type: "notice_period",
      value: notice[0],
      source,
      confidence: 0.82,
      sentiment: lower.includes("immediate") ? "positive" : "neutral",
      evidence: notice[0],
    });
  }

  if (/\b(remote|wfh|work from home|hybrid)\b/i.test(body)) {
    insights.push({
      type: "remote_preference",
      value: excerpt(body, /\b(remote|wfh|work from home|hybrid)[^\n.]{0,80}/i) ?? "Remote/hybrid preference mentioned",
      source,
      confidence: 0.76,
      sentiment: "neutral",
    });
  }

  const location = body.match(/(?:prefers?|preferred|open to|relocate|location)[^\n.]{0,90}/i);
  if (location) {
    insights.push({
      type: "location_preference",
      value: location[0],
      source,
      confidence: 0.7,
      sentiment: /not open|cannot|won't|avoid/i.test(location[0]) ? "negative" : "neutral",
      evidence: location[0],
    });
  }

  const skills = body.match(/(?:strong|expert|experienced|hands-on|worked).*?(?:java|python|react|node|aws|azure|kubernetes|devops|ml|ai|sql|salesforce)/i);
  if (skills) {
    insights.push({
      type: "skill_signal",
      value: skills[0],
      source,
      confidence: 0.68,
      sentiment: "positive",
      evidence: skills[0],
    });
  }

  if (/\b(counter offer|not interested|concern|risk|drop|no[- ]show|unresponsive|declined)\b/i.test(body)) {
    insights.push({
      type: "risk_signal",
      value: excerpt(body, /\b(counter offer|not interested|concern|risk|drop|no[- ]show|unresponsive|declined)[^\n.]{0,100}/i) ?? "Candidate risk mentioned",
      source,
      confidence: 0.74,
      sentiment: "negative",
    });
  }

  if (/\b(interested|available|keen|positive|wants to proceed)\b/i.test(body)) {
    insights.push({
      type: "interest_level",
      value: excerpt(body, /\b(interested|available|keen|positive|wants to proceed)[^\n.]{0,100}/i) ?? "Candidate interest mentioned",
      source,
      confidence: 0.72,
      sentiment: "positive",
    });
  }

  return insights;
}

