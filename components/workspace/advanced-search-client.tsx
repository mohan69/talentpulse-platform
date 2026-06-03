"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  RotateCcw,
  Save,
  Briefcase,
  GraduationCap,
  SlidersHorizontal,
  Plus,
  Minus,
  MapPin,
  Building2,
  Clock,
  Users,
  ChevronRight,
  ExternalLink,
  FileText,
  Trash2,
  History,
  Bookmark,
  Loader2,
  BadgeIndianRupee,
  Phone,
  Mail,
  X,
  Database,
  Globe,
  Github,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Code2,
  UserPlus,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ==================== TYPES ====================
interface SearchFilters {
  searchMode: string;
  source: string;
  anyKeywords: string;
  allKeywords: string;
  excludeKeywords: string;
  minExperience: string;
  maxExperience: string;
  minSalary: string;
  maxSalary: string;
  includeZeroSalary: boolean;
  currentLocation: string;
  preferredLocation: string;
  locationOperator: string;
  exactPreferredLocation: boolean;
  currentCompany: string;
  currentDesignation: string;
  excludeCompany: string;
  degree: string;
  institution: string;
  graduationYear: string;
  noticePeriod: string;
  candidateSource: string;
  skills: string;
  resumeFreshness: number;
  sortBy: string;
  showAll: boolean;
  booleanQuery: string;
  // GitHub-specific
  githubLanguage: string;
  githubMinRepos: string;
  // Web search specific
  webPlatform: string;
  webResultCount: string;
}

const defaultFilters: SearchFilters = {
  searchMode: "keyword",
  source: "INTERNAL",
  anyKeywords: "",
  allKeywords: "",
  excludeKeywords: "",
  minExperience: "",
  maxExperience: "",
  minSalary: "",
  maxSalary: "",
  includeZeroSalary: false,
  currentLocation: "",
  preferredLocation: "",
  locationOperator: "AND",
  exactPreferredLocation: false,
  currentCompany: "",
  currentDesignation: "",
  excludeCompany: "",
  degree: "",
  institution: "",
  graduationYear: "",
  noticePeriod: "",
  candidateSource: "ALL",
  skills: "",
  resumeFreshness: 90,
  sortBy: "relevance",
  showAll: true,
  booleanQuery: "",
  githubLanguage: "",
  githubMinRepos: "",
  webPlatform: "all",
  webResultCount: "all",
};

interface CandidateResult {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  currentCity?: string | null;
  location?: string | null;
  preferredLocations?: string[];
  currentCompany?: string | null;
  company?: string | null;
  currentDesignation?: string | null;
  designation?: string | null;
  totalExperience?: number;
  experience?: number;
  relevantExperience?: number;
  skills?: string[];
  degree?: string | null;
  education?: string | null;
  institution?: string | null;
  graduationYear?: number | null;
  currentCtc?: number | null;
  expectedCtc?: number | null;
  noticePeriod?: number | null;
  source?: string;
  resumeUrl?: string | null;
  linkedinUrl?: string | null;
  profileUrl?: string | null;
  aiSummary?: string | null;
  profileSummary?: string | null;
  bio?: string | null;
  updatedAt?: string;
  createdAt?: string;
  _count?: { applications: number };
  // GitHub-specific
  username?: string;
  avatarUrl?: string;
  repos?: number;
  followers?: number;
  blogUrl?: string | null;
}

interface SavedSearchData {
  id: string;
  name: string;
  filters: SearchFilters;
  source: string;
  resultCount: number | null;
  createdAt: string;
  updatedAt: string;
}

const SOURCE_TABS = [
  { value: "INTERNAL", label: "Internal Database", icon: Database, color: "bg-primary" },
  { value: "WEB", label: "Web Search", icon: Globe, color: "bg-emerald-600" },
  { value: "GITHUB", label: "GitHub", icon: Github, color: "bg-gray-800" },
];

const NOTICE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "0", label: "Immediate" },
  { value: "15", label: "15 Days" },
  { value: "30", label: "1 Month" },
  { value: "60", label: "2 Months" },
  { value: "90", label: "3 Months" },
];

