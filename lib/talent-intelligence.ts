export type TalentProfile = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  currentCity?: string | null;
  currentCompany?: string | null;
  currentDesignation?: string | null;
  totalExperience?: number | null;
  relevantExperience?: number | null;
  currentCtc?: number | null;
  expectedCtc?: number | null;
  noticePeriod?: number | null;
  skills?: string[] | null;
  aiSummary?: string | null;
  summary?: string | null;
  source?: string | null;
  applications?: { stage?: string | null; job?: { title?: string | null; location?: string | null; skills?: string[] | null; client?: { name?: string | null } | null } | null }[];
  certifications?: string[] | null;
  previousCompanies?: string[] | null;
  education?: string | null;
};

export type TalentJob = {
  title?: string | null;
  location?: string | null;
  skills?: string[] | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  client?: { name?: string | null } | null;
};

const industryKeywords: Record<string, string[]> = {
  Banking: ["bank", "finacle", "payments", "risk", "treasury", "loan", "credit"],
  Fintech: ["fintech", "wallet", "upi", "payment", "lending"],
  Manufacturing: ["manufacturing", "plant", "factory", "scm", "supply chain", "sap", "oracle scm"],
  SaaS: ["saas", "platform", "subscription", "cloud", "product"],
  Healthcare: ["health", "hospital", "clinical", "pharma", "medical"],
  Retail: ["retail", "commerce", "store", "marketplace"],
};

function textOf(profile: TalentProfile) {
  return [
    profile.name,
    profile.currentDesignation,
    profile.currentCompany,
    profile.currentCity,
    profile.aiSummary,
    profile.summary,
    profile.education,
    ...(profile.skills ?? []),
    ...(profile.certifications ?? []),
    ...(profile.previousCompanies ?? []),
    ...(profile.applications ?? []).flatMap((application) => [
      application.stage,
      application.job?.title,
      application.job?.location,
      application.job?.client?.name,
      ...(application.job?.skills ?? []),
    ]),
  ].filter(Boolean).join(" ").toLowerCase();
}

export function classifyIndustry(profile: TalentProfile) {
  const text = textOf(profile);
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) return industry;
  }
  return "General Talent";
}

export function classifySeniority(profile: TalentProfile) {
  const title = String(profile.currentDesignation ?? "").toLowerCase();
  const years = Number(profile.totalExperience ?? 0);
  if (/chief|cto|ceo|vp|director|head/.test(title) || years >= 16) return "Executive";
  if (/architect|principal|staff|lead/.test(title) || years >= 10) return "Senior / Lead";
  if (/senior|manager/.test(title) || years >= 6) return "Senior";
  if (years >= 3) return "Mid-level";
  if (years > 0) return "Early-career";
  return "Not classified";
}

export function profileMissingInformation(profile: TalentProfile) {
  return [
    !profile.email ? "Email" : null,
    !profile.phone ? "Phone" : null,
    !profile.currentCity ? "Current location" : null,
    !profile.currentCompany ? "Current company" : null,
    !profile.currentDesignation ? "Current role" : null,
    !profile.totalExperience ? "Experience" : null,
    !(profile.skills?.length) ? "Skills" : null,
    !profile.aiSummary && !profile.summary ? "Resume summary" : null,
    profile.noticePeriod == null ? "Notice period" : null,
    profile.currentCtc == null ? "Current CTC" : null,
    profile.expectedCtc == null ? "Expected CTC" : null,
  ].filter(Boolean) as string[];
}

export function buildResumeIntelligence(profile: TalentProfile, requiredSkills: string[] = []) {
  const skills = profile.skills ?? [];
  const normalizedSkills = skills.map((skill) => skill.toLowerCase());
  const matchedSkills = requiredSkills.filter((skill) => normalizedSkills.some((candidateSkill) => candidateSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(candidateSkill)));
  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
  const industry = classifyIndustry(profile);
  const seniority = classifySeniority(profile);
  const missing = profileMissingInformation(profile);
  const strengths = [
    matchedSkills.length ? `Matches ${matchedSkills.join(", ")}` : null,
    profile.totalExperience ? `${profile.totalExperience} years of total experience` : null,
    profile.currentCompany ? `Currently at ${profile.currentCompany}` : null,
    profile.currentDesignation ? `Current role: ${profile.currentDesignation}` : null,
    skills.length >= 5 ? "Broad skills coverage" : null,
  ].filter(Boolean) as string[];
  const risks = [
    missing.includes("Phone") ? "Phone not verified" : null,
    missing.includes("Notice period") ? "Joining timeline not verified" : null,
    missing.includes("Current CTC") || missing.includes("Expected CTC") ? "Compensation not fully verified" : null,
    missingSkills.length ? `Missing required skills: ${missingSkills.join(", ")}` : null,
  ].filter(Boolean) as string[];
  const executiveSummary = `${profile.name ?? "Candidate"} is a ${seniority.toLowerCase()} ${profile.currentDesignation ?? "professional"}${profile.currentCompany ? ` at ${profile.currentCompany}` : ""}${profile.currentCity ? ` in ${profile.currentCity}` : ""}. Classified under ${industry}. ${strengths[0] ?? "Profile needs recruiter qualification."}`;

  return {
    executiveSummary,
    industry,
    seniority,
    strengths,
    risks,
    missing,
    matchedSkills,
    missingSkills,
    interviewQuestions: [
      matchedSkills[0] ? `Describe your most relevant project using ${matchedSkills[0]}.` : "Which recent project best represents your strongest experience?",
      "What role, client environment and industry are you prioritizing next?",
      "What is your current notice period and realistic joining date?",
      "What compensation range would make this opportunity viable?",
    ],
    similarJobs: [
      `${seniority} ${skills[0] ?? profile.currentDesignation ?? "Consultant"}`,
      `${industry} ${profile.currentDesignation ?? "Specialist"}`,
      `${skills[1] ?? "Transformation"} Lead`,
    ],
  };
}

