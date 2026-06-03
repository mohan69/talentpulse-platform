"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Search,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
  Users,
  Briefcase,
  MapPin,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Building2,
  GraduationCap,
  BadgeIndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NaukriCandidateData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  currentCompany?: string | null;
  designation?: string | null;
  experience?: number | null;
  skills: string[];
  location?: string | null;
  currentCtc?: string | null;
  expectedCtc?: string | null;
  noticePeriod?: string | null;
  education?: string | null;
  summary?: string | null;
  naukriProfileId?: string | null;
  matchedJobId?: string | null;
  matchedJob?: { id: string; title: string; client: { name: string } } | null;
  matchScore?: number | null;
  matchReason?: string | null;
  importedToPipeline: boolean;
  candidateId?: string | null;
  applicationId?: string | null;
  status: string;
}

interface NaukriImportData {
  id: string;
  userId: string;
  user: { name: string };
  rawData: string;
  status: string;
  candidateCount: number;
  searchQuery?: string | null;
  createdAt: string;
  candidates: NaukriCandidateData[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  NEW: { label: "New", color: "bg-blue-100 text-blue-700", icon: FileText },
  MATCHED: { label: "Matched", color: "bg-purple-100 text-purple-700", icon: Sparkles },
  IMPORTED: { label: "In Pipeline", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  DUPLICATE: { label: "Duplicate", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
};

export function NaukriAssistantClient({ role }: { role: "admin" | "recruiter" }) {
  const [imports, setImports] = useState<NaukriImportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasteText, setPasteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [parsing, setParsing] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [expandedImport, setExpandedImport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"import" | "history">("import");

  const fetchImports = useCallback(async () => {
    try {
      const res = await fetch("/api/naukri-assistant");
      if (res.ok) {
        const data = await res.json();
        setImports(data);
      }
    } catch (err) {
      console.error("Fetch imports error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImports(); }, [fetchImports]);

  const handleParse = async () => {
    if (!pasteText.trim() || pasteText.trim().length < 20) return;
    setParsing(true);
    try {
      const res = await fetch("/api/naukri-assistant/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawData: pasteText, searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to parse");
        return;
      }
      setPasteText("");
      setSearchQuery("");
      setActiveTab("history");
      setExpandedImport(data.id);
      await fetchImports();
    } catch (err: any) {
      alert(err.message || "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  const handleMatchAll = async (importId: string) => {
    setMatching(importId);
    try {
      const res = await fetch("/api/naukri-assistant/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Matching failed");
        return;
      }
      await fetchImports();
    } catch (err: any) {
      alert(err.message || "Match failed");
    } finally {
      setMatching(null);
    }
  };

  const handleImportSelected = async () => {
    if (selectedCandidates.size === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/naukri-assistant/import-to-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naukriCandidateIds: [...selectedCandidates] }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Import failed");
        return;
      }
      alert(`Imported ${data.imported} candidate(s) to pipeline.${data.duplicates ? ` ${data.duplicates} duplicate(s) skipped.` : ""}`);
      setSelectedCandidates(new Set());
      await fetchImports();
    } catch (err: any) {
      alert(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteImport = async (importId: string) => {
    if (!confirm("Delete this import and all its candidates?")) return;
    try {
      await fetch(`/api/naukri-assistant/${importId}`, { method: "DELETE" });
      await fetchImports();
    } catch {}
  };

  const handleRejectCandidate = async (importId: string, candidateId: string) => {
    try {
      await fetch(`/api/naukri-assistant/${importId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, status: "REJECTED" }),
      });
      await fetchImports();
    } catch {}
  };

  const toggleSelect = (id: string) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (candidates: NaukriCandidateData[]) => {
    const importable = candidates.filter(c => !c.importedToPipeline && c.status !== "REJECTED" && c.status !== "DUPLICATE");
    const allSelected = importable.every(c => selectedCandidates.has(c.id));
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      importable.forEach(c => allSelected ? next.delete(c.id) : next.add(c.id));
      return next;
    });
  };

  const basePath = role === "admin" ? "/admin" : "/recruiter";

  // Stats
  const totalImported = imports.reduce((acc, imp) => acc + imp.candidates.filter(c => c.status === "IMPORTED").length, 0);
  const totalMatched = imports.reduce((acc, imp) => acc + imp.candidates.filter(c => c.matchScore != null && c.matchScore > 0).length, 0);
  const totalParsed = imports.reduce((acc, imp) => acc + imp.candidateCount, 0);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Imports</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{imports.length}</p>
        </div>
        <div className="rounded-xl bg-violet-50 p-4">
          <div className="flex items-center gap-2 text-violet-600 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Parsed</span>
          </div>
          <p className="text-2xl font-bold text-violet-900">{totalParsed}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI Matched</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{totalMatched}</p>
        </div>
        <div className="rounded-xl bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">In Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{totalImported}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("import")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "import" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Upload className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Paste & Parse
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            activeTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Search className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Imports & Candidates ({totalParsed})
        </button>
      </div>

      {/* Import Tab */}
      {activeTab === "import" && (
        <div className="rounded-xl border bg-card shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Paste Naukri RESDEX Results</h3>
            <p className="text-sm text-muted-foreground">
              Copy your RESDEX search results from Naukri and paste below. Our AI will automatically extract and structure all candidate profiles.
            </p>
          </div>

          <Input
            placeholder={'Search query used on Naukri (optional, e.g. "Java Developer Bangalore 5-8 years")'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Textarea
            placeholder={`Paste your RESDEX search results here...\n\nExample format:\n------\nRahul Sharma\nSenior Java Developer at TCS\nBangalore | 6 years exp | ₹12 LPA\nSkills: Java, Spring Boot, Microservices, AWS\nNotice: 30 days\n------\nPriya Patel\nReact Developer at Infosys\nPune | 4 years exp | ₹8 LPA\n...`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {pasteText.length > 0 ? `${pasteText.length} characters` : "Paste text to begin"}
            </p>
            <Button onClick={handleParse} disabled={parsing || pasteText.trim().length < 20} size="lg">
              {parsing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />AI Parsing...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Parse with AI</>
              )}
            </Button>
          </div>

          {/* How it works */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold mb-3">How it works</h4>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { step: "1", title: "Paste Results", desc: "Copy search results from Naukri RESDEX and paste here", icon: FileText },
                { step: "2", title: "AI Parsing", desc: "Our AI extracts candidate profiles automatically", icon: Sparkles },
                { step: "3", title: "Job Matching", desc: "AI matches candidates against your open positions", icon: Briefcase },
                { step: "4", title: "Import to Pipeline", desc: "Add matched candidates to your recruitment pipeline", icon: UserPlus },
              ].map(({ step, title, desc, icon: Icon }) => (
                <div key={step} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading imports...
            </div>
          ) : imports.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No imports yet. Paste your first RESDEX results to get started.</p>
              <Button variant="outline" className="mt-3" onClick={() => setActiveTab("import")}>
                Go to Import
              </Button>
            </div>
          ) : (
            imports.map((imp) => {
              const isExpanded = expandedImport === imp.id;
              const importable = imp.candidates.filter(c => !c.importedToPipeline && c.status !== "REJECTED" && c.status !== "DUPLICATE");
              const hasUnmatched = imp.candidates.some(c => c.status === "NEW" && !c.matchedJobId);

              return (
                <div key={imp.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  {/* Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setExpandedImport(isExpanded ? null : imp.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        imp.status === "PARSED" ? "bg-green-100 text-green-600" : imp.status === "FAILED" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {imp.status === "PARSED" ? <CheckCircle2 className="h-5 w-5" /> : imp.status === "FAILED" ? <XCircle className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {imp.searchQuery || "RESDEX Import"}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Date(imp.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {imp.candidateCount} candidate{imp.candidateCount !== 1 ? "s" : ""} parsed
                          {imp.candidates.filter(c => c.status === "IMPORTED").length > 0 && (
                            <span className="text-green-600"> · {imp.candidates.filter(c => c.status === "IMPORTED").length} imported</span>
                          )}
                          {imp.candidates.filter(c => c.matchScore != null).length > 0 && (
                            <span className="text-purple-600"> · {imp.candidates.filter(c => c.matchScore != null).length} matched</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded && imp.status === "PARSED" && (
                        <>
                          {hasUnmatched && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleMatchAll(imp.id); }}
                              disabled={matching === imp.id}
                            >
                              {matching === imp.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                              AI Match Jobs
                            </Button>
                          )}
                          {importable.length > 0 && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedCandidates.size === 0) {
                                  toggleSelectAll(imp.candidates);
                                } else {
                                  handleImportSelected();
                                }
                              }}
                              disabled={importing}
                            >
                              {importing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
                              {selectedCandidates.size > 0 ? `Import ${selectedCandidates.size} to Pipeline` : "Select All"}
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handleDeleteImport(imp.id); }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded Candidates */}
                  {isExpanded && imp.candidates.length > 0 && (
                    <div className="border-t">
                      {/* Select all bar */}
                      {importable.length > 0 && (
                        <div className="px-4 py-2 bg-muted/50 flex items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={importable.length > 0 && importable.every(c => selectedCandidates.has(c.id))}
                            onChange={() => toggleSelectAll(imp.candidates)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-muted-foreground">
                            Select all importable ({importable.length})
                          </span>
                        </div>
                      )}

                      <div className="divide-y">
                        {imp.candidates.map((c) => {
                          const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.NEW;
                          const StatusIcon = cfg.icon;
                          const canSelect = !c.importedToPipeline && c.status !== "REJECTED" && c.status !== "DUPLICATE";

                          return (
                            <div key={c.id} className={cn("p-4 hover:bg-accent/30 transition-colors", c.importedToPipeline && "bg-green-50/50")}>
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <div className="pt-0.5">
                                  {canSelect ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedCandidates.has(c.id)}
                                      onChange={() => toggleSelect(c.id)}
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                  ) : (
                                    <div className="h-4 w-4" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-semibold text-sm">{c.name}</h5>
                                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
                                      <StatusIcon className="h-3 w-3" />
                                      {cfg.label}
                                    </span>
                                    {c.matchScore != null && (
                                      <span className={cn(
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                        c.matchScore >= 70 ? "bg-green-100 text-green-700" : c.matchScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                      )}>
                                        <Star className="h-3 w-3" />
                                        {Math.round(c.matchScore)}% match
                                      </span>
                                    )}
                                  </div>

                                  {/* Details grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    {c.designation && (
                                      <span className="flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" />
                                        {c.designation}
                                      </span>
                                    )}
                                    {c.currentCompany && (
                                      <span className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {c.currentCompany}
                                      </span>
                                    )}
                                    {c.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {c.location}
                                      </span>
                                    )}
                                    {c.experience != null && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {c.experience} yrs exp
                                      </span>
                                    )}
                                    {c.currentCtc && (
                                      <span className="flex items-center gap-1">
                                        <BadgeIndianRupee className="h-3 w-3" />
                                        CTC: {c.currentCtc}
                                      </span>
                                    )}
                                    {c.noticePeriod && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Notice: {c.noticePeriod}
                                      </span>
                                    )}
                                    {c.education && (
                                      <span className="flex items-center gap-1">
                                        <GraduationCap className="h-3 w-3" />
                                        {c.education}
                                      </span>
                                    )}
                                    {c.email && (
                                      <span className="truncate">{c.email}</span>
                                    )}
                                  </div>

                                  {/* Skills */}
                                  {c.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {c.skills.slice(0, 8).map((s, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded bg-muted text-xs">{s}</span>
                                      ))}
                                      {c.skills.length > 8 && <span className="text-xs text-muted-foreground">+{c.skills.length - 8}</span>}
                                    </div>
                                  )}

                                  {/* Match info */}
                                  {c.matchedJob && (
                                    <div className="mt-2 p-2 rounded-lg bg-purple-50 text-xs">
                                      <span className="font-medium text-purple-700">Best Match:</span>{" "}
                                      <a href={`${basePath}/jobs/${c.matchedJob.id}`} className="text-purple-700 underline">
                                        {c.matchedJob.title}
                                      </a>
                                      <span className="text-purple-600"> at {c.matchedJob.client.name}</span>
                                      {c.matchReason && <p className="text-purple-600 mt-0.5">{c.matchReason}</p>}
                                    </div>
                                  )}

                                  {/* Imported link */}
                                  {c.importedToPipeline && c.candidateId && (
                                    <div className="mt-2">
                                      <a
                                        href={`${basePath}/candidates/${c.candidateId}`}
                                        className="text-xs text-green-700 underline inline-flex items-center gap-1"
                                      >
                                        <ArrowRight className="h-3 w-3" />
                                        View in Pipeline
                                      </a>
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {canSelect && c.status !== "MATCHED" && !c.matchedJobId && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs text-muted-foreground hover:text-destructive"
                                      onClick={() => handleRejectCandidate(imp.id, c.id)}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
