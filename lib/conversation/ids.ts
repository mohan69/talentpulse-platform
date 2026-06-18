import type { ConversationChannel } from "@/lib/conversation/types";

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function normalizePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_:-]/g, "_");
}

export function buildConversationId(candidateId: string, channel: ConversationChannel, date = new Date()) {
  return `conv_${normalizePart(candidateId)}_${channel}_${dateKey(date)}`;
}

