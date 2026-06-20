"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  GitCompare,
  LinkIcon,
  ListChecks,
  MapPin,
  Radar,
  Search,
  Send,
  Sparkles,
  Upload,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StageBadge } from "@/components/workspace/stage-badge";
import { cn } from "@/lib/utils";

export type SourcingCandidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  currentCity: string | null;
  preferredLocations: string[];
  willRelocate: boolean;
  currentCompany: string | null;
  currentDesignation: string | null;
  totalExperience: number;
  relevantExperience: number;
  currentCtc: number | null;
  expectedCtc: number | null;
  noticePeriod: number | null;
  skills: string[];
  source: string;
  aiSummary: string | null;
  linkedinUrl: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  applications: {
    id: string;
    stage: string;
    matchScore: number | null;
    job: {
      id: string;
      title: string;
      location: string;
      skills: string[];
      client: { name: string } | null;
    };
  }[];
};

type WorkbenchMode = "discover" | "import" | "resumes" | "api";
type ImportMode = "csv" | "naukri" | "linkedin";

type ImportRow = {
  id: string;
  selected: boolean;
  name: string;
  email: string;
  phone: string;
  currentDesignation: string;
  currentCompany: string;
  currentCity: string;
  totalExperience: string;
  currentCtc: string;
  expectedCtc: string;
  noticePeriod: string;
  skills: string;
  resumeHeadline: string;
  linkedinUrl: string;
  notes: string;
  duplicateStatus: "new" | "duplicate" | "needs_review" | "missing_required";
  duplicateReason: string;
};

type ParsedQuery = {
  role: string | null;
  targetSkills: string[];
  location: string | null;
  minExperience: number | null;
  maxNotice: number | null;
  maxComp: number | null;
  queryTokens: string[];
};

type Filters = {
  role: string;
  skills: string;
  location: string;
  minExperience: string;
  maxExperience: string;
  minCurrentCtc: string;
  maxExpectedCtc: string;
  maxNotice: string;
  source: string;
  freshness: string;
  stage: string;
  minCompleteness: string;
  availability: string;
};

type ScoredCandidate = {
  candidate: SourcingCandidate;
  score: number;
  label: string;
  matched: string[];
  missing: string[];
  risks: string[];
  nextBestAction: string;
  completeness: number;
  sourceReliability: number;
  freshnessScore: number;
  componentScores: {
    skills: number;
    role: number;
    location: number;
    experience: number;
    compensation: number;
    notice: number;
    freshness: number;
    completeness: number;
    source: number;
  };
};

type ImportHistoryItem = {
  id: string;
  action: string;
  createdAt: string;
  user?: { name: string | null } | null;
  metadata?: {
    source?: string;
    fileName?: string;
    recordsProcessed?: number;
    recordsImported?: number;
    recordsEnriched?: number;
    duplicatesSkipped?: number;
    recordsSkipped?: number;
  };
};

const examples = [
  "Find Oracle SCM consultants in Bangalore with 10+ years experience",
  "Find Manufacturing Sales Directors in Pune",
  "Find AI Architects with cloud and enterprise architecture skills",
  "Find Plant Operations Heads with Lean Six Sigma",
  "Find candidates ready for submission this week",
];

const recruiterActions = [
  "Screen Now",
  "Verify Compensation",
  "Verify Notice",
  "Request Updated Resume",
  "Submit To Client",
  "Schedule Interview",
  "Generate Submission Package",
  "Move To Offer Stage",
  "Keep Warm",
  "Archive",
];

const emptyFilters: Filters = {
  role: "",
  skills: "",
  location: "",
  minExperience: "",
  maxExperience: "",
  minCurrentCtc: "",
  maxExpectedCtc: "",
  maxNotice: "",
  source: "all",
  freshness: "all",
  stage: "all",
  minCompleteness: "",
  availability: "all",
};