export function buildSubmissionCopilot(profile: TalentProfile, job?: TalentJob | null) {
  const intelligence = buildResumeIntelligence(profile, job?.skills ?? []);
  const relevantYears = profile.relevantExperience && profile.relevantExperience > 0
    ? profile.relevantExperience
    : profile.totalExperience && profile.totalExperience > 0
      ? profile.totalExperience
      : profile.currentDesignation || profile.skills?.length
        ? "Profile indicates relevant experience"
        : 0;
  const compensation = [
    profile.currentCtc ? `Current ${Math.round(profile.currentCtc / 100000)} LPA` : "Current CTC missing",
    profile.expectedCtc ? `Expected ${Math.round(profile.expectedCtc / 100000)} LPA` : "Expected CTC missing",
    job?.salaryMax ? `Client cap ${Math.round(job.salaryMax / 100000)} LPA` : null,
  ].filter(Boolean).join(" · ");

  return {
    candidateSummary: intelligence.executiveSummary,
    whyFit: intelligence.strengths.length ? intelligence.strengths.join("; ") : "Requires recruiter screening before submission.",
    skillsMatch: job?.skills?.length ? `${intelligence.matchedSkills.length}/${job.skills.length} required skills matched` : "No job skill requirement attached",
    relevantExperience: typeof relevantYears === "number" ? `${relevantYears} years relevant; ${profile.currentDesignation ?? "role not specified"}` : `${relevantYears}; ${profile.currentDesignation ?? "role not specified"}`,
    compensationSummary: compensation,
    noticeSummary: profile.noticePeriod != null ? `${profile.noticePeriod} days notice` : "Notice period not captured",
    recruiterRecommendation: intelligence.risks.length > 1 ? "Screen before submission and verify risk items." : "Good candidate for recruiter screening and client-ready package.",
  };
}

export function buildAgencyMemory(applications: TalentProfile["applications"] = []) {
  const stages = applications.map((application) => String(application.stage ?? "").toUpperCase());
  return {
    previouslySubmitted: stages.some((stage) => ["SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(stage)),
    previouslyInterviewed: stages.some((stage) => stage.includes("INTERVIEW")),
    previouslyOffered: stages.some((stage) => stage.includes("OFFER")),
    previouslyJoined: stages.includes("JOINED"),
    previouslyRejected: stages.includes("REJECTED"),
  };
}

export function buildTalentGraph(candidates: TalentProfile[], jobs: TalentJob[] = []) {
  const skills = new Set<string>();
  const roles = new Set<string>();
  const companies = new Set<string>();
  const industries = new Set<string>();
  const locations = new Set<string>();
  const clients = new Set<string>();
  const openJobs = new Set<string>();

  for (const candidate of candidates.slice(0, 80)) {
    candidate.skills?.slice(0, 8).forEach((skill) => skills.add(skill));
    if (candidate.currentDesignation) roles.add(candidate.currentDesignation);
    if (candidate.currentCompany) companies.add(candidate.currentCompany);
    if (candidate.currentCity) locations.add(candidate.currentCity);
    industries.add(classifyIndustry(candidate));
    candidate.applications?.forEach((application) => {
      if (application.job?.client?.name) clients.add(application.job.client.name);
      if (application.job?.title) openJobs.add(application.job.title);
    });
  }
  for (const job of jobs.slice(0, 30)) {
    if (job.title) openJobs.add(job.title);
    if (job.location) locations.add(job.location);
    if (job.client?.name) clients.add(job.client.name);
    job.skills?.forEach((skill) => skills.add(skill));
  }

  return {
    skills: Array.from(skills).slice(0, 12),
    roles: Array.from(roles).slice(0, 8),
    companies: Array.from(companies).slice(0, 8),
    industries: Array.from(industries).slice(0, 8),
    locations: Array.from(locations).slice(0, 8),
    clients: Array.from(clients).slice(0, 8),
    openJobs: Array.from(openJobs).slice(0, 8),
  };
}
