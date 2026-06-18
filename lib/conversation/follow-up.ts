import type { ExtractedInsight, FollowUpTask } from "@/lib/conversation/types";

export function deriveFollowUpTasks(insights: ExtractedInsight[], text = ""): FollowUpTask[] {
  const tasks: FollowUpTask[] = [];
  const lower = text.toLowerCase();

  for (const insight of insights) {
    if (insight.type === "salary_expectation") {
      tasks.push({
        title: "Confirm compensation expectations",
        reason: insight.value,
        priority: /mismatch|stretch|counter/i.test(insight.value) ? "high" : "medium",
        source: insight.source,
      });
    }
    if (insight.type === "notice_period") {
      tasks.push({
        title: "Confirm joining timeline",
        reason: insight.value,
        priority: /immediate|serving/i.test(insight.value) ? "medium" : "high",
        source: insight.source,
      });
    }
    if (insight.type === "risk_signal") {
      tasks.push({
        title: "Review candidate risk before next step",
        reason: insight.value,
        priority: "high",
        source: insight.source,
      });
    }
  }

  if (/\b(call back|follow up|tomorrow|next week|send jd|share jd|schedule)\b/i.test(text)) {
    tasks.push({
      title: lower.includes("send jd") || lower.includes("share jd") ? "Send job description" : "Follow up with candidate",
      reason: text.slice(0, 180),
      dueHint: lower.includes("tomorrow") ? "tomorrow" : lower.includes("next week") ? "next week" : undefined,
      priority: lower.includes("urgent") ? "high" : "medium",
      source: insights[0]?.source ?? "recruiter_note",
    });
  }

  const unique = new Map<string, FollowUpTask>();
  for (const task of tasks) unique.set(`${task.title}:${task.reason}`, task);
  return [...unique.values()];
}