const FRESHNESS_OPTIONS = [
  { value: 0, label: "All Time" },
  { value: 7, label: "7 Days" },
  { value: 15, label: "15 Days" },
  { value: 30, label: "30 Days" },
  { value: 60, label: "60 Days" },
  { value: 90, label: "90 Days" },
  { value: 180, label: "6 Months" },
  { value: 365, label: "1 Year" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest First" },
  { value: "experience_high", label: "Experience (High → Low)" },
  { value: "experience_low", label: "Experience (Low → High)" },
  { value: "salary_high", label: "Salary (High → Low)" },
  { value: "salary_low", label: "Salary (Low → High)" },
  { value: "name", label: "Name (A → Z)" },
];

// ==================== MAIN COMPONENT ====================
export function AdvancedSearchClient({ role }: { role: "admin" | "recruiter" }) {
  const [filters, setFilters] = useState<SearchFilters>({ ...defaultFilters });
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearchData[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);
  const [eduOpen, setEduOpen] = useState(false);
  const [addlOpen, setAddlOpen] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [searchNote, setSearchNote] = useState("");

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const res = await fetch("/api/saved-searches");
      if (res.ok) setSavedSearches(await res.json());
    } catch (e) { console.error("Failed to fetch saved searches", e); }
  };

  const handleSearch = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setHasSearched(true);
    setSearchNote("");
    try {
      let res: Response;

      if (filters.source === "GITHUB") {
        res = await fetch("/api/search/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skills: filters.anyKeywords || filters.allKeywords || filters.skills,
            location: filters.currentLocation,
            language: filters.githubLanguage,
            minRepos: filters.githubMinRepos,
            page: pageNum,
          }),
        });
      } else if (filters.source === "WEB") {
        res = await fetch("/api/search/web", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: filters.anyKeywords || filters.allKeywords || filters.booleanQuery,
            location: filters.currentLocation,
            experience: filters.minExperience,
            skills: filters.skills,
            platform: filters.webPlatform,
            resultCount: filters.webResultCount === "all" ? 999 : (parseInt(filters.webResultCount) || 999),
          }),
        });
      } else {
        res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...filters, page: pageNum, pageSize: 25 }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setResults(data.candidates || []);
        setTotalCount(data.totalCount || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 0);
        if (data.note) setSearchNote(data.note);
        if (data.rateLimitNote) setSearchNote(data.rateLimitNote);
      } else {
        const err = await res.json();
        setSearchNote(err.error || "Search failed");
        setResults([]);
        setTotalCount(0);
      }
    } catch (e) {
      console.error("Search failed", e);
      setSearchNote("Search request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleReset = () => {
    setFilters({ ...defaultFilters, source: filters.source });
    setResults([]);
    setTotalCount(0);
    setHasSearched(false);
    setSearchNote("");
  };

  const handleImportCandidate = async (candidate: CandidateResult) => {
    const cId = candidate.id;
    setImportingId(cId);
    try {
      const res = await fetch("/api/search/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          company: candidate.currentCompany || candidate.company,
          designation: candidate.currentDesignation || candidate.designation,
          experience: candidate.totalExperience || candidate.experience || 0,
          location: candidate.currentCity || candidate.location,
          skills: candidate.skills || [],
          education: candidate.degree || candidate.education,
          expectedCtc: candidate.expectedCtc,
          source: candidate.source || "OTHER",
          profileUrl: candidate.profileUrl || candidate.linkedinUrl,
          summary: candidate.aiSummary || candidate.profileSummary || candidate.bio,
        }),
      });
      if (res.ok) {
        setImportedIds(prev => new Set(prev).add(cId));
      } else {
        const err = await res.json();
        if (res.status === 409) {
          setImportedIds(prev => new Set(prev).add(cId));
        }
        alert(err.error || "Import failed");
      }
    } catch (e) {
      alert("Import failed");
    } finally {
      setImportingId(null);
    }
  };

  const handleSaveSearch = async () => {
    if (!saveName.trim()) return;
    try {
      await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName, filters, source: filters.source, resultCount: totalCount }),
      });
      setShowSaveDialog(false);
      setSaveName("");
      fetchSavedSearches();
    } catch (e) { console.error("Save failed", e); }
  };

  const handleDeleteSaved = async (id: string) => {
    await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    fetchSavedSearches();
  };

  const loadSavedSearch = (s: SavedSearchData) => {
    setFilters(s.filters as SearchFilters);
    setShowSavedPanel(false);
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatCtc = (ctc: number | null | undefined) => {
    if (!ctc) return "—";
    if (ctc >= 100000) return `₹${(ctc / 100000).toFixed(1)}L`;
    if (ctc > 0) return `₹${ctc}L`;
    return "—";
  };

  const handleExportCSV = useCallback(() => {
    if (results.length === 0) return;
    const headers = ["Name", "Email", "Phone", "Designation", "Company", "Experience (Yrs)", "Location", "Skills", "Education", "Expected CTC (Lakhs)", "Source", "Profile URL", "Summary"];
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = results.map((c: any) => [
      escapeCSV(c.name),
      escapeCSV(c.email),
      escapeCSV(c.phone),
      escapeCSV(c.designation || c.currentDesignation),
      escapeCSV(c.company || c.currentCompany),
      c.experience || c.totalExperience || "",
      escapeCSV(c.location || c.currentCity),
      escapeCSV(Array.isArray(c.skills) ? c.skills.join("; ") : c.skills || ""),
      escapeCSV(c.education || c.degree),
      c.expectedCtc ? (c.expectedCtc >= 100000 ? (c.expectedCtc / 100000).toFixed(1) : c.expectedCtc) : "",
      escapeCSV(c.source),
      escapeCSV(c.profileUrl || c.linkedinUrl || ""),
      escapeCSV(c.profileSummary || c.aiSummary || c.summary || ""),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates-search-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results]);

  const basePath = role === "admin" ? "/admin" : "/recruiter";
  const isExternal = filters.source === "GITHUB" || filters.source === "WEB";

  return (
    <div className="flex gap-0 min-h-[calc(100vh-140px)]">
      <div className="flex-1 min-w-0">
        {/* Source Tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {SOURCE_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { updateFilter("source", tab.value); setResults([]); setHasSearched(false); setSearchNote(""); }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
                filters.source === tab.value
                  ? `${tab.color} text-white shadow-md`
                  : "bg-card border border-border hover:bg-muted text-muted-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowSavedPanel(!showSavedPanel)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                showSavedPanel ? "bg-amber-500 text-white" : "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
              )}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Saved Queries
              {savedSearches.length > 0 && (
                <span className="bg-amber-600 text-white text-[10px] rounded-full px-1.5 py-0.5 ml-1">{savedSearches.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Source Info Banner */}
        {filters.source === "GITHUB" && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2">
            <Github className="h-4 w-4 mt-0.5 text-gray-600" />
            <div className="text-xs text-gray-600">
              <strong>GitHub Developer Search</strong> — Search millions of developer profiles by skills, programming language, and location. Free API, 60 requests/hour.
            </div>
          </div>
        )}
        {filters.source === "WEB" && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 text-emerald-600" />
            <div className="text-xs text-emerald-700">
              <strong>Google X-Ray Search</strong> — Finds real candidate profiles publicly indexed across LinkedIn, Naukri, FoundIT, Indeed, Glassdoor, Shine, Instahyre, Hirist, IIMJobs, Cutshort and more. Use the platform filter to target specific portals.
            </div>
          </div>
        )}

        {/* Saved Searches Panel */}
        {showSavedPanel && savedSearches.length > 0 && (
          <div className="mb-4 bg-amber-50/50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2"><Bookmark className="h-4 w-4" /> Saved Searches</h4>
              <button onClick={() => setShowSavedPanel(false)} className="text-amber-600 hover:text-amber-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {savedSearches.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-3 py-2 hover:shadow-sm transition-all group">
                  <button onClick={() => loadSavedSearch(s)} className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-500">{s.source} · {s.resultCount ?? 0} results</p>
                  </button>
                  <button onClick={() => handleDeleteSaved(s.id)} className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Form */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          {filters.source === "INTERNAL" ? (
            <InternalSearchForm filters={filters} updateFilter={updateFilter} empOpen={empOpen} setEmpOpen={setEmpOpen} eduOpen={eduOpen} setEduOpen={setEduOpen} addlOpen={addlOpen} setAddlOpen={setAddlOpen} handleReset={handleReset} handleSearch={handleSearch} loading={loading} setShowSaveDialog={setShowSaveDialog} />
          ) : filters.source === "GITHUB" ? (
            <GitHubSearchForm filters={filters} updateFilter={updateFilter} handleReset={handleReset} handleSearch={handleSearch} loading={loading} setShowSaveDialog={setShowSaveDialog} />
          ) : (
            <WebSearchForm filters={filters} updateFilter={updateFilter} handleReset={handleReset} handleSearch={handleSearch} loading={loading} setShowSaveDialog={setShowSaveDialog} />
          )}
        </div>

        {/* Search Note */}
        {searchNote && (
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {searchNote}
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <div className="mt-5">
            {/* Success Banner */}
            {!loading && totalCount > 0 && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Found {totalCount} candidate{totalCount !== 1 ? "s" : ""} matching your search
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {filters.source === "WEB" ? "AI-powered results from Naukri, LinkedIn & FoundIT. Click Import to save candidates to your database." :
                     filters.source === "GITHUB" ? "Developer profiles from GitHub. Click Import to save candidates to your database." :
                     "Results from your internal candidate database."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {loading ? "Searching..." : `${totalCount} result${totalCount !== 1 ? "s" : ""} found`}
                </h3>
                {!loading && results.length > 0 && (
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-3 w-3" />
                    Export CSV
                  </Button>
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => handleSearch(currentPage - 1)}>Previous</Button>
                  <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => handleSearch(currentPage + 1)}>Next</Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                {filters.source === "WEB" && (
                  <p className="text-xs text-muted-foreground animate-pulse">Fetching candidate profiles across multiple sources — this may take a moment...</p>
                )}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No candidates match your search criteria</p>
                <p className="text-xs mt-1">Try adjusting your filters or keywords</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map(c => (
                  <UnifiedCandidateCard
                    key={c.id}
                    candidate={c}
                    source={filters.source}
                    expanded={expandedCard === c.id}
                    onToggle={() => setExpandedCard(expandedCard === c.id ? null : c.id)}
                    basePath={basePath}
                    formatCtc={formatCtc}
                    isExternal={isExternal}
                    onImport={() => handleImportCandidate(c)}
                    importing={importingId === c.id}
                    imported={importedIds.has(c.id)}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => handleSearch(currentPage - 1)}>Previous</Button>
                <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => handleSearch(currentPage + 1)}>Next</Button>
              </div>
            )}
          </div>
        )}

        {!hasSearched && (
          <div className="mt-8 text-center py-16">
            <Search className="h-16 w-16 mx-auto mb-4 text-primary/20" />
            <h3 className="text-lg font-semibold text-foreground/80">Search in Portal</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {filters.source === "INTERNAL" && "Search your internal candidate database with advanced filters."}
              {filters.source === "GITHUB" && "Search GitHub for developer profiles by skills, language, and location."}
              {filters.source === "WEB" && "AI-powered search across Naukri, LinkedIn, FoundIT and other platforms."}
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-[240px] flex-shrink-0 ml-4 hidden lg:block">
        <div className="bg-card border border-border rounded-xl p-4 space-y-4 sticky top-4">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Quick Filters</h4>

          {filters.source === "INTERNAL" && (
            <>
              <SidebarFilter label="Resume Freshness">
                <div className="flex flex-wrap gap-1">
                  {FRESHNESS_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => updateFilter("resumeFreshness", o.value)}
                      className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                        filters.resumeFreshness === o.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}>{o.label}</button>
                  ))}
                </div>
              </SidebarFilter>
              <SidebarFilter label="Sort by">
                <Select value={filters.sortBy} onValueChange={v => updateFilter("sortBy", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SORT_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>))}</SelectContent>
                </Select>
              </SidebarFilter>
              <SidebarFilter label="Source">
                <Select value={filters.candidateSource} onValueChange={v => updateFilter("candidateSource", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Sources</SelectItem>
                    <SelectItem value="LINKEDIN" className="text-xs">LinkedIn</SelectItem>
                    <SelectItem value="NAUKRI" className="text-xs">Naukri</SelectItem>
                    <SelectItem value="REFERRAL" className="text-xs">Referral</SelectItem>
                    <SelectItem value="INTERNAL_DB" className="text-xs">Internal DB</SelectItem>
                    <SelectItem value="DIRECT" className="text-xs">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </SidebarFilter>
              <SidebarFilter label="Notice Period">
                <Select value={filters.noticePeriod || "any"} onValueChange={v => updateFilter("noticePeriod", v === "any" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTICE_OPTIONS.map(o => (<SelectItem key={o.value || "any"} value={o.value || "any"} className="text-xs">{o.label}</SelectItem>))}</SelectContent>
                </Select>
              </SidebarFilter>
            </>
          )}

          {filters.source === "WEB" && (
            <>
              <SidebarFilter label="Target Platform">
                <Select value={filters.webPlatform} onValueChange={v => updateFilter("webPlatform", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Platforms</SelectItem>
                    <SelectItem value="linkedin" className="text-xs">LinkedIn</SelectItem>
                    <SelectItem value="naukri" className="text-xs">Naukri</SelectItem>
                    <SelectItem value="foundit" className="text-xs">FoundIT</SelectItem>
                    <SelectItem value="indeed" className="text-xs">Indeed</SelectItem>
                    <SelectItem value="glassdoor" className="text-xs">Glassdoor</SelectItem>
                    <SelectItem value="shine" className="text-xs">Shine</SelectItem>
                    <SelectItem value="instahyre" className="text-xs">Instahyre</SelectItem>
                    <SelectItem value="hirist" className="text-xs">Hirist</SelectItem>
                    <SelectItem value="iimjobs" className="text-xs">IIMJobs</SelectItem>
                    <SelectItem value="cutshort" className="text-xs">Cutshort</SelectItem>
                  </SelectContent>
                </Select>
              </SidebarFilter>
              <SidebarFilter label="Results to Fetch">
                <Select value={filters.webResultCount} onValueChange={v => updateFilter("webResultCount", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All profiles</SelectItem>
                    <SelectItem value="25" className="text-xs">25 profiles</SelectItem>
                    <SelectItem value="50" className="text-xs">50 profiles</SelectItem>
                    <SelectItem value="75" className="text-xs">75 profiles</SelectItem>
                    <SelectItem value="100" className="text-xs">100 profiles</SelectItem>
                  </SelectContent>
                </Select>
              </SidebarFilter>
              <div className="p-2.5 bg-emerald-50 rounded-lg">
                <p className="text-[10px] text-emerald-700 font-medium">💡 Tip</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Use specific keywords + location for best results. Import candidates to save them to your internal database.</p>
              </div>
            </>
          )}

          {filters.source === "GITHUB" && (
            <>
              <SidebarFilter label="Language">
                <Select value={filters.githubLanguage} onValueChange={v => updateFilter("githubLanguage", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any" className="text-xs">Any Language</SelectItem>
                    {["JavaScript","TypeScript","Python","Java","Go","Rust","C++","C#","Ruby","PHP","Swift","Kotlin"].map(l => (
                      <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarFilter>
              <SidebarFilter label="Min Repositories">
                <Input type="number" className="h-7 text-xs" placeholder="e.g. 10" value={filters.githubMinRepos} onChange={e => updateFilter("githubMinRepos", e.target.value)} />
              </SidebarFilter>
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-700 font-medium">💡 Free API</p>
                <p className="text-[10px] text-gray-600 mt-0.5">GitHub API is free. 60 requests/hour. Great for finding tech talent by skills & contributions.</p>
              </div>
            </>
          )}

          {(filters.currentLocation || filters.currentCompany || filters.degree) && (
            <div className="border-t border-border pt-3 space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Filters</span>
              {filters.currentLocation && <Badge variant="secondary" className="text-[10px] mr-1"><MapPin className="h-2.5 w-2.5 mr-1" />{filters.currentLocation}</Badge>}
              {filters.currentCompany && <Badge variant="secondary" className="text-[10px] mr-1"><Building2 className="h-2.5 w-2.5 mr-1" />{filters.currentCompany}</Badge>}
              {filters.degree && <Badge variant="secondary" className="text-[10px]"><GraduationCap className="h-2.5 w-2.5 mr-1" />{filters.degree}</Badge>}
            </div>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Save Search Query</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="e.g. Senior Java Developers Mumbai" value={saveName} onChange={e => setSaveName(e.target.value)} autoFocus />
            {totalCount > 0 && <p className="text-xs text-muted-foreground">This search returned {totalCount} results</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSearch} disabled={!saveName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== INTERNAL SEARCH FORM ====================
function InternalSearchForm({ filters, updateFilter, empOpen, setEmpOpen, eduOpen, setEduOpen, addlOpen, setAddlOpen, handleReset, handleSearch, loading, setShowSaveDialog }: any) {
  return (
    <Tabs value={filters.searchMode} onValueChange={(v: string) => updateFilter("searchMode", v)}>
      <div className="border-b border-border px-4 pt-3">
        <TabsList className="bg-transparent h-auto p-0 gap-0">
          {["keyword", "boolean", "basic"].map(mode => (
            <TabsTrigger key={mode} value={mode}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 text-sm font-semibold uppercase">
              {mode} Search
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="keyword" className="p-5 space-y-5 mt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Any keywords</Label><Input placeholder="Optional skills, designation" value={filters.anyKeywords} onChange={(e: any) => updateFilter("anyKeywords", e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">All keywords</Label><Input placeholder="Mandatory skills, designation" value={filters.allKeywords} onChange={(e: any) => updateFilter("allKeywords", e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Exclude keywords</Label><Input placeholder="Skills, designation to exclude" value={filters.excludeKeywords} onChange={(e: any) => updateFilter("excludeKeywords", e.target.value)} /></div>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Total experience</Label>
          <div className="flex items-center gap-3"><Input type="number" placeholder="Min Years" className="max-w-[200px]" value={filters.minExperience} onChange={(e: any) => updateFilter("minExperience", e.target.value)} /><span className="text-xs text-muted-foreground font-medium">TO</span><Input type="number" placeholder="Max Years" className="max-w-[200px]" value={filters.maxExperience} onChange={(e: any) => updateFilter("maxExperience", e.target.value)} /><span className="text-xs text-muted-foreground">In Years</span></div>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Annual salary (INR in lac)</Label>
          <div className="flex items-center gap-3"><Input type="number" placeholder="Min Salary" className="max-w-[200px]" value={filters.minSalary} onChange={(e: any) => updateFilter("minSalary", e.target.value)} /><span className="text-xs text-muted-foreground font-medium">TO</span><Input type="number" placeholder="Max Salary" className="max-w-[200px]" value={filters.maxSalary} onChange={(e: any) => updateFilter("maxSalary", e.target.value)} />
            <div className="flex items-center gap-2 ml-4"><Checkbox id="zeroSalary" checked={filters.includeZeroSalary} onCheckedChange={(v: any) => updateFilter("includeZeroSalary", !!v)} /><Label htmlFor="zeroSalary" className="text-xs text-muted-foreground cursor-pointer">Include zero salary</Label></div>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1"><Label className="text-xs text-muted-foreground mb-1.5 block">Current location</Label><Input placeholder="e.g. Mumbai, Delhi" value={filters.currentLocation} onChange={(e: any) => updateFilter("currentLocation", e.target.value)} /></div>
          <button onClick={() => updateFilter("locationOperator", filters.locationOperator === "AND" ? "OR" : "AND")} className={cn("px-3 py-2 rounded-md text-xs font-bold min-w-[44px] transition-colors", filters.locationOperator === "AND" ? "bg-primary text-primary-foreground" : "bg-amber-500 text-white")}>{filters.locationOperator === "AND" ? "And" : "Or"}</button>
          <div className="flex-1"><Label className="text-xs text-muted-foreground mb-1.5 block">Preferred location</Label><Input placeholder="e.g. Bangalore, Pune" value={filters.preferredLocation} onChange={(e: any) => updateFilter("preferredLocation", e.target.value)} /></div>
          <div className="flex items-center gap-2"><Checkbox id="exactPref" checked={filters.exactPreferredLocation} onCheckedChange={(v: any) => updateFilter("exactPreferredLocation", !!v)} /><Label htmlFor="exactPref" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">Exact preferred location</Label></div>
        </div>
        <ExpandableSection title="Employment Details" icon={Briefcase} open={empOpen} onToggle={() => setEmpOpen(!empOpen)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Current company</Label><Input placeholder="Company name" value={filters.currentCompany} onChange={(e: any) => updateFilter("currentCompany", e.target.value)} /></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Current designation</Label><Input placeholder="Job title" value={filters.currentDesignation} onChange={(e: any) => updateFilter("currentDesignation", e.target.value)} /></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Exclude companies</Label><Input placeholder="Comma-separated" value={filters.excludeCompany} onChange={(e: any) => updateFilter("excludeCompany", e.target.value)} /></div>
          </div>
        </ExpandableSection>
        <ExpandableSection title="Education Details" icon={GraduationCap} open={eduOpen} onToggle={() => setEduOpen(!eduOpen)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Degree</Label><Input placeholder="e.g. B.Tech, MBA" value={filters.degree} onChange={(e: any) => updateFilter("degree", e.target.value)} /></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Institution</Label><Input placeholder="University name" value={filters.institution} onChange={(e: any) => updateFilter("institution", e.target.value)} /></div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Year of passing</Label><Input type="number" placeholder="e.g. 2020" value={filters.graduationYear} onChange={(e: any) => updateFilter("graduationYear", e.target.value)} /></div>
          </div>
        </ExpandableSection>
        <ExpandableSection title="Additional Filters" icon={SlidersHorizontal} open={addlOpen} onToggle={() => setAddlOpen(!addlOpen)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Notice period</Label>
              <Select value={filters.noticePeriod} onValueChange={(v: string) => updateFilter("noticePeriod", v)}><SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger><SelectContent>{NOTICE_OPTIONS.map(o => (<SelectItem key={o.value || "_any"} value={o.value || "any"}>{o.label}</SelectItem>))}</SelectContent></Select>
            </div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Candidate source</Label>
              <Select value={filters.candidateSource} onValueChange={(v: string) => updateFilter("candidateSource", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Sources</SelectItem><SelectItem value="LINKEDIN">LinkedIn</SelectItem><SelectItem value="NAUKRI">Naukri</SelectItem><SelectItem value="REFERRAL">Referral</SelectItem><SelectItem value="INTERNAL_DB">Internal DB</SelectItem><SelectItem value="DIRECT">Direct</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Skills (comma-separated)</Label><Input placeholder="e.g. Java, React, Python" value={filters.skills} onChange={(e: any) => updateFilter("skills", e.target.value)} /></div>
          </div>
        </ExpandableSection>
        <SearchActions handleReset={handleReset} handleSearch={handleSearch} loading={loading} setShowSaveDialog={setShowSaveDialog} />
      </TabsContent>
      <TabsContent value="boolean" className="p-5 space-y-5 mt-0">
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Boolean search query</Label>
          <textarea className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder={'Use AND, OR, NOT operators. Example:\n"Java Developer" AND "React" NOT "Fresher"'} value={filters.booleanQuery} onChange={(e: any) => updateFilter("booleanQuery", e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-1.5">Operators: <strong>AND</strong> · <strong>OR</strong> · <strong>NOT</strong> · Use <strong>"quotes"</strong> for exact phrases</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Experience (years)</Label><div className="flex items-center gap-2"><Input type="number" placeholder="Min" value={filters.minExperience} onChange={(e: any) => updateFilter("minExperience", e.target.value)} /><span className="text-xs">to</span><Input type="number" placeholder="Max" value={filters.maxExperience} onChange={(e: any) => updateFilter("maxExperience", e.target.value)} /></div></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label><Input placeholder="City" value={filters.currentLocation} onChange={(e: any) => updateFilter("currentLocation", e.target.value)} /></div>
        </div>
        <SearchActions handleReset={handleReset} handleSearch={handleSearch} loading={loading} setShowSaveDialog={setShowSaveDialog} />
      </TabsContent>
      <TabsContent value="basic" className="p-5 space-y-5 mt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Keywords</Label><Input placeholder="Enter keywords" value={filters.anyKeywords} onChange={(e: any) => updateFilter("anyKeywords", e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label><Input placeholder="City" value={filters.currentLocation} onChange={(e: any) => updateFilter("currentLocation", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Experience</Label><div className="flex items-center gap-2"><Input type="number" placeholder="Min" value={filters.minExperience} onChange={(e: any) => updateFilter("minExperience", e.target.value)} /><span className="text-xs">to</span><Input type="number" placeholder="Max" value={filters.maxExperience} onChange={(e: any) => updateFilter("maxExperience", e.target.value)} /></div></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Skills</Label><Input placeholder="Comma-separated" value={filters.skills} onChange={(e: any) => updateFilter("skills", e.target.value)} /></div>
        </div>
        <SearchActions handleReset={handleReset} handleSearch={handleSearch} loading={loading} setShowSaveDialog={setShowSaveDialog} showSave={false} />
      </TabsContent>
    </Tabs>
  );
}

// ==================== GITHUB SEARCH FORM ====================
function GitHubSearchForm({ filters, updateFilter, handleReset, handleSearch, loading, setShowSaveDialog }: any) {
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Skills / Keywords</Label><Input placeholder="e.g. React, Machine Learning, DevOps" value={filters.anyKeywords} onChange={(e: any) => updateFilter("anyKeywords", e.target.value)} /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label><Input placeholder="e.g. Bangalore, India" value={filters.currentLocation} onChange={(e: any) => updateFilter("currentLocation", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Programming Language</Label>
          <Select value={filters.githubLanguage || "any"} onValueChange={(v: string) => updateFilter("githubLanguage", v === "any" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Any Language" /></SelectTrigger>
            <SelectContent><SelectItem value="any">Any Language</SelectItem>
              {["JavaScript","TypeScript","Python","Java","Go","Rust","C++","C#","Ruby","PHP","Swift","Kotlin"].map(l => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Min Public Repositories</Label><Input type="number" placeholder="e.g. 5" value={filters.githubMinRepos} onChange={(e: any) => updateFilter("githubMinRepos", e.target.value)} /></div>
      </div>
      <SearchActions handleReset={handleReset} handleSearch={handleSearch} loading={loading} setShowSaveDialog={setShowSaveDialog} />
    </div>
  );
}

// ==================== WEB SEARCH FORM ====================
function WebSearchForm({ filters, updateFilter, handleReset, handleSearch, loading, setShowSaveDialog }: any) {
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Search Keywords / Job Title</Label><Input placeholder="e.g. Senior Java Developer, Data Scientist" value={filters.anyKeywords} onChange={(e: any) => updateFilter("anyKeywords", e.target.value)} /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Skills</Label><Input placeholder="e.g. Java, Spring Boot, Microservices" value={filters.skills} onChange={(e: any) => updateFilter("skills", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label><Input placeholder="e.g. Bangalore, Mumbai" value={filters.currentLocation} onChange={(e: any) => updateFilter("currentLocation", e.target.value)} /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Experience (years)</Label><Input type="number" placeholder="e.g. 5" value={filters.minExperience} onChange={(e: any) => updateFilter("minExperience", e.target.value)} /></div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Target Platform</Label>
          <Select value={filters.webPlatform} onValueChange={(v: string) => updateFilter("webPlatform", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Platforms</SelectItem><SelectItem value="linkedin">LinkedIn</SelectItem><SelectItem value="naukri">Naukri</SelectItem><SelectItem value="foundit">FoundIT</SelectItem><SelectItem value="indeed">Indeed</SelectItem><SelectItem value="glassdoor">Glassdoor</SelectItem><SelectItem value="shine">Shine</SelectItem><SelectItem value="instahyre">Instahyre</SelectItem><SelectItem value="hirist">Hirist</SelectItem><SelectItem value="iimjobs">IIMJobs</SelectItem><SelectItem value="cutshort">Cutshort</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-muted-foreground mb-1.5 block">Results to Fetch</Label>
          <Select value={filters.webResultCount} onValueChange={(v: string) => updateFilter("webResultCount", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All profiles</SelectItem>
              <SelectItem value="25">25 profiles</SelectItem>
              <SelectItem value="50">50 profiles</SelectItem>
              <SelectItem value="75">75 profiles</SelectItem>
              <SelectItem value="100">100 profiles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <SearchActions handleReset={handleReset} handleSearch={handleSearch} loading={loading} setShowSaveDialog={setShowSaveDialog} />
    </div>
  );
}

// ==================== SHARED COMPONENTS ====================
function SearchActions({ handleReset, handleSearch, loading, setShowSaveDialog, showSave = true }: any) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
      <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw className="h-4 w-4" /> Reset</Button>
      {showSave && <Button variant="secondary" onClick={() => setShowSaveDialog(true)} className="gap-2 bg-primary/10 text-primary hover:bg-primary/20"><Save className="h-4 w-4" /> Save Search</Button>}
      <Button onClick={() => handleSearch(1)} disabled={loading} className="gap-2 min-w-[120px]">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
      </Button>
    </div>
  );
}

function ExpandableSection({ title, icon: Icon, open, onToggle, children }: any) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-t border-border hover:bg-muted/30 rounded-lg px-3 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" />{title}</span>
        {open ? <Minus className="h-4 w-4 text-muted-foreground" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pb-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function SidebarFilter({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span><div className="mt-1">{children}</div></div>);
}

// ==================== UNIFIED CANDIDATE CARD ====================
function UnifiedCandidateCard({ candidate: c, source, expanded, onToggle, basePath, formatCtc, isExternal, onImport, importing, imported }: {
  candidate: CandidateResult; source: string; expanded: boolean; onToggle: () => void; basePath: string;
  formatCtc: (v: number | null | undefined) => string; isExternal: boolean;
  onImport: () => void; importing: boolean; imported: boolean;
}) {
  const name = c.name || "Unknown";
  const designation = c.currentDesignation || c.designation || "";
  const company = c.currentCompany || c.company || "";
  const location = c.currentCity || c.location || "";
  const experience = c.totalExperience || c.experience || 0;
  const skills = c.skills || [];
  const summary = c.aiSummary || c.profileSummary || c.bio || "";
  const sourceLabel = c.source || source;

  return (
    <div className={cn("bg-card border rounded-xl transition-all", expanded ? "border-primary/30 shadow-md" : "border-border hover:shadow-sm")}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">{name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isExternal ? (
                <span className="text-sm font-semibold text-foreground">{name}</span>
              ) : (
                <Link href={`${basePath}/candidates/${c.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>{name}</Link>
              )}
              {c.username && <span className="text-xs text-muted-foreground">@{c.username}</span>}
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0",
                sourceLabel === "GITHUB" ? "border-gray-400 text-gray-600" :
                sourceLabel === "LinkedIn" ? "border-blue-400 text-blue-600" :
                sourceLabel === "Naukri" ? "border-emerald-400 text-emerald-600" :
                sourceLabel === "FoundIT" ? "border-orange-400 text-orange-600" : ""
              )}>{sourceLabel}</Badge>
              {c._count && c._count.applications > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{c._count.applications} app{c._count.applications > 1 ? "s" : ""}</Badge>}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              {designation && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{designation}</span>}
              {company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{company}</span>}
              {location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>}
              {c.repos !== undefined && <span className="flex items-center gap-1"><Code2 className="h-3 w-3" />{c.repos} repos</span>}
              {c.followers !== undefined && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.followers} followers</span>}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 text-xs">
            {experience > 0 && <div className="text-center"><p className="font-semibold text-foreground">{experience}y</p><p className="text-[10px] text-muted-foreground">Exp</p></div>}
            {(c.currentCtc || c.expectedCtc) && <div className="text-center"><p className="font-semibold text-foreground">{formatCtc(c.currentCtc || c.expectedCtc)}</p><p className="text-[10px] text-muted-foreground">CTC</p></div>}
            {isExternal && (
              imported ? (
                <Badge className="bg-green-100 text-green-700 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" /> Imported</Badge>
              ) : (
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7 border-primary text-primary hover:bg-primary hover:text-white" onClick={e => { e.stopPropagation(); onImport(); }} disabled={importing}>
                  {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                  Import
                </Button>
              )
            )}
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
          </div>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-14">
            {skills.slice(0, expanded ? undefined : 6).map((s: string) => (
              <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary/80">{s}</Badge>
            ))}
            {!expanded && skills.length > 6 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{skills.length - 6} more</Badge>}
          </div>
        )}
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3">
            {c.email && <DetailItem label="Email" value={c.email} icon={Mail} />}
            {c.phone && <DetailItem label="Phone" value={c.phone} icon={Phone} />}
            {(c.degree || c.education) && <DetailItem label="Education" value={c.degree || c.education || "—"} icon={GraduationCap} />}
            {c.noticePeriod !== undefined && c.noticePeriod !== null && <DetailItem label="Notice" value={`${c.noticePeriod} days`} icon={Clock} />}
            {c.expectedCtc && <DetailItem label="Expected CTC" value={formatCtc(c.expectedCtc)} icon={BadgeIndianRupee} />}
            {c.institution && <DetailItem label="Institution" value={c.institution} icon={Building2} />}
            {c.blogUrl && <DetailItem label="Blog" value={c.blogUrl} icon={Globe} />}
          </div>
          {summary && (
            <div className="mt-3 p-3 bg-primary/5 rounded-lg">
              <p className="text-[10px] font-semibold text-primary mb-1">Summary</p>
              <p className="text-xs text-foreground/80 line-clamp-3">{summary}</p>
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            {!isExternal && <Link href={`${basePath}/candidates/${c.id}`}><Button size="sm" variant="outline" className="text-xs gap-1.5"><FileText className="h-3 w-3" /> View Profile</Button></Link>}
            {(c.profileUrl || c.linkedinUrl) && <a href={c.profileUrl || c.linkedinUrl || ""} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="text-xs gap-1.5"><ExternalLink className="h-3 w-3" /> Profile</Button></a>}
            {c.resumeUrl && <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="text-xs gap-1.5"><ExternalLink className="h-3 w-3" /> Resume</Button></a>}
            {isExternal && !imported && (
              <Button size="sm" className="text-xs gap-1.5" onClick={onImport} disabled={importing}>
                {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Import to Database
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (<div><span className="text-[10px] text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</span><p className="text-xs font-medium text-foreground mt-0.5 truncate">{value}</p></div>);
}
