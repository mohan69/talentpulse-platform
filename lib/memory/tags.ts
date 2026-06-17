export function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();

  const keywords: Record<string, string[]> = {
    remote: ["remote", "wfh", "work from home", "hybrid"],
    salary: ["salary", "ctc", "compensation", "package", "lpa"],
    skill: ["skill", "experience", "background", "knowledge"],
    relocation: ["relocate", "relocation", "location", "bangalore", "mumbai", "pune", "delhi", "chennai", "hyderabad", "gurgaon", "noida"],
    notice: ["notice", "notice period", "serving", "buyout"],
    visa: ["visa", "work permit", "sponsorship", "h1b"],
    education: ["b.tech", "b.e", "m.tech", "mba", "phd", "bachelor", "master", "degree", "graduate"],
    communication: ["communication", "english", "verbal", "written"],
    team: ["team", "leadership", "management", "collaboration"],
    culture: ["culture", "fit", "value", "attitude"],
  };

  for (const [tag, patterns] of Object.entries(keywords)) {
    if (patterns.some((p) => lower.includes(p))) {
      tags.push(tag);
    }
  }

  return tags;
}

export function deriveTagsFromEntityType(entityType: string): string[] {
  const entityTags: Record<string, string[]> = {
    candidate: ["candidate"],
    client: ["client"],
    job: ["job", "requisition"],
    application: ["pipeline"],
    interview: ["interview"],
    offer: ["offer"],
    note: ["note"],
    voiceScreening: ["voice-screening"],
    whatsapp: ["whatsapp"],
    email: ["email"],
    prospect: ["prospect"],
  };
  return entityTags[entityType] ?? [];
}

export function deriveTagsFromAction(action: string): string[] {
  const actionTags: Record<string, string[]> = {
    stage_changed: ["stage-change"],
    offer_extended: ["offer-status"],
    offer_accepted: ["offer-status", "success"],
    offer_rejected: ["offer-status", "rejection"],
    candidate_joined: ["hire", "success"],
    screening_completed: ["ai-screening"],
    interview_scheduled: ["interview-scheduled"],
    interview_outcome: ["interview-completed"],
    note_added: ["recruiter-insight"],
    message_sent: ["outreach"],
    email_sent: ["outreach"],
    prospect_converted: ["prospect-conversion"],
  };
  return actionTags[action] ?? [];
}