const stopWords = new Set([
  "find",
  "with",
  "and",
  "the",
  "for",
  "from",
  "candidate",
  "candidates",
  "ready",
  "submission",
  "submit",
  "this",
  "week",
  "years",
  "year",
  "experience",
  "exp",
  "in",
  "under",
  "below",
  "max",
  "upto",
  "lpa",
  "ctc",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return normalize(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sourceLabel(source: string) {
  if (source === "NAUKRI") return "Naukri Imports";
  if (source === "LINKEDIN") return "LinkedIn Imports";
  if (source === "REFERRAL") return "Referrals";
  if (source === "INTERNAL_DB") return "Internal Repository";
  if (source === "OTHER") return "Resume Uploads";
  if (source === "DIRECT") return "Public Discovery Leads";
  return "Other Sources";
}

function sourceShortLabel(source: string) {
  return sourceLabel(source).replace(" Imports", "");
}

function sourceReliability(source: string) {
  if (source === "NAUKRI") return 9;
  if (source === "LINKEDIN") return 8;
  if (source === "REFERRAL") return 10;
  if (source === "INTERNAL_DB") return 7;
  if (source === "DIRECT") return 6;
  return 5;
}

function isImportedSource(source: string) {
  return source === "NAUKRI" || source === "LINKEDIN";
}

function dataBucket(source: string) {
  return isImportedSource(source) ? "Real Imported Data" : "Demo Repository Data";
}

function toDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | Date) {
  const date = toDate(value);
  if (!date) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(value: string | Date) {
  const date = toDate(value);
  if (!date) return 999;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000));
}

function latestStage(candidate: SourcingCandidate) {
  return candidate.applications[0]?.stage ?? "UNASSIGNED";
}

function profileCompleteness(candidate: SourcingCandidate) {
  const checks = [
    candidate.name,
    candidate.email,
    candidate.phone,
    candidate.currentDesignation,
    candidate.currentCompany,
    candidate.currentCity,
    candidate.totalExperience > 0,
    candidate.skills.length > 0,
    candidate.noticePeriod !== null,
    candidate.expectedCtc !== null,
    candidate.aiSummary,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function sourceFreshness(candidate: SourcingCandidate) {
  const days = daysSince(candidate.updatedAt);
  if (days <= 30) return "Fresh";
  if (days <= 90) return "Aging";
  return "Stale";
}

function getKnownSkills(candidates: SourcingCandidate[]) {
  return unique(candidates.flatMap((candidate) => [
    ...candidate.skills,
    ...candidate.applications.flatMap((application) => application.job.skills),
  ])).sort((a, b) => b.length - a.length);
}

function getKnownLocations(candidates: SourcingCandidate[]) {
  return unique(candidates.flatMap((candidate) => [
    candidate.currentCity ?? "",
    ...candidate.preferredLocations,
    ...candidate.applications.map((application) => application.job.location),
  ])).sort((a, b) => b.length - a.length);
}

function parseQuery(query: string, candidates: SourcingCandidate[]): ParsedQuery {
  const normalizedQuery = normalize(query);
  const queryTokens = tokens(query);
  const knownSkills = getKnownSkills(candidates);
  const targetSkills = knownSkills.filter((skill) => {
    const normalizedSkill = normalize(skill);
    if (normalizedQuery.includes(normalizedSkill)) return true;
    const skillTokens = tokens(skill);
    if (!skillTokens.length) return false;
    const overlap = skillTokens.filter((token) => queryTokens.includes(token)).length;
    return overlap / skillTokens.length >= 0.5;
  }).slice(0, 10);

  const location = getKnownLocations(candidates).find((candidateLocation) => {
    const normalizedLocation = normalize(candidateLocation);
    return normalizedLocation && normalizedQuery.includes(normalizedLocation);
  }) ?? null;

  const roleTokens = queryTokens.filter((token) => {
    if (targetSkills.some((skill) => normalize(skill).includes(token))) return false;
    if (location && normalize(location).includes(token)) return false;
    return true;
  });
  const exp = query.match(/(\d+)\s*\+\s*(?:years?|yrs?|exp|experience)?/i) ?? query.match(/(\d+)\s*(?:years?|yrs?)/i);
  const notice = query.match(/(?:notice|join|joining).*?(\d+)/i);
  const comp = query.match(/(?:under|below|max|upto|up to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|ctc)?/i);

  return {
    role: roleTokens.slice(0, 4).join(" ") || null,
    targetSkills,
    location,
    minExperience: exp ? Number(exp[1]) : null,
    maxNotice: notice ? Number(notice[1]) : null,
    maxComp: comp ? Number(comp[1]) * 100000 : null,
    queryTokens,
  };
}

function candidateSearchText(candidate: SourcingCandidate) {
  return normalize([
    candidate.name,
    candidate.currentDesignation,
    candidate.currentCompany,
    candidate.aiSummary,
    candidate.currentCity,
    candidate.skills.join(" "),
    candidate.applications.map((application) => `${application.job.title} ${application.job.location} ${application.job.skills.join(" ")}`).join(" "),
  ].filter(Boolean).join(" "));
}

function scoreLabel(score: number) {
  if (score >= 95) return "Exceptional";
  if (score >= 85) return "Strong Match";
  if (score >= 75) return "Good Match";
  return "Needs Review";
}

function scoreClass(score: number) {
  if (score >= 95) return "text-emerald-700";
  if (score >= 85) return "text-cyan-700";
  if (score >= 75) return "text-amber-700";
  return "text-muted-foreground";
}

function scoreCandidate(candidate: SourcingCandidate, parsed: ParsedQuery): ScoredCandidate {
  const candidateSkills = candidate.skills;
  const normalizedCandidateSkills = candidateSkills.map((skill) => normalize(skill));
  const matched = parsed.targetSkills.filter((skill) => {
    const normalizedSkill = normalize(skill);
    return normalizedCandidateSkills.some((candidateSkill) => candidateSkill.includes(normalizedSkill) || normalizedSkill.includes(candidateSkill));
  });
  const fallbackSkillHits = parsed.queryTokens.filter((token) => candidateSkills.some((skill) => normalize(skill).includes(token)));
  const missing = parsed.targetSkills.filter((skill) => !matched.includes(skill));
  const searchText = candidateSearchText(candidate);
  const titleText = normalize([candidate.currentDesignation, ...candidate.applications.map((application) => application.job.title)].filter(Boolean).join(" "));
  const roleMatched = parsed.role ? parsed.role.split(" ").some((token) => titleText.includes(token)) : parsed.queryTokens.some((token) => titleText.includes(token));
  const candidateLocations = [candidate.currentCity ?? "", ...candidate.preferredLocations, ...candidate.applications.map((application) => application.job.location)].map(normalize);
  const locationMatched = parsed.location ? candidateLocations.some((location) => location.includes(normalize(parsed.location!)) || normalize(parsed.location!).includes(location)) : true;
  const expMatched = parsed.minExperience === null || candidate.totalExperience >= parsed.minExperience;
  const compensationKnown = candidate.expectedCtc !== null || candidate.currentCtc !== null;
  const compFit = parsed.maxComp === null || (candidate.expectedCtc !== null && candidate.expectedCtc <= parsed.maxComp);
  const noticeKnown = candidate.noticePeriod !== null;
  const noticeFit = parsed.maxNotice === null || (noticeKnown && candidate.noticePeriod! <= parsed.maxNotice);
  const completeness = profileCompleteness(candidate);
  const freshnessDays = daysSince(candidate.updatedAt);
  const reliability = sourceReliability(candidate.source);

  const componentScores = {
    skills: parsed.targetSkills.length ? Math.round((matched.length / parsed.targetSkills.length) * 24) : Math.min(18, fallbackSkillHits.length * 4),
    role: roleMatched ? 14 : parsed.queryTokens.some((token) => searchText.includes(token)) ? 7 : 0,
    location: parsed.location ? (locationMatched ? 12 : candidate.willRelocate ? 6 : 0) : 8,
    experience: parsed.minExperience ? (expMatched ? 10 : candidate.totalExperience >= parsed.minExperience - 2 ? 5 : 0) : 8,
    compensation: parsed.maxComp ? (compFit ? 8 : compensationKnown ? 2 : 3) : compensationKnown ? 6 : 3,
    notice: parsed.maxNotice ? (noticeFit ? 8 : noticeKnown ? 2 : 3) : noticeKnown ? 6 : 3,
    freshness: freshnessDays <= 30 ? 8 : freshnessDays <= 90 ? 5 : 1,
    completeness: Math.round((completeness / 100) * 10),
    source: reliability,
  };
  const score = Math.min(100, Object.values(componentScores).reduce((sum, value) => sum + value, 0));
  const risks = [
    freshnessDays > 90 ? "stale profile" : null,
    completeness < 75 ? "incomplete profile" : null,
    !compensationKnown ? "compensation unknown" : null,
    !noticeKnown ? "availability unknown" : null,
    !candidate.phone ? "phone missing" : null,
  ].filter(Boolean) as string[];
  const nextBestAction = score >= 85 && !risks.includes("compensation unknown") && !risks.includes("availability unknown")
    ? "Submit To Client"
    : risks.includes("compensation unknown")
      ? "Verify Compensation"
      : risks.includes("availability unknown")
        ? "Verify Notice Period"
        : completeness < 70
          ? "Request Updated Resume"
          : score >= 75
            ? "Screen Now"
            : "Keep Warm";

  return {
    candidate,
    score,
    label: scoreLabel(score),
    matched: matched.length ? matched : candidateSkills.filter((skill) => parsed.queryTokens.some((token) => normalize(skill).includes(token))).slice(0, 5),
    missing,
    risks,
    nextBestAction,
    completeness,
    sourceReliability: reliability,
    freshnessScore: componentScores.freshness,
    componentScores,
  };
}

function passesFilters(result: ScoredCandidate, filters: Filters) {
  const c = result.candidate;
  const search = normalize([c.currentDesignation, c.applications.map((a) => a.job.title).join(" ")].join(" "));
  if (filters.role && !search.includes(normalize(filters.role))) return false;
  if (filters.skills) {
    const required = filters.skills.split(",").map((skill) => normalize(skill)).filter(Boolean);
    if (!required.every((skill) => c.skills.some((candidateSkill) => normalize(candidateSkill).includes(skill)))) return false;
  }
  if (filters.location && ![c.currentCity ?? "", ...c.preferredLocations].some((location) => normalize(location).includes(normalize(filters.location)))) return false;
  if (filters.minExperience && c.totalExperience < Number(filters.minExperience)) return false;
  if (filters.maxExperience && c.totalExperience > Number(filters.maxExperience)) return false;
  if (filters.minCurrentCtc && (c.currentCtc ?? 0) < Number(filters.minCurrentCtc) * 100000) return false;
  if (filters.maxExpectedCtc && (c.expectedCtc ?? Number.POSITIVE_INFINITY) > Number(filters.maxExpectedCtc) * 100000) return false;
  if (filters.maxNotice && (c.noticePeriod ?? Number.POSITIVE_INFINITY) > Number(filters.maxNotice)) return false;
  if (filters.source !== "all" && c.source !== filters.source) return false;
  if (filters.freshness !== "all" && sourceFreshness(c).toLowerCase() !== filters.freshness) return false;
  if (filters.stage !== "all" && latestStage(c) !== filters.stage) return false;
  if (filters.minCompleteness && result.completeness < Number(filters.minCompleteness)) return false;
  if (filters.availability === "ready" && (c.noticePeriod === null || c.noticePeriod > 30)) return false;
  if (filters.availability === "unknown" && c.noticePeriod !== null) return false;
  return true;
}

function parseDelimited(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const delimiter = text.includes("\t") && !text.includes(",") ? "\t" : ",";
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function fieldValue(row: Record<string, string>, aliases: string[]) {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalize(key), value]));
  for (const alias of aliases) {
    const key = Object.keys(normalized).find((candidate) => candidate === normalize(alias) || candidate.includes(normalize(alias)));
    if (key) return normalized[key] ?? "";
  }
  return "";
}

function findDuplicate(row: Pick<ImportRow, "email" | "phone" | "name" | "currentCompany">, candidates: SourcingCandidate[]) {
  const email = normalize(row.email);
  const phone = row.phone.replace(/[^\d+]/g, "");
  const name = normalize(row.name);
  const company = normalize(row.currentCompany);
  return candidates.find((candidate) => {
    if (email && normalize(candidate.email) === email) return true;
    if (phone && candidate.phone?.replace(/[^\d+]/g, "") === phone) return true;
    return Boolean(name && company && normalize(candidate.name) === name && normalize(candidate.currentCompany ?? "") === company);
  });
}

function mapRows(text: string, importMode: ImportMode, candidates: SourcingCandidate[]) {
  const parsed = parseDelimited(text);
  const headers = parsed[0] ?? [];
  const dataRows = parsed.slice(1);
  const rows = dataRows.map((values, index) => {
    const raw = Object.fromEntries(headers.map((header, idx) => [header, values[idx] ?? ""]));
    const row: ImportRow = {
      id: `${Date.now()}-${index}`,
      selected: true,
      name: fieldValue(raw, ["name", "candidate name", "full name"]),
      email: fieldValue(raw, ["email", "email id", "mail"]),
      phone: fieldValue(raw, ["phone", "mobile", "contact", "telephone"]),
      currentDesignation: fieldValue(raw, ["current title", "designation", "title", "current designation", "headline"]),
      currentCompany: fieldValue(raw, ["current company", "company", "employer", "organization"]),
      currentCity: fieldValue(raw, ["location", "city", "current location"]),
      totalExperience: fieldValue(raw, ["experience", "total experience", "exp"]),
      currentCtc: fieldValue(raw, ["current ctc", "ctc"]),
      expectedCtc: fieldValue(raw, ["expected ctc", "expected salary"]),
      noticePeriod: fieldValue(raw, ["notice period", "notice"]),
      skills: fieldValue(raw, ["skills", "key skills", "skill"]),
      resumeHeadline: fieldValue(raw, ["resume headline", "headline", "summary"]),
      linkedinUrl: fieldValue(raw, ["profile url", "linkedin", "linkedin url"]),
      notes: fieldValue(raw, ["notes", "comments"]),
      duplicateStatus: "new",
      duplicateReason: "",
    };
    const duplicate = findDuplicate(row, candidates);
    if (!row.name || !row.email.includes("@")) {
      row.selected = false;
      row.duplicateStatus = "missing_required";
      row.duplicateReason = "Name and valid email required by current repository schema.";
    } else if (duplicate) {
      row.duplicateStatus = "duplicate";
      row.duplicateReason = `Matches ${duplicate.name}`;
    } else if (importMode === "linkedin" && !row.linkedinUrl) {
      row.duplicateStatus = "needs_review";
      row.duplicateReason = "LinkedIn URL missing.";
    }
    return row;
  });
  return { rows, columns: headers };
}

function sourceStats(candidates: SourcingCandidate[], scored: ScoredCandidate[], history: ImportHistoryItem[]) {
  const sourceKeys = ["INTERNAL_DB", "NAUKRI", "LINKEDIN", "OTHER", "REFERRAL", "DIRECT"];
  const totalCandidates = Math.max(1, candidates.length);
  return sourceKeys.map((source) => {
    const rows = candidates.filter((candidate) => candidate.source === source || (source === "OTHER" && !["INTERNAL_DB", "NAUKRI", "LINKEDIN", "REFERRAL", "DIRECT"].includes(candidate.source)));
    const sourceScores = scored.filter((result) => rows.some((candidate) => candidate.id === result.candidate.id));
    const fresh = rows.filter((candidate) => daysSince(candidate.updatedAt) <= 30).length;
    const lastImport = history.find((item) => item.metadata?.source === source)?.createdAt;
    const duplicates = new Set<string>();
    const duplicateCount = rows.filter((candidate) => {
      const key = normalize(candidate.email || `${candidate.name}-${candidate.currentCompany ?? ""}`);
      if (duplicates.has(key)) return true;
      duplicates.add(key);
      return false;
    }).length;
    const avgScore = sourceScores.length ? Math.round(sourceScores.reduce((sum, result) => sum + result.score, 0) / sourceScores.length) : 0;
    const avgCompleteness = rows.length ? Math.round(rows.reduce((sum, candidate) => sum + profileCompleteness(candidate), 0) / rows.length) : 0;
    const duplicateRate = rows.length ? Math.round((duplicateCount / rows.length) * 100) : 0;
    return {
      source,
      label: sourceLabel(source),
      total: rows.length,
      percentage: Math.round((rows.length / totalCandidates) * 100),
      fresh,
      avgScore,
      avgCompleteness,
      lastImport,
      duplicateRate,
      health: rows.length === 0 ? "No Data" : duplicateRate > 10 || avgCompleteness < 60 ? "Review" : "Healthy",
    };
  });
}

function distribution(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, count]) => ({ label, count }));
}

