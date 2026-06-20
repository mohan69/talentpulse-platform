"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Database,
  FileSpreadsheet,
  FileText,
  LinkIcon,
  MapPin,
  Radar,
  Search,
  Sparkles,
  Upload,
  UserRound,
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

type SourceMode = "repository" | "csv" | "resumes" | "naukri" | "linkedin" | "api";

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
  raw: string;
  targetSkills: string[];
  location: string | null;
  minExperience: number | null;
  maxNotice: number | null;
  maxComp: number | null;
  queryTokens: string[];
};

type ScoredCandidate = {
  candidate: SourcingCandidate;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  locationMatched: boolean | null;
  experienceMatched: boolean | null;
  titleMatched: boolean;
  freshnessScore: number;
  completeness: number;
  sourceReliability: number;
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

const sourceModes: { id: SourceMode; label: string; icon: any; description: string }[] = [
  { id: "repository", label: "Talent Repository", icon: Database, description: "Search existing repository records." },
  { id: "csv", label: "Upload CSV/XLSX", icon: FileSpreadsheet, description: "Import recruiter-owned tabular exports." },
  { id: "resumes", label: "Upload Resumes", icon: FileText, description: "Queue PDF/DOCX resumes for extraction." },
  { id: "naukri", label: "Naukri Export Import", icon: Upload, description: "Use recruiter-authorized Naukri exports." },
  { id: "linkedin", label: "LinkedIn Manual Import", icon: LinkIcon, description: "Use manual CSV or paste workflows." },
  { id: "api", label: "Future API Connector", icon: Sparkles, description: "Reserved for official provider APIs." },
];

const examples = [
  "Find Oracle SCM consultants in Bangalore",
  "Find Manufacturing Sales Directors in Pune",
  "Find AI Architects with 10+ years experience",
];

const stopWords = new Set([
  "find", "with", "and", "the", "for", "from", "candidate", "candidates", "consultant", "consultants",
  "developer", "developers", "director", "directors", "architect", "architects", "engineer", "engineers",
  "years", "year", "experience", "exp", "in", "under", "below", "lpa", "ctc",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return normalize(value).split(" ").map((token) => token.trim()).filter((token) => token.length > 1 && !stopWords.has(token));
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000));
}

function sourceLabel(source: string) {
  if (source === "NAUKRI") return "Naukri";
  if (source === "LINKEDIN") return "LinkedIn Manual";
  if (source === "INTERNAL_DB") return "Internal DB";
  return source.replace(/_/g, " ");
}

function sourceReliability(source: string) {
  if (source === "NAUKRI") return 12;
  if (source === "LINKEDIN") return 10;
  if (source === "INTERNAL_DB") return 8;
  return 6;
}

function dataBucket(source: string) {
  return source === "NAUKRI" || source === "LINKEDIN" ? "Real Imported Data" : "Demo Repository Data";
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
    candidate.aiSummary,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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

function mapRows(text: string, sourceMode: SourceMode, candidates: SourcingCandidate[]): { rows: ImportRow[]; columns: string[] } {
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
    } else if (sourceMode === "linkedin" && !row.linkedinUrl) {
      row.duplicateStatus = "needs_review";
      row.duplicateReason = "LinkedIn URL missing.";
    }
    return row;
  });
  return { rows, columns: headers };
}

function findDuplicate(row: Pick<ImportRow, "email" | "phone" | "name" | "currentCompany">, candidates: SourcingCandidate[]) {
  const email = normalize(row.email);
  const phone = row.phone.replace(/[^\d+]/g, "");
  const name = normalize(row.name);
  const company = normalize(row.currentCompany);
  return candidates.find((candidate) => {
    if (email && normalize(candidate.email) === email) return true;
    if (phone && candidate.phone?.replace(/[^\d+]/g, "") === phone) return true;
    if (name && company && normalize(candidate.name) === name && normalize(candidate.currentCompany ?? "") === company) return true;
    return false;
  });
}

