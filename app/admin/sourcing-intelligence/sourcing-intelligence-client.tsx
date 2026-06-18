"use client";

import { useMemo, useState } from "react";
import { Briefcase, Check, ChevronRight, MapPin, Radar, Search, Sparkles, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  skills: string[];
  source: string;
  aiSummary: string | null;
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

type ParsedQuery = {
  raw: string;
  targetSkills: string[];
  location: string | null;
  minExperience: number | null;
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
};

const examples = [
  "Find Oracle SCM consultants in Bangalore",
  "Find Manufacturing Sales Directors in Pune",
  "Find AI Architects with 10+ years experience",
];

const stopWords = new Set([
  "find",
  "with",
  "and",
  "the",
  "for",
  "from",
  "candidate",
  "candidates",
  "consultant",
  "consultants",
  "developer",
  "developers",
  "director",
  "directors",
  "architect",
  "architects",
  "engineer",
  "engineers",
  "years",
  "year",
  "experience",
  "exp",
  "in",
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
  return Array.from(new Set(values.filter(Boolean)));
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

function parseExperience(query: string) {
  const plus = query.match(/(\d+)\s*\+\s*(?:years?|yrs?|exp|experience)?/i);
  if (plus) return Number(plus[1]);
  const plain = query.match(/(\d+)\s*(?:years?|yrs?)\s*(?:experience|exp)?/i);
  if (plain) return Number(plain[1]);
  return null;
}

function parseQuery(query: string, candidates: SourcingCandidate[]): ParsedQuery {
  const normalizedQuery = normalize(query);
  const queryTokens = tokens(query);
  const knownSkills = getKnownSkills(candidates);
  const knownLocations = getKnownLocations(candidates);

  const targetSkills = knownSkills.filter((skill) => {
    const normalizedSkill = normalize(skill);
    if (normalizedQuery.includes(normalizedSkill)) return true;
    const skillTokens = tokens(skill);
    if (skillTokens.length === 0) return false;
    const overlap = skillTokens.filter((token) => queryTokens.includes(token)).length;
    return overlap > 0 && overlap / skillTokens.length >= 0.5;
  }).slice(0, 8);

  const location = knownLocations.find((candidateLocation) => {
    const normalizedLocation = normalize(candidateLocation);
    return normalizedLocation && normalizedQuery.includes(normalizedLocation);
  }) ?? null;

  return {
    raw: query,
    targetSkills,
    location,
    minExperience: parseExperience(query),
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
  const matchedSkills = parsed.targetSkills.filter((skill) => {
    const normalizedSkill = normalize(skill);
    return normalizedCandidateSkills.some((candidateSkill) => candidateSkill === normalizedSkill || candidateSkill.includes(normalizedSkill) || normalizedSkill.includes(candidateSkill));
  });
  const missingSkills = parsed.targetSkills.filter((skill) => !matchedSkills.includes(skill));
  const searchText = candidateSearchText(candidate);
  const titleMatched = parsed.queryTokens.some((token) => {
    const titleText = normalize([
      candidate.currentDesignation,
      ...candidate.applications.map((application) => application.job.title),
    ].filter(Boolean).join(" "));
    return titleText.includes(token);
  });

  const fallbackSkillHits = parsed.queryTokens.filter((token) =>
    candidateSkills.some((skill) => normalize(skill).includes(token)),
  );

  const skillScore = parsed.targetSkills.length > 0
    ? Math.round((matchedSkills.length / parsed.targetSkills.length) * 45)
    : Math.min(30, fallbackSkillHits.length * 8);
  const titleScore = titleMatched ? 15 : parsed.queryTokens.some((token) => searchText.includes(token)) ? 7 : 0;

  const candidateLocations = [
    candidate.currentCity ?? "",
    ...candidate.preferredLocations,
    ...candidate.applications.map((application) => application.job.location),
  ].map(normalize);
  const locationMatched = parsed.location
    ? candidateLocations.some((location) => location.includes(normalize(parsed.location!)) || normalize(parsed.location!).includes(location))
    : null;
  const locationScore = parsed.location ? (locationMatched ? 25 : candidate.willRelocate ? 12 : 0) : 20;

  const experienceMatched = parsed.minExperience === null ? null : candidate.totalExperience >= parsed.minExperience;
  const experienceScore = parsed.minExperience === null
    ? 15
    : candidate.totalExperience >= parsed.minExperience
      ? 15
      : candidate.totalExperience >= parsed.minExperience - 2
        ? 8
        : 0;

  const broadQueryScore = parsed.queryTokens.length > 0
    ? Math.min(5, parsed.queryTokens.filter((token) => searchText.includes(token)).length)
    : 0;

  return {
    candidate,
    score: Math.min(100, skillScore + titleScore + locationScore + experienceScore + broadQueryScore),
    matchedSkills: matchedSkills.length > 0 ? matchedSkills : candidateSkills.filter((skill) => parsed.queryTokens.some((token) => normalize(skill).includes(token))).slice(0, 4),
    missingSkills,
    locationMatched,
    experienceMatched,
    titleMatched,
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

export function SourcingIntelligenceClient({
  candidates,
  loadError,
}: {
  candidates: SourcingCandidate[];
  loadError?: string;
}) {
  const [query, setQuery] = useState(examples[0]);
  const [selected, setSelected] = useState<ScoredCandidate | null>(null);
  const [hasSearched, setHasSearched] = useState(true);

  const parsed = useMemo(() => parseQuery(query, candidates), [query, candidates]);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return candidates
      .map((candidate) => scoreCandidate(candidate, parsed))
      .filter((result) => result.score > 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [candidates, parsed, query]);

  const selectedStage = selected ? latestStage(selected.candidate) : null;

  if (loadError) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-700">
        <div className="font-semibold">Unable to load Talent Repository data</div>
        <p className="mt-2 text-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Search Panel</h2>
            <p className="text-sm text-muted-foreground">Use natural language. Search runs only against existing Talent Repository data.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHasSearched(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") setHasSearched(true);
              }}
              className="h-11 pl-9"
              placeholder="Find Oracle SCM consultants in Bangalore"
            />
          </div>
          <Button
            className="h-11 gap-2"
            onClick={() => setHasSearched(true)}
            disabled={!query.trim() || candidates.length === 0}
          >
            <Sparkles className="h-4 w-4" />
            Search Repository
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                setHasSearched(true);
              }}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="rounded-xl bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Candidate Search Engine</h2>
              <p className="text-sm text-muted-foreground">{results.length} match(es) from {candidates.length} repository candidates</p>
            </div>
            <Badge variant="outline">Local repository only</Badge>
          </div>

          {!query.trim() && (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Enter a sourcing query to search candidates.
            </div>
          )}

          {query.trim() && candidates.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No candidates are available in the Talent Repository yet.
            </div>
          )}

          {query.trim() && hasSearched && candidates.length > 0 && results.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No strong matches found. Try a broader skill, city, or experience query.
            </div>
          )}

          <div className="space-y-3">
            {results.map((result) => (
              <button
                key={result.candidate.id}
                type="button"
                onClick={() => setSelected(result)}
                className="w-full rounded-lg border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{result.candidate.name}</h3>
                      {latestStage(result.candidate) && <StageBadge stage={latestStage(result.candidate)! as any} />}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{result.candidate.currentDesignation ?? "Role not specified"}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{result.candidate.currentCity ?? "Location not specified"}</span>
                      <span>{result.candidate.totalExperience} yrs</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {result.candidate.skills.slice(0, 7).map((skill) => (
                        <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <ExplainabilityList title="Matched" values={result.matchedSkills} positive />
                      <ExplainabilityList title="Missing" values={result.missingSkills} />
                    </div>
                  </div>
                  <div className="w-full shrink-0 lg:w-32">
                    <div className={cn("text-right font-display text-3xl font-bold", scoreColor(result.score))}>{result.score}</div>
                    <div className="mb-2 text-right text-xs text-muted-foreground">Match Score</div>
                    <Progress value={result.score} className="h-2" />
                    <div className="mt-3 flex items-center justify-end gap-1 text-xs text-primary">
                      View profile <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-xl bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold">Explainability Panel</h2>
          <p className="mt-1 text-sm text-muted-foreground">Parsed intent and scoring signals for the current query.</p>
          <div className="mt-5 space-y-4 text-sm">
            <Signal label="Skills detected" value={parsed.targetSkills.length ? parsed.targetSkills.join(", ") : "No explicit skills detected"} />
            <Signal label="Location" value={parsed.location ?? "No location constraint"} />
            <Signal label="Experience" value={parsed.minExperience ? `${parsed.minExperience}+ years` : "No experience constraint"} />
            <Signal label="Scoring" value="Skills, role intent, location and experience fit" />
          </div>
        </aside>
      </section>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.candidate.name}</SheetTitle>
                <SheetDescription>
                  {selected.candidate.currentDesignation ?? "Candidate"} at {selected.candidate.currentCompany ?? "current company not specified"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Match Score</div>
                      <div className={cn("font-display text-4xl font-bold", scoreColor(selected.score))}>{selected.score}</div>
                    </div>
                    <UserRound className="h-10 w-10 text-primary" />
                  </div>
                  <Progress value={selected.score} className="mt-4 h-2" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Experience" value={`${selected.candidate.totalExperience} years`} />
                  <Info label="Location" value={selected.candidate.currentCity ?? "Not specified"} />
                  <Info label="Source" value={selected.candidate.source} />
                  <Info label="Pipeline Stage" value={selectedStage ?? "Not in pipeline"} />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.candidate.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">Applied Jobs</div>
                  <div className="space-y-2">
                    {selected.candidate.applications.map((application) => (
                      <div key={application.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{application.job.title}</div>
                            <div className="text-xs text-muted-foreground">{application.job.client?.name ?? "Client"} · {application.job.location}</div>
                          </div>
                          <StageBadge stage={application.stage as any} />
                        </div>
                      </div>
                    ))}
                    {selected.candidate.applications.length === 0 && (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No applications yet.</div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ExplainabilityList title="Matched" values={selected.matchedSkills} positive />
                  <ExplainabilityList title="Missing" values={selected.missingSkills} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ExplainabilityList({ title, values, positive = false }: { title: string; values: string[]; positive?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5">
        {values.length > 0 ? values.map((value) => (
          <div key={value} className="flex items-center gap-2 text-sm">
            {positive ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-rose-600" />}
            <span>{value}</span>
          </div>
        )) : (
          <div className="text-sm text-muted-foreground">{positive ? "No explicit skill match yet" : "No explicit missing skills"}</div>
        )}
      </div>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