export function SourcingIntelligenceClient({ candidates, loadError }: { candidates: SourcingCandidate[]; loadError?: string }) {
  const [mode, setMode] = useState<WorkbenchMode>("discover");
  const [importMode, setImportMode] = useState<ImportMode>("naukri");
  const [query, setQuery] = useState(examples[0]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<ScoredCandidate | null>(null);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [manualText, setManualText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [resumeQueue, setResumeQueue] = useState<{ name: string; status: string }[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("talentpulse_sourcing_shortlist");
    if (saved) setShortlistIds(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("talentpulse_sourcing_shortlist", JSON.stringify(shortlistIds));
  }, [shortlistIds]);

  useEffect(() => {
    void fetch("/api/sourcing/import").then((res) => res.json()).then(setHistory).catch(() => setHistory([]));
  }, []);

  const parsed = useMemo(() => parseQuery(query, candidates), [query, candidates]);
  const allScored = useMemo(() => candidates.map((candidate) => scoreCandidate(candidate, parsed)), [candidates, parsed]);
  const results = useMemo(() => allScored.filter((result) => passesFilters(result, filters)).sort((a, b) => b.score - a.score), [allScored, filters]);
  const topResults = results.slice(0, 18);
  const shortlisted = useMemo(() => shortlistIds.map((id) => allScored.find((result) => result.candidate.id === id)).filter(Boolean) as ScoredCandidate[], [allScored, shortlistIds]);
  const compared = useMemo(() => compareIds.map((id) => allScored.find((result) => result.candidate.id === id)).filter(Boolean) as ScoredCandidate[], [allScored, compareIds]);
  const stats = useMemo(() => sourceStats(candidates, allScored, history), [candidates, allScored, history]);
  const kpis = useMemo(() => {
    const active = candidates.filter((candidate) => !["REJECTED", "JOINED"].includes(latestStage(candidate))).length;
    const fresh = candidates.filter((candidate) => daysSince(candidate.updatedAt) <= 30).length;
    const ready = allScored.filter((result) => result.score >= 85 && result.risks.length <= 1).length;
    const high = allScored.filter((result) => result.score >= 85).length;
    return { total: candidates.length, active, fresh, ready, shortlisted: shortlistIds.length, high };
  }, [candidates, allScored, shortlistIds.length]);
  const charts = useMemo(() => ({
    sources: stats.map((item) => ({ label: item.label, count: item.total })),
    skills: distribution(candidates.flatMap((candidate) => candidate.skills), 10),
    locations: distribution(candidates.map((candidate) => candidate.currentCity ?? "Unknown"), 8),
    experience: distribution(candidates.map((candidate) => candidate.totalExperience >= 15 ? "15+ yrs" : candidate.totalExperience >= 10 ? "10-14 yrs" : candidate.totalExperience >= 5 ? "5-9 yrs" : "0-4 yrs"), 4),
    freshness: distribution(candidates.map(sourceFreshness), 3),
  }), [candidates, stats]);

  function toggleShortlist(id: string) {
    setShortlistIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 4 ? current : [...current, id]);
  }

  async function handleFile(file?: File | null) {
    if (!file) return;
    setFileName(file.name);
    setImportMessage(null);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      setPreviewRows([]);
      setDetectedColumns([]);
      setImportMessage("XLSX upload received. Export the sheet as CSV or paste rows below for safe import in this build.");
      return;
    }
    const mapped = mapRows(await file.text(), importMode, candidates);
    setDetectedColumns(mapped.columns);
    setPreviewRows(mapped.rows);
  }

  function previewManualText() {
    const mapped = mapRows(manualText, importMode, candidates);
    setFileName(`${importMode}-manual-paste.csv`);
    setDetectedColumns(mapped.columns);
    setPreviewRows(mapped.rows);
    setImportMessage(null);
  }

  function queueResumes(files?: FileList | null) {
    if (!files) return;
    setResumeQueue(Array.from(files).map((file) => ({ name: file.name, status: file.name.toLowerCase().match(/\.(pdf|docx)$/) ? "Pending extraction" : "Unsupported file type" })));
  }

  async function importSelectedRows() {
    setImporting(true);
    setImportMessage(null);
    try {
      const rows = previewRows.filter((row) => row.selected && row.duplicateStatus !== "missing_required");
      const source = importMode === "naukri" ? "NAUKRI" : importMode === "linkedin" ? "LINKEDIN" : "OTHER";
      const response = await fetch("/api/sourcing/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, fileName, rows }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Import failed");
      setImportMessage(`Imported ${body.summary.recordsImported}, enriched ${body.summary.recordsEnriched}, skipped ${body.summary.duplicatesSkipped + body.summary.recordsSkipped}. Refresh to see new repository records.`);
      const refreshed = await fetch("/api/sourcing/import").then((res) => res.json()).catch(() => []);
      setHistory(refreshed);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function exportShortlist() {
    const header = ["Name", "Title", "Location", "Experience", "Source", "Score", "Missing Skills", "Risks"];
    const rows = shortlisted.map((result) => [
      result.candidate.name,
      result.candidate.currentDesignation ?? "",
      result.candidate.currentCity ?? "",
      result.candidate.totalExperience,
      sourceShortLabel(result.candidate.source),
      result.score,
      result.missing.join("; "),
      result.risks.join("; "),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "talentpulse-shortlist.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function runRecruiterAction(result: ScoredCandidate, action: string) {
    const applicationId = result.candidate.applications[0]?.id;
    if (action === "Generate Submission Package") {
      const url = applicationId
        ? `/admin/submission-intelligence/package?applicationId=${applicationId}`
        : `/admin/submission-intelligence/package?candidateId=${result.candidate.id}`;
      window.open(url, "_blank");
      return;
    }
    setActionMessage(`${result.candidate.name}: ${action} in progress...`);
    const response = await fetch("/api/recruiter-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        applicationId,
        candidateId: result.candidate.id,
        source: "sourcing-command-center",
      }),
    });
    const body = await response.json().catch(() => ({}));
    setActionMessage(response.ok ? body.message : body.error ?? "Action failed");
  }

  if (loadError) {
    return <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-700"><div className="font-semibold">Unable to load Talent Repository data</div><p className="mt-2 text-sm">{loadError}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800">
        Naukri and LinkedIn sourcing currently works through recruiter-authorized exports/manual imports. Direct portal scraping is not enabled.
      </div>

      <CommandCenter kpis={kpis} stats={stats} />

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { id: "discover", label: "Talent Repository", icon: Radar, copy: "Search local and imported profiles." },
          { id: "import", label: "Upload CSV/XLSX", icon: FileSpreadsheet, copy: "Naukri exports and LinkedIn manual files." },
          { id: "resumes", label: "Upload Resumes", icon: FileText, copy: "Queue PDF/DOCX extraction." },
          { id: "api", label: "Future API Connector", icon: Sparkles, copy: "Official provider APIs only." },
        ].map((item) => (
          <button key={item.id} type="button" onClick={() => setMode(item.id as WorkbenchMode)} className={cn("rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50", mode === item.id && "border-primary bg-primary/5")}>
            <item.icon className="mb-3 h-5 w-5 text-primary" />
            <div className="font-medium">{item.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.copy}</div>
          </button>
        ))}
      </section>

      {mode === "discover" && (
        <>
          <DiscoveryWorkbench
            query={query}
            setQuery={setQuery}
            parsed={parsed}
            filters={filters}
            setFilters={setFilters}
            results={topResults}
            totalResults={results.length}
            shortlistIds={shortlistIds}
            compareIds={compareIds}
            toggleShortlist={toggleShortlist}
            toggleCompare={toggleCompare}
            setSelected={setSelected}
            actionMessage={actionMessage}
            setActionMessage={setActionMessage}
            runRecruiterAction={runRecruiterAction}
          />
          <ShortlistWorkbench
            shortlisted={shortlisted}
            compared={compared}
            compareIds={compareIds}
            toggleShortlist={toggleShortlist}
            toggleCompare={toggleCompare}
            exportShortlist={exportShortlist}
            setActionMessage={setActionMessage}
          />
          <SourceAndCharts stats={stats} charts={charts} />
        </>
      )}

      {mode === "import" && (
        <ImportWorkbench
          importMode={importMode}
          setImportMode={setImportMode}
          fileName={fileName}
          detectedColumns={detectedColumns}
          previewRows={previewRows}
          selectedImportRows={previewRows.filter((row) => row.selected && row.duplicateStatus !== "missing_required")}
          importMessage={importMessage}
          importing={importing}
          manualText={manualText}
          setManualText={setManualText}
          handleFile={handleFile}
          previewManualText={previewManualText}
          setPreviewRows={setPreviewRows}
          importSelectedRows={importSelectedRows}
          history={history}
        />
      )}

      {mode === "resumes" && <ResumeUpload queueResumes={queueResumes} resumeQueue={resumeQueue} />}
      {mode === "api" && <FutureApiConnector />}

      <CandidateDrawer selected={selected} setSelected={setSelected} />
    </div>
  );
}