function getKnownSkills(candidates: SourcingCandidate[]) {
  return unique(candidates.flatMap((candidate) => [...candidate.skills, ...candidate.applications.flatMap((application) => application.job.skills)])).sort((a, b) => b.length - a.length);
}

function getKnownLocations(candidates: SourcingCandidate[]) {
  return unique(candidates.flatMap((candidate) => [candidate.currentCity ?? "", ...candidate.preferredLocations, ...candidate.applications.map((application) => application.job.location)])).sort((a, b) => b.length - a.length);
}

function parseQuery(query: string, candidates: SourcingCandidate[]): ParsedQuery {
  const normalizedQuery = normalize(query);
  const queryTokens = tokens(query);
  const targetSkills = getKnownSkills(candidates).filter((skill) => {
    const normalizedSkill = normalize(skill);
    if (normalizedQuery.includes(normalizedSkill)) return true;
    const skillTokens = tokens(skill);
    return skillTokens.length > 0 && skillTokens.filter((token) => queryTokens.includes(token)).length / skillTokens.length >= 0.5;
  }).slice(0, 8);
  const location = getKnownLocations(candidates).find((candidateLocation) => {
    const normalizedLocation = normalize(candidateLocation);
    return normalizedLocation && normalizedQuery.includes(normalizedLocation);
  }) ?? null;
  const exp = query.match(/(\d+)\s*\+\s*(?:years?|yrs?|exp|experience)?/i) ?? query.match(/(\d+)\s*(?:years?|yrs?)/i);
  const notice = query.match(/(?:notice|join|joining).*?(\d+)/i);
  const comp = query.match(/(?:under|below|max|upto|up to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|ctc)?/i);
  return {
    raw: query,
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

function scoreCandidate(candidate: SourcingCandidate, parsed: ParsedQuery): ScoredCandidate {
  const candidateSkills = candidate.skills;
  const normalizedCandidateSkills = candidateSkills.map((skill) => normalize(skill));
  const matchedSkills = parsed.targetSkills.filter((skill) => normalizedCandidateSkills.some((candidateSkill) => candidateSkill.includes(normalize(skill)) || normalize(skill).includes(candidateSkill)));
  const missingSkills = parsed.targetSkills.filter((skill) => !matchedSkills.includes(skill));
  const searchText = candidateSearchText(candidate);
  const titleText = normalize([candidate.currentDesignation, ...candidate.applications.map((application) => application.job.title)].filter(Boolean).join(" "));
  const titleMatched = parsed.queryTokens.some((token) => titleText.includes(token));
  const fallbackSkillHits = parsed.queryTokens.filter((token) => candidateSkills.some((skill) => normalize(skill).includes(token)));
  const skillScore = parsed.targetSkills.length > 0 ? Math.round((matchedSkills.length / parsed.targetSkills.length) * 34) : Math.min(24, fallbackSkillHits.length * 6);
  const titleScore = titleMatched ? 14 : parsed.queryTokens.some((token) => searchText.includes(token)) ? 7 : 0;
  const candidateLocations = [candidate.currentCity ?? "", ...candidate.preferredLocations, ...candidate.applications.map((application) => application.job.location)].map(normalize);
  const locationMatched = parsed.location ? candidateLocations.some((location) => location.includes(normalize(parsed.location!)) || normalize(parsed.location!).includes(location)) : null;
  const locationScore = parsed.location ? (locationMatched ? 16 : candidate.willRelocate ? 8 : 0) : 10;
  const experienceMatched = parsed.minExperience === null ? null : candidate.totalExperience >= parsed.minExperience;
  const experienceScore = parsed.minExperience === null ? 8 : candidate.totalExperience >= parsed.minExperience ? 10 : candidate.totalExperience >= parsed.minExperience - 2 ? 5 : 0;
  const noticeScore = parsed.maxNotice === null ? 5 : candidate.noticePeriod !== null && candidate.noticePeriod <= parsed.maxNotice ? 8 : candidate.noticePeriod === null ? 2 : 0;
  const compScore = parsed.maxComp === null ? 5 : candidate.expectedCtc !== null && candidate.expectedCtc <= parsed.maxComp ? 7 : candidate.expectedCtc === null ? 2 : 0;
  const freshnessScore = Math.max(0, 6 - Math.floor(daysSince(candidate.updatedAt) / 30));
  const completeness = profileCompleteness(candidate);
  const completenessScore = Math.round((completeness / 100) * 8);
  const reliability = sourceReliability(candidate.source);
  return {
    candidate,
    score: Math.min(100, skillScore + titleScore + locationScore + experienceScore + noticeScore + compScore + freshnessScore + completenessScore + reliability),
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : candidateSkills.filter((skill) => parsed.queryTokens.some((token) => normalize(skill).includes(token))).slice(0, 4),
    missingSkills,
    locationMatched,
    experienceMatched,
    titleMatched,
    freshnessScore,
    completeness,
    sourceReliability: reliability,
  };
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-muted-foreground";
}

function latestStage(candidate: SourcingCandidate) {
  return candidate.applications[0]?.stage ?? null;
}

export function SourcingIntelligenceClient({ candidates, loadError }: { candidates: SourcingCandidate[]; loadError?: string }) {
  const [mode, setMode] = useState<SourceMode>("repository");
  const [query, setQuery] = useState(examples[0]);
  const [selected, setSelected] = useState<ScoredCandidate | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [manualText, setManualText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [resumeQueue, setResumeQueue] = useState<{ name: string; status: string }[]>([]);

  useEffect(() => {
    void fetch("/api/sourcing/import").then((res) => res.json()).then(setHistory).catch(() => setHistory([]));
  }, []);

  const parsed = useMemo(() => parseQuery(query, candidates), [query, candidates]);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return candidates
      .map((candidate) => scoreCandidate(candidate, parsed))
      .filter((result) => result.score > 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 16);
  }, [candidates, parsed, query]);

  const importSource = mode === "naukri" ? "NAUKRI" : mode === "linkedin" ? "LINKEDIN" : "OTHER";
  const selectedImportRows = previewRows.filter((row) => row.selected && row.duplicateStatus !== "missing_required");

  async function handleFile(file?: File | null) {
    if (!file) return;
    setFileName(file.name);
    setImportMessage(null);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      setPreviewRows([]);
      setDetectedColumns([]);
      setImportMessage("XLSX upload received. This build does not include an XLSX parser package, so export the sheet as CSV or paste rows below for safe import.");
      return;
    }
    const text = await file.text();
    const mapped = mapRows(text, mode, candidates);
    setDetectedColumns(mapped.columns);
    setPreviewRows(mapped.rows);
  }

  function previewManualText() {
    const mapped = mapRows(manualText, mode, candidates);
    setFileName(mode === "linkedin" ? "linkedin-manual-paste.csv" : "manual-paste.csv");
    setDetectedColumns(mapped.columns);
    setPreviewRows(mapped.rows);
    setImportMessage(null);
  }

  function queueResumes(files?: FileList | null) {
    if (!files) return;
    setResumeQueue(Array.from(files).map((file) => ({
      name: file.name,
      status: file.name.toLowerCase().match(/\.(pdf|docx)$/) ? "Pending extraction" : "Unsupported file type",
    })));
  }

  async function importSelectedRows() {
    setImporting(true);
    setImportMessage(null);
    try {
      const response = await fetch("/api/sourcing/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: importSource, fileName, rows: selectedImportRows }),
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

  if (loadError) {
    return <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-700"><div className="font-semibold">Unable to load Talent Repository data</div><p className="mt-2 text-sm">{loadError}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800">
        Naukri and LinkedIn sourcing currently works through recruiter-authorized exports/manual imports. Direct portal scraping is not enabled.
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {sourceModes.map((item) => (
          <button key={item.id} type="button" onClick={() => setMode(item.id)} className={cn("rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50", mode === item.id && "border-primary bg-primary/5")}>
            <item.icon className="mb-3 h-5 w-5 text-primary" />
            <div className="font-medium">{item.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
          </button>
        ))}
      </section>

      {mode === "repository" && <RepositorySearch query={query} setQuery={setQuery} candidates={candidates} results={results} parsed={parsed} setSelected={setSelected} />}
      {(mode === "csv" || mode === "naukri" || mode === "linkedin") && (
        <ImportWorkbench
          mode={mode}
          fileName={fileName}
          detectedColumns={detectedColumns}
          previewRows={previewRows}
          selectedImportRows={selectedImportRows}
          importMessage={importMessage}
          importing={importing}
          manualText={manualText}
          setManualText={setManualText}
          handleFile={handleFile}
          previewManualText={previewManualText}
          setPreviewRows={setPreviewRows}
          importSelectedRows={importSelectedRows}
        />
      )}
      {mode === "resumes" && <ResumeUpload queueResumes={queueResumes} resumeQueue={resumeQueue} />}
      {mode === "api" && <FutureApiConnector />}

      <ImportHistory history={history} />
      <CandidateDrawer selected={selected} setSelected={setSelected} />
    </div>
  );
}

function RepositorySearch({ query, setQuery, candidates, results, parsed, setSelected }: {
  query: string;
  setQuery: (value: string) => void;
  candidates: SourcingCandidate[];
  results: ScoredCandidate[];
  parsed: ParsedQuery;
  setSelected: (value: ScoredCandidate) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-xl bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Radar className="h-5 w-5" /></div>
          <div>
            <h2 className="font-display text-lg font-semibold">Real Sourcing Search</h2>
            <p className="text-sm text-muted-foreground">Search repository records and imported source records with explainable ranking.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-9" placeholder="Find Oracle SCM consultants in Bangalore" />
          </div>
          <Button className="h-11 gap-2" disabled={!query.trim() || candidates.length === 0}><Sparkles className="h-4 w-4" /> Search Sources</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => <button key={example} type="button" onClick={() => setQuery(example)} className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">{example}</button>)}
        </div>
        <div className="mt-5 space-y-3">
          {results.map((result) => <CandidateCard key={result.candidate.id} result={result} onClick={() => setSelected(result)} />)}
          {results.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No matches yet. Try a broader role, skill or location query.</div>}
        </div>
      </div>
      <aside className="rounded-xl bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Explainability Panel</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ranking uses skills, title, location, experience, notice period, compensation fit, freshness and source reliability.</p>
        <div className="mt-5 space-y-4 text-sm">
          <Signal label="Skills detected" value={parsed.targetSkills.length ? parsed.targetSkills.join(", ") : "No explicit skills detected"} />
          <Signal label="Location" value={parsed.location ?? "No location constraint"} />
          <Signal label="Experience" value={parsed.minExperience ? `${parsed.minExperience}+ years` : "No experience constraint"} />
          <Signal label="Notice / compensation" value={`${parsed.maxNotice ? `${parsed.maxNotice} days notice` : "No notice constraint"} · ${parsed.maxComp ? `max ${parsed.maxComp}` : "No CTC cap"}`} />
        </div>
      </aside>
    </section>
  );
}

function CandidateCard({ result, onClick }: { result: ScoredCandidate; onClick: () => void }) {
  const candidate = result.candidate;
  const stage = latestStage(candidate);
  const duplicateWarning = candidate.email.includes("talentpulse.local") ? "Placeholder email" : null;
  return (
    <button type="button" onClick={onClick} className="w-full rounded-lg border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{candidate.name}</h3>
            {stage && <StageBadge stage={stage as any} />}
            <Badge variant="outline">{sourceLabel(candidate.source)}</Badge>
            <Badge variant={dataBucket(candidate.source) === "Real Imported Data" ? "default" : "secondary"}>{dataBucket(candidate.source)}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{candidate.currentDesignation ?? "Role not specified"}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{candidate.currentCity ?? "Location not specified"}</span>
            <span>{candidate.totalExperience} yrs</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Updated {formatDate(candidate.updatedAt)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, 7).map((skill) => <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>)}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ExplainabilityList title="Matched" values={result.matchedSkills} positive />
            <ExplainabilityList title="Missing" values={result.missingSkills} />
            <div className="rounded-lg border p-3 text-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Freshness & integrity</div>
              <div>Completeness {result.completeness}%</div>
              <div>Source reliability +{result.sourceReliability}</div>
              {duplicateWarning && <div className="mt-1 flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" />{duplicateWarning}</div>}
            </div>
          </div>
        </div>
        <div className="w-full shrink-0 lg:w-32">
          <div className={cn("text-right font-display text-3xl font-bold", scoreColor(result.score))}>{result.score}</div>
          <div className="mb-2 text-right text-xs text-muted-foreground">Match Score</div>
          <Progress value={result.score} className="h-2" />
          <div className="mt-3 flex items-center justify-end gap-1 text-xs text-primary">View profile <ChevronRight className="h-3 w-3" /></div>
        </div>
      </div>
    </button>
  );
}

function ImportWorkbench(props: {
  mode: SourceMode;
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
}) {
  const sourceCopy = props.mode === "naukri" ? "Naukri recruiter export CSV/XLSX" : props.mode === "linkedin" ? "LinkedIn manual CSV or paste" : "CSV/XLSX import";
  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">{sourceCopy}</h2>
          <p className="text-sm text-muted-foreground">Preview, map and de-duplicate before saving into the Talent Repository.</p>
        </div>
        <Button disabled={props.importing || props.selectedImportRows.length === 0} onClick={props.importSelectedRows}>
          <Upload className="h-4 w-4" /> Import {props.selectedImportRows.length} selected
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Upload CSV/XLSX export</div>
          <Input type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={(event) => void props.handleFile(event.target.files?.[0])} />
          <p className="mt-2 text-xs text-muted-foreground">CSV/TSV files preview immediately. XLSX is accepted but must be exported as CSV in this build unless an XLSX parser is added.</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="mb-2 text-sm font-medium">Manual paste</div>
          <Textarea value={props.manualText} onChange={(event) => props.setManualText(event.target.value)} rows={5} placeholder={"name,email,phone,title,company,location,skills\nAsha Rao,asha@example.com,+91...,Oracle SCM Consultant,Infosys,Bangalore,\"Oracle SCM, Fusion\""} />
          <Button className="mt-3" variant="outline" onClick={props.previewManualText}>Preview pasted rows</Button>
        </div>
      </div>
      {props.importMessage && <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">{props.importMessage}</div>}
      <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border p-4 text-sm">
          <div className="font-medium">Import Preview</div>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <div>File: {props.fileName || "No file selected"}</div>
            <div>Detected columns: {props.detectedColumns.length || 0}</div>
            <div>Rows previewed: {props.previewRows.length}</div>
            <div>Import count: {props.selectedImportRows.length}</div>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mapped fields</div>
            <div className="flex flex-wrap gap-1">
              {["name", "email", "phone", "title", "company", "location", "experience", "CTC", "skills"].map((field) => <Badge key={field} variant="secondary">{field}</Badge>)}
            </div>
          </div>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Use</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Duplicate status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.previewRows.slice(0, 50).map((row) => (
                <TableRow key={row.id}>
                  <TableCell><input type="checkbox" checked={row.selected} disabled={row.duplicateStatus === "missing_required"} onChange={(event) => props.setPreviewRows(props.previewRows.map((item) => item.id === row.id ? { ...item, selected: event.target.checked } : item))} /></TableCell>
                  <TableCell>{row.name || "—"}</TableCell>
                  <TableCell>{row.email || "—"}</TableCell>
                  <TableCell>{row.currentDesignation || "—"}</TableCell>
                  <TableCell>{row.currentCompany || "—"}</TableCell>
                  <TableCell><Badge variant={row.duplicateStatus === "new" ? "default" : row.duplicateStatus === "duplicate" ? "secondary" : "destructive"}>{row.duplicateStatus.replace(/_/g, " ")}</Badge>{row.duplicateReason && <div className="mt-1 text-xs text-muted-foreground">{row.duplicateReason}</div>}</TableCell>
                </TableRow>
              ))}
              {props.previewRows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Upload or paste rows to preview before import.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

function ResumeUpload({ queueResumes, resumeQueue }: { queueResumes: (files?: FileList | null) => void; resumeQueue: { name: string; status: string }[] }) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Resume Upload Intake</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upload PDF/DOCX resumes. Extraction is queued as a safe placeholder if a parser is not available.</p>
      <div className="mt-4 rounded-lg border p-4">
        <Input type="file" accept=".pdf,.docx" multiple onChange={(event) => queueResumes(event.target.files)} />
      </div>
      <div className="mt-4 space-y-2">
        {resumeQueue.map((file) => <div key={file.name} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{file.name}</span><Badge variant="secondary">{file.status}</Badge></div>)}
        {resumeQueue.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No resumes queued yet.</div>}
      </div>
    </section>
  );
}

function FutureApiConnector() {
  return (
    <section className="rounded-xl bg-card p-8 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Future API Connector</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Reserved for official provider APIs, customer-approved integrations and partner connectors. No unofficial scraping is enabled.</p>
    </section>
  );
}

function ImportHistory({ history }: { history: ImportHistoryItem[] }) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Import History</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {history.map((item) => (
          <div key={item.id} className="rounded-lg border p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{sourceLabel(item.metadata?.source ?? "OTHER")}</div>
              <Badge variant="outline">{formatDate(item.createdAt)}</Badge>
            </div>
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
    </section>
  );
}

function CandidateDrawer({ selected, setSelected }: { selected: ScoredCandidate | null; setSelected: (value: ScoredCandidate | null) => void }) {
  const selectedStage = selected ? latestStage(selected.candidate) : null;
  return (
    <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {selected && (
          <>
            <SheetHeader>
              <SheetTitle>{selected.candidate.name}</SheetTitle>
              <SheetDescription>{selected.candidate.currentDesignation ?? "Candidate"} at {selected.candidate.currentCompany ?? "current company not specified"}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div><div className="text-sm text-muted-foreground">Match Score</div><div className={cn("font-display text-4xl font-bold", scoreColor(selected.score))}>{selected.score}</div></div>
                  <UserRound className="h-10 w-10 text-primary" />
                </div>
                <Progress value={selected.score} className="mt-4 h-2" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Source" value={sourceLabel(selected.candidate.source)} />
                <Info label="Freshness" value={`Imported ${formatDate(selected.candidate.createdAt)} · Updated ${formatDate(selected.candidate.updatedAt)}`} />
                <Info label="Completeness" value={`${selected.completeness}%`} />
                <Info label="Pipeline Stage" value={selectedStage ?? "Not in pipeline"} />
              </div>
              <div><div className="mb-2 text-sm font-medium">Skills</div><div className="flex flex-wrap gap-1.5">{selected.candidate.skills.map((skill) => <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>)}</div></div>
              <div>
                <div className="mb-2 text-sm font-medium">Applied Jobs</div>
                <div className="space-y-2">
                  {selected.candidate.applications.map((application) => <div key={application.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div><div className="font-medium">{application.job.title}</div><div className="text-xs text-muted-foreground">{application.job.client?.name ?? "Client"} · {application.job.location}</div></div><StageBadge stage={application.stage as any} /></div></div>)}
                  {selected.candidate.applications.length === 0 && <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No applications yet.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ExplainabilityList({ title, values, positive = false }: { title: string; values: string[]; positive?: boolean }) {
  return <div className="rounded-lg border p-3"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div><div className="space-y-1.5">{values.length > 0 ? values.map((value) => <div key={value} className="flex items-center gap-2 text-sm">{positive ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-rose-600" />}<span>{value}</span></div>) : <div className="text-sm text-muted-foreground">{positive ? "No explicit skill match yet" : "No explicit missing skills"}</div>}</div></div>;
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-background p-3"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1">{value}</div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value}</div></div>;
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-muted/40 p-2"><div className="text-muted-foreground">{label}</div><div className="font-semibold">{value}</div></div>;
}