function CommandCenter({ kpis, stats }: { kpis: { total: number; active: number; fresh: number; ready: number; shortlisted: number; high: number }; stats: ReturnType<typeof sourceStats> }) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Sourcing Command Center</h2>
          <p className="text-sm text-muted-foreground">Executive view of talent supply, source quality and shortlist readiness.</p>
        </div>
        <Badge variant="outline" className="w-fit">Client-side search target: under 1 second after load</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total Candidates" value={kpis.total} icon={Users} />
        <Kpi label="Active Candidates" value={kpis.active} icon={UserCheck} />
        <Kpi label="Fresh Profiles" value={kpis.fresh} icon={Clock} />
        <Kpi label="Ready To Submit" value={kpis.ready} icon={Send} />
        <Kpi label="Shortlisted" value={kpis.shortlisted} icon={ListChecks} />
        <Kpi label="High Match" value={kpis.high} icon={Sparkles} />
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {stats.slice(0, 6).map((item) => (
          <div key={item.source} className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{item.label}</div>
              <Badge variant={item.health === "Healthy" ? "default" : "secondary"}>{item.health}</Badge>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="font-display text-3xl font-bold">{item.total}</div>
              <div className="text-right text-xs text-muted-foreground">{item.percentage}% of pool<br />{item.fresh} fresh</div>
            </div>
            <Progress value={item.total ? Math.round((item.fresh / item.total) * 100) : 0} className="mt-3 h-2" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function DiscoveryWorkbench(props: {
  query: string;
  setQuery: (value: string) => void;
  parsed: ParsedQuery;
  filters: Filters;
  setFilters: (value: Filters) => void;
  results: ScoredCandidate[];
  totalResults: number;
  shortlistIds: string[];
  compareIds: string[];
  toggleShortlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  setSelected: (value: ScoredCandidate) => void;
  actionMessage: string | null;
  setActionMessage: (value: string | null) => void;
  runRecruiterAction: (result: ScoredCandidate, action: string) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[310px_1fr_320px]">
      <AdvancedFilters filters={props.filters} setFilters={props.setFilters} />
      <div className="rounded-xl bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Radar className="h-5 w-5" /></div>
          <div>
            <h2 className="font-display text-xl font-semibold">Natural Language Sourcing</h2>
            <p className="text-sm text-muted-foreground">{props.totalResults} ranked candidates after filters</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={props.query} onChange={(event) => props.setQuery(event.target.value)} className="h-11 pl-9 text-base" placeholder="Find Oracle SCM consultants in Bangalore with 10+ years experience" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => <button key={example} type="button" onClick={() => props.setQuery(example)} className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">{example}</button>)}
        </div>
        {props.actionMessage && <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">{props.actionMessage}</div>}
        <div className="mt-5 space-y-3">
          {props.results.map((result) => (
            <CandidateCard
              key={result.candidate.id}
              result={result}
              shortlisted={props.shortlistIds.includes(result.candidate.id)}
              compared={props.compareIds.includes(result.candidate.id)}
              onOpen={() => props.setSelected(result)}
              onShortlist={() => props.toggleShortlist(result.candidate.id)}
              onCompare={() => props.toggleCompare(result.candidate.id)}
              onAction={(action) => props.runRecruiterAction(result, action)}
            />
          ))}
          {props.results.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No candidates match the current query and filters.</div>}
        </div>
      </div>
      <IntentPanel parsed={props.parsed} />
    </section>
  );
}

function AdvancedFilters({ filters, setFilters }: { filters: Filters; setFilters: (value: Filters) => void }) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters({ ...filters, [key]: value });
  }
  return (
    <aside className="rounded-xl bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Advanced Filters</h2>
        <Button size="sm" variant="ghost" onClick={() => setFilters(emptyFilters)}>Reset</Button>
      </div>
      <div className="space-y-3">
        <FilterInput label="Role" value={filters.role} onChange={(value) => set("role", value)} />
        <FilterInput label="Skills" value={filters.skills} onChange={(value) => set("skills", value)} placeholder="Oracle SCM, Fusion" />
        <FilterInput label="Location" value={filters.location} onChange={(value) => set("location", value)} />
        <div className="grid grid-cols-2 gap-2">
          <FilterInput label="Min Exp" value={filters.minExperience} onChange={(value) => set("minExperience", value)} />
          <FilterInput label="Max Exp" value={filters.maxExperience} onChange={(value) => set("maxExperience", value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FilterInput label="Min Current CTC" value={filters.minCurrentCtc} onChange={(value) => set("minCurrentCtc", value)} />
          <FilterInput label="Max Expected CTC" value={filters.maxExpectedCtc} onChange={(value) => set("maxExpectedCtc", value)} />
        </div>
        <FilterInput label="Max Notice Period" value={filters.maxNotice} onChange={(value) => set("maxNotice", value)} />
        <SelectLike label="Source" value={filters.source} onChange={(value) => set("source", value)} options={[["all", "All sources"], ["INTERNAL_DB", "Internal Repository"], ["NAUKRI", "Naukri"], ["LINKEDIN", "LinkedIn"], ["OTHER", "Resume Uploads"], ["REFERRAL", "Referrals"], ["DIRECT", "Public Discovery"]]} />
        <SelectLike label="Freshness" value={filters.freshness} onChange={(value) => set("freshness", value)} options={[["all", "All"], ["fresh", "Fresh"], ["aging", "Aging"], ["stale", "Stale"]]} />
        <SelectLike label="Pipeline Stage" value={filters.stage} onChange={(value) => set("stage", value)} options={[["all", "All"], ["UNASSIGNED", "Unassigned"], ["NEW", "New"], ["REVIEWED", "Reviewed"], ["SUBMITTED", "Submitted"], ["INTERVIEW_SCHEDULED", "Interview Scheduled"]]} />
        <FilterInput label="Min Completeness" value={filters.minCompleteness} onChange={(value) => set("minCompleteness", value)} />
        <SelectLike label="Availability" value={filters.availability} onChange={(value) => set("availability", value)} options={[["all", "All"], ["ready", "Ready within 30 days"], ["unknown", "Unknown availability"]]} />
      </div>
    </aside>
  );
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function SelectLike({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function IntentPanel({ parsed }: { parsed: ParsedQuery }) {
  return (
    <aside className="rounded-xl bg-card p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Parsed Intent</h2>
      <p className="mt-1 text-sm text-muted-foreground">The recruiter query is interpreted into structured sourcing signals.</p>
      <div className="mt-5 space-y-3">
        <Signal label="Role" value={parsed.role ?? "No role detected"} />
        <Signal label="Skills" value={parsed.targetSkills.length ? parsed.targetSkills.join(", ") : "No explicit skills detected"} />
        <Signal label="Location" value={parsed.location ?? "No location constraint"} />
        <Signal label="Experience" value={parsed.minExperience ? `${parsed.minExperience}+ years` : "No experience constraint"} />
        <Signal label="Notice Period" value={parsed.maxNotice ? `${parsed.maxNotice} days max` : "No notice constraint"} />
        <Signal label="Compensation" value={parsed.maxComp ? `Max ${Math.round(parsed.maxComp / 100000)} LPA` : "No compensation cap"} />
      </div>
    </aside>
  );
}

function CandidateCard({ result, shortlisted, compared, onOpen, onShortlist, onCompare, onAction }: {
  result: ScoredCandidate;
  shortlisted: boolean;
  compared: boolean;
  onOpen: () => void;
  onShortlist: () => void;
  onCompare: () => void;
  onAction: (action: string) => void;
}) {
  const candidate = result.candidate;
  const stage = latestStage(candidate);
  return (
    <div className="rounded-xl border bg-background p-4 transition-colors hover:border-primary/50">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{candidate.name}</h3>
            {stage !== "UNASSIGNED" && <StageBadge stage={stage as any} />}
            <Badge variant="outline">{sourceShortLabel(candidate.source)}</Badge>
            <Badge variant={isImportedSource(candidate.source) ? "default" : "secondary"}>{dataBucket(candidate.source)}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{candidate.currentDesignation ?? "Role not specified"}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{candidate.currentCity ?? "Location not specified"}</span>
            <span>{candidate.totalExperience} yrs</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{sourceFreshness(candidate)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, 7).map((skill) => <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>)}
          </div>
        </button>
        <div className="w-full shrink-0 xl:w-44">
          <div className={cn("text-right font-display text-4xl font-bold", scoreClass(result.score))}>{result.score}</div>
          <div className="mb-2 text-right text-xs text-muted-foreground">{result.label}</div>
          <Progress value={result.score} className="h-2" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ExplainabilityList title="Matched" values={result.matched} positive />
        <ExplainabilityList title="Missing" values={result.missing} />
        <ExplainabilityList title="Risks" values={result.risks} />
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={shortlisted ? "default" : "outline"} onClick={onShortlist}>{shortlisted ? "Remove Shortlist" : "Add to Shortlist"}</Button>
          <Button size="sm" variant={compared ? "default" : "outline"} onClick={onCompare}><GitCompare className="h-4 w-4" /> Compare</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {recruiterActions.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === result.nextBestAction ? "default" : action === "Archive" ? "ghost" : "outline"}
                onClick={() => onAction(action)}
              >
                {action === "Archive" && <Archive className="h-4 w-4" />}
                {action}
              </Button>
            ))}
          </div>
          <button type="button" onClick={onOpen} className="flex items-center gap-1 text-sm text-primary">Details <ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function ExplainabilityList({ title, values, positive = false }: { title: string; values: string[]; positive?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5">
        {values.length > 0 ? values.slice(0, 5).map((value) => (
          <div key={value} className="flex items-center gap-2 text-sm">
            {positive ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-rose-600" />}
            <span>{value}</span>
          </div>
        )) : <div className="text-sm text-muted-foreground">{positive ? "No explicit match" : "None detected"}</div>}
      </div>
    </div>
  );
}

function ShortlistWorkbench({ shortlisted, compared, compareIds, toggleShortlist, toggleCompare, exportShortlist, setActionMessage }: {
  shortlisted: ScoredCandidate[];
  compared: ScoredCandidate[];
  compareIds: string[];
  toggleShortlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  exportShortlist: () => void;
  setActionMessage: (value: string | null) => void;
}) {
  function packageUrl(result: ScoredCandidate) {
    const applicationId = result.candidate.applications[0]?.id;
    return applicationId
      ? `/admin/submission-intelligence/package?applicationId=${applicationId}`
      : `/admin/submission-intelligence/package?candidateId=${result.candidate.id}`;
  }

  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Shortlist Workbench</h2>
          <p className="text-sm text-muted-foreground">Persisted in browser state for fast demo shortlisting, comparison and export.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!shortlisted.length} onClick={exportShortlist}><Download className="h-4 w-4" /> Export shortlist</Button>
          <Button disabled={!shortlisted.length} onClick={() => setActionMessage("Move to pipeline queued. Select a requisition in the pipeline flow to attach shortlisted candidates.")}>Move to pipeline</Button>
          <Button variant="outline" disabled={!shortlisted.length} onClick={() => setActionMessage("Submission preparation starts from Intelligence Workbench once a requisition/application is selected.")}>Prepare submission package</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {shortlisted.map((result) => (
          <div key={result.candidate.id} className="rounded-lg border bg-background p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{result.candidate.name}</div>
                <div className="text-xs text-muted-foreground">{result.candidate.currentDesignation ?? "Role not specified"}</div>
              </div>
              <Badge>{result.score}</Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleCompare(result.candidate.id)}>{compareIds.includes(result.candidate.id) ? "Uncompare" : "Compare"}</Button>
              <Button size="sm" variant="outline" onClick={() => window.open(packageUrl(result), "_blank")}>Generate Package</Button>
              <Button size="sm" variant="ghost" onClick={() => toggleShortlist(result.candidate.id)}>Remove</Button>
            </div>
          </div>
        ))}
        {!shortlisted.length && <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">No candidates shortlisted yet.</div>}
      </div>
      {compared.length > 0 && <ComparisonView compared={compared} />}
    </section>
  );
}

function ComparisonView({ compared }: { compared: ScoredCandidate[] }) {
  const fields = [
    ["Current Title", (r: ScoredCandidate) => r.candidate.currentDesignation ?? "-"],
    ["Location", (r: ScoredCandidate) => r.candidate.currentCity ?? "-"],
    ["Experience", (r: ScoredCandidate) => `${r.candidate.totalExperience} yrs`],
    ["Skills", (r: ScoredCandidate) => r.candidate.skills.slice(0, 5).join(", ") || "-"],
    ["Notice Period", (r: ScoredCandidate) => r.candidate.noticePeriod !== null ? `${r.candidate.noticePeriod} days` : "Unknown"],
    ["Current CTC", (r: ScoredCandidate) => r.candidate.currentCtc ? `${Math.round(r.candidate.currentCtc / 100000)} LPA` : "Unknown"],
    ["Expected CTC", (r: ScoredCandidate) => r.candidate.expectedCtc ? `${Math.round(r.candidate.expectedCtc / 100000)} LPA` : "Unknown"],
    ["Source", (r: ScoredCandidate) => sourceShortLabel(r.candidate.source)],
    ["Match Score", (r: ScoredCandidate) => `${r.score} (${r.label})`],
    ["Missing Skills", (r: ScoredCandidate) => r.missing.join(", ") || "None"],
    ["Risk Signals", (r: ScoredCandidate) => r.risks.join(", ") || "None"],
  ] as const;
  return (
    <div className="mt-5 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Compare</TableHead>
            {compared.map((result) => <TableHead key={result.candidate.id}>{result.candidate.name}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map(([label, getter]) => (
            <TableRow key={label}>
              <TableCell className="font-medium">{label}</TableCell>
              {compared.map((result) => <TableCell key={result.candidate.id}>{getter(result)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SourceAndCharts({ stats, charts }: { stats: ReturnType<typeof sourceStats>; charts: { sources: { label: string; count: number }[]; skills: { label: string; count: number }[]; locations: { label: string; count: number }[]; experience: { label: string; count: number }[]; freshness: { label: string; count: number }[] } }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="rounded-xl bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Source Intelligence</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {stats.map((item) => (
            <div key={item.source} className="rounded-lg border bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-semibold">{item.label}</div><div className="text-xs text-muted-foreground">Last import: {item.lastImport ? formatDate(item.lastImport) : "No import recorded"}</div></div>
                <Badge variant={item.health === "Healthy" ? "default" : "secondary"}>{item.health}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <Mini label="Records" value={item.total} />
                <Mini label="Fresh" value={item.fresh} />
                <Mini label="Avg Match" value={item.avgScore} />
                <Mini label="Completeness" value={`${item.avgCompleteness}%`} />
                <Mini label="Dup Rate" value={`${item.duplicateRate}%`} />
                <Mini label="Health" value={item.health} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-card p-5 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Visualization</h2>
        <div className="mt-4 space-y-5">
          <BarBlock title="Source Distribution" data={charts.sources} />
          <BarBlock title="Skills Distribution" data={charts.skills} />
          <BarBlock title="Location Distribution" data={charts.locations} />
          <BarBlock title="Experience Distribution" data={charts.experience} />
          <BarBlock title="Freshness Distribution" data={charts.freshness} />
        </div>
      </div>
    </section>
  );
}

function BarBlock({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="space-y-2">
        {data.filter((item) => item.count > 0).map((item) => (
          <div key={item.label} className="grid grid-cols-[120px_1fr_36px] items-center gap-2 text-xs">
            <div className="truncate text-muted-foreground">{item.label}</div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (item.count / max) * 100)}%` }} /></div>
            <div className="text-right font-medium">{item.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportWorkbench(props: {
  importMode: ImportMode;
  setImportMode: (value: ImportMode) => void;
  fileName: string;
  detectedColumns: string[];
  previewRows: ImportRow[];
  selectedImportRows: ImportRow[];
  importMessage: string | null;
  importing: boolean;
  manualText: string;
  setManualText: (value: string) => void;
  handleFile: (file?: File | null) => void;
  previewManualText: () => void;
  setPreviewRows: (rows: ImportRow[]) => void;
  importSelectedRows: () => void;
  history: ImportHistoryItem[];
}) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Source Import Center</h2>
          <p className="text-sm text-muted-foreground">Preview, map and de-duplicate before saving into the Talent Repository.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["naukri", "linkedin", "csv"] as ImportMode[]).map((mode) => <Button key={mode} variant={props.importMode === mode ? "default" : "outline"} onClick={() => props.setImportMode(mode)}>{mode === "csv" ? "CSV/XLSX" : mode === "naukri" ? "Naukri Export" : "LinkedIn Manual"}</Button>)}
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Upload export</div>
          <Input type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={(event) => void props.handleFile(event.target.files?.[0])} />
          <p className="mt-2 text-xs text-muted-foreground">CSV/TSV preview immediately. XLSX is accepted but requires CSV export in this build.</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Manual paste</div>
          <Textarea value={props.manualText} onChange={(event) => props.setManualText(event.target.value)} rows={5} placeholder={"name,email,phone,title,company,location,skills\nAsha Rao,asha@example.com,+91...,Oracle SCM Consultant,Infosys,Bangalore,\"Oracle SCM, Fusion\""} />
          <Button className="mt-3" variant="outline" onClick={props.previewManualText}>Preview pasted rows</Button>
        </div>
      </div>
      {props.importMessage && <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">{props.importMessage}</div>}
      <div className="mt-5 grid gap-4 xl:grid-cols-[280px_1fr]">
        <div className="rounded-lg border p-4 text-sm">
          <div className="font-medium">Import Preview</div>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <div>File: {props.fileName || "No file selected"}</div>
            <div>Detected columns: {props.detectedColumns.length || 0}</div>
            <div>Rows previewed: {props.previewRows.length}</div>
            <div>Import count: {props.selectedImportRows.length}</div>
          </div>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead className="w-10">Use</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Company</TableHead><TableHead>Duplicate status</TableHead></TableRow></TableHeader>
            <TableBody>
              {props.previewRows.slice(0, 50).map((row) => (
                <TableRow key={row.id}>
                  <TableCell><input type="checkbox" checked={row.selected} disabled={row.duplicateStatus === "missing_required"} onChange={(event) => props.setPreviewRows(props.previewRows.map((item) => item.id === row.id ? { ...item, selected: event.target.checked } : item))} /></TableCell>
                  <TableCell>{row.name || "-"}</TableCell>
                  <TableCell>{row.email || "-"}</TableCell>
                  <TableCell>{row.currentDesignation || "-"}</TableCell>
                  <TableCell>{row.currentCompany || "-"}</TableCell>
                  <TableCell><Badge variant={row.duplicateStatus === "new" ? "default" : row.duplicateStatus === "duplicate" ? "secondary" : "destructive"}>{row.duplicateStatus.replace(/_/g, " ")}</Badge>{row.duplicateReason && <div className="mt-1 text-xs text-muted-foreground">{row.duplicateReason}</div>}</TableCell>
                </TableRow>
              ))}
              {props.previewRows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Upload or paste rows to preview before import.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button disabled={props.importing || props.selectedImportRows.length === 0} onClick={props.importSelectedRows}><Upload className="h-4 w-4" /> Import {props.selectedImportRows.length} selected</Button>
      </div>
      <ImportHistory history={props.history} />
    </section>
  );
}

function ImportHistory({ history }: { history: ImportHistoryItem[] }) {
  return (
    <div className="mt-6">
      <h3 className="font-display text-lg font-semibold">Import History</h3>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {history.map((item) => (
          <div key={item.id} className="rounded-lg border p-4 text-sm">
            <div className="flex items-start justify-between gap-2"><div className="font-medium">{sourceShortLabel(item.metadata?.source ?? "OTHER")}</div><Badge variant="outline">{formatDate(item.createdAt)}</Badge></div>
            <div className="mt-1 text-xs text-muted-foreground">{item.metadata?.fileName ?? "manual-import"}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Mini label="Processed" value={item.metadata?.recordsProcessed ?? 0} />
              <Mini label="Imported" value={item.metadata?.recordsImported ?? 0} />
              <Mini label="Enriched" value={item.metadata?.recordsEnriched ?? 0} />
              <Mini label="Duplicates" value={item.metadata?.duplicatesSkipped ?? 0} />
            </div>
          </div>
        ))}
        {history.length === 0 && <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">No sourcing import batches yet.</div>}
      </div>
    </div>
  );
}

function ResumeUpload({ queueResumes, resumeQueue }: { queueResumes: (files?: FileList | null) => void; resumeQueue: { name: string; status: string }[] }) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <h2 className="font-display text-xl font-semibold">Resume Upload Intake</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upload PDF/DOCX resumes. Extraction is queued as a safe placeholder if a parser is not available.</p>
      <div className="mt-4 rounded-lg border p-4"><Input type="file" accept=".pdf,.docx" multiple onChange={(event) => queueResumes(event.target.files)} /></div>
      <div className="mt-4 space-y-2">{resumeQueue.map((file) => <div key={file.name} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{file.name}</span><Badge variant="secondary">{file.status}</Badge></div>)}{resumeQueue.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No resumes queued yet.</div>}</div>
    </section>
  );
}

function FutureApiConnector() {
  return <section className="rounded-xl bg-card p-8 shadow-sm"><h2 className="font-display text-xl font-semibold">Future API Connector</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Reserved for official provider APIs, customer-approved integrations and partner connectors. No unofficial scraping is enabled.</p></section>;
}

function CandidateDrawer({ selected, setSelected }: { selected: ScoredCandidate | null; setSelected: (value: ScoredCandidate | null) => void }) {
  return (
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {selected && (
          <>
            <SheetHeader><SheetTitle>{selected.candidate.name}</SheetTitle><SheetDescription>{selected.candidate.currentDesignation ?? "Candidate"} at {selected.candidate.currentCompany ?? "current company not specified"}</SheetDescription></SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="rounded-lg border p-4"><div className="flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Match Score</div><div className={cn("font-display text-4xl font-bold", scoreClass(selected.score))}>{selected.score}</div></div><UserRound className="h-10 w-10 text-primary" /></div><Progress value={selected.score} className="mt-4 h-2" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Source" value={sourceShortLabel(selected.candidate.source)} />
                <Info label="Freshness" value={`Imported ${formatDate(selected.candidate.createdAt)} · Updated ${formatDate(selected.candidate.updatedAt)}`} />
                <Info label="Completeness" value={`${selected.completeness}%`} />
                <Info label="Next Best Action" value={selected.nextBestAction} />
              </div>
              <div><div className="mb-2 text-sm font-medium">Skills</div><div className="flex flex-wrap gap-1.5">{selected.candidate.skills.map((skill) => <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>)}</div></div>
              <div className="grid gap-3 sm:grid-cols-2"><ExplainabilityList title="Missing" values={selected.missing} /><ExplainabilityList title="Risks" values={selected.risks} /></div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-background p-3"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-sm">{value}</div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value}</div></div>;
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-muted/40 p-2"><div className="text-muted-foreground">{label}</div><div className="font-semibold">{value}</div></div>;
}
