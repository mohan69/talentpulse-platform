"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Search, Upload, UserPlus, Users, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  Phone, Mail, MapPin, Building2, Briefcase, ArrowRightLeft, Trash2, Tag, Download, X,
  CheckCircle, Clock, XCircle, AlertCircle, Eye,
} from "lucide-react";

interface ProspectsClientProps {
  recruiters: { id: string; name: string }[];
  openJobs: { id: string; title: string; clientName: string }[];
  role: "ADMIN" | "RECRUITER";
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  NEW: { label: "New", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  CONTACTED: { label: "Contacted", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Phone },
  INTERESTED: { label: "Interested", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  QUALIFIED: { label: "Qualified", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  CONVERTED: { label: "Converted", color: "bg-primary/10 text-primary border-primary/20", icon: ArrowRightLeft },
  NOT_INTERESTED: { label: "Not Interested", color: "bg-amber-50 text-amber-700 border-amber-200", icon: XCircle },
  NOT_REACHABLE: { label: "Not Reachable", color: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertCircle },
  REJECTED: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

const SOURCE_OPTIONS = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "NAUKRI", label: "Naukri" },
  { value: "REFERRAL", label: "Referral" },
  { value: "INTERNAL_DB", label: "Internal DB" },
  { value: "DIRECT", label: "Direct" },
  { value: "OTHER", label: "Other" },
];

export function ProspectsClient({ recruiters, openJobs, role }: ProspectsClientProps) {
  const router = useRouter();
  const [prospects, setProspects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<{ status: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailProspect, setDetailProspect] = useState<any>(null);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (searchQuery) params.set("q", searchQuery);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterSource !== "all") params.set("source", filterSource);
    if (filterOwner !== "all") params.set("ownerId", filterOwner);

    try {
      const res = await fetch(`/api/prospects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProspects(data.prospects);
        setTotal(data.total);
        setPages(data.pages);
        setStatusCounts(data.statusCounts);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, searchQuery, filterStatus, filterSource, filterOwner]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === prospects.length) setSelected(new Set());
    else setSelected(new Set(prospects.map((p) => p.id)));
  };

  const totalCount = statusCounts.reduce((s, c) => s + c.count, 0);
  const getCount = (st: string) => statusCounts.find((c) => c.status === st)?.count ?? 0;

  return (
    <div className="space-y-4 mt-6">
      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setFilterStatus("all"); setPage(1); }}
          className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            filterStatus === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-accent"
          )}
        >
          All ({totalCount})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = getCount(key);
          if (count === 0 && key !== filterStatus) return null;
          return (
            <button
              key={key}
              onClick={() => { setFilterStatus(filterStatus === key ? "all" : key); setPage(1); }}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                filterStatus === key ? `${cfg.color} border-current font-semibold` : "bg-muted text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prospects..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={filterSource} onValueChange={(v) => { setFilterSource(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {role === "ADMIN" && recruiters.length > 0 && (
              <Select value={filterOwner} onValueChange={(v) => { setFilterOwner(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Owner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {recruiters.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-1.5" /> Bulk Import
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" /> Add Prospect
            </Button>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => setShowConvertDialog(true)}>
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Convert to Candidates
              </Button>
              <BulkStatusUpdate ids={Array.from(selected)} onDone={() => { setSelected(new Set()); fetchProspects(); }} />
              {role === "ADMIN" && (
                <Button size="sm" variant="destructive" onClick={async () => {
                  if (!confirm(`Delete ${selected.size} prospects?`)) return;
                  await fetch("/api/prospects/bulk-update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prospectIds: Array.from(selected), action: "delete" }),
                  });
                  setSelected(new Set());
                  fetchProspects();
                }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No prospects found</p>
              <p className="text-xs text-muted-foreground mt-1">Add prospects manually or use Bulk Import to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-3 px-4 w-10">
                      <Checkbox checked={selected.size === prospects.length && prospects.length > 0} onCheckedChange={toggleSelectAll} />
                    </th>
                    <th className="py-3 px-3 text-left font-medium">Name</th>
                    <th className="py-3 px-3 text-left font-medium">Contact</th>
                    <th className="py-3 px-3 text-left font-medium">Current Role</th>
                    <th className="py-3 px-3 text-center font-medium">Exp</th>
                    <th className="py-3 px-3 text-center font-medium">Source</th>
                    <th className="py-3 px-3 text-center font-medium">Status</th>
                    {role === "ADMIN" && <th className="py-3 px-3 text-left font-medium">Owner</th>}
                    <th className="py-3 px-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => {
                    const stCfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.NEW;
                    return (
                      <tr key={p.id} className={cn("border-b border-border/40 hover:bg-muted/20 transition-colors", selected.has(p.id) && "bg-primary/5")}>
                        <td className="py-2.5 px-4">
                          <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium">{p.name}</div>
                          {p.currentCity && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />{p.currentCity}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.email && <div className="text-xs flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{p.email}</div>}
                          {p.phone && <div className="text-xs flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3 text-muted-foreground" />{p.phone}</div>}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.currentDesignation && <div className="text-xs font-medium">{p.currentDesignation}</div>}
                          {p.currentCompany && <div className="text-xs text-muted-foreground">{p.currentCompany}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs">{p.totalExperience != null ? `${p.totalExperience}y` : "-"}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{p.source?.replace("_", " ")}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", stCfg.color)}>{stCfg.label}</span>
                        </td>
                        {role === "ADMIN" && <td className="py-2.5 px-3 text-xs text-muted-foreground">{p.owner?.name ?? "-"}</td>}
                        <td className="py-2.5 px-3 text-center">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setDetailProspect(p); setShowDetailDialog(true); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs px-2">Page {page}/{pages}</span>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Prospect Dialog */}
      <AddProspectDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        recruiters={recruiters}
        role={role}
        onSuccess={() => { setShowAddDialog(false); fetchProspects(); }}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={() => { setShowImportDialog(false); fetchProspects(); }}
      />

      {/* Convert Dialog */}
      <ConvertDialog
        open={showConvertDialog}
        onClose={() => setShowConvertDialog(false)}
        selectedIds={Array.from(selected)}
        openJobs={openJobs}
        onSuccess={() => { setShowConvertDialog(false); setSelected(new Set()); fetchProspects(); }}
      />

      {/* Detail Dialog */}
      <ProspectDetailDialog
        open={showDetailDialog}
        prospect={detailProspect}
        onClose={() => { setShowDetailDialog(false); setDetailProspect(null); }}
        recruiters={recruiters}
        openJobs={openJobs}
        role={role}
        onUpdate={() => fetchProspects()}
      />
    </div>
  );
}

/* ======================== ADD PROSPECT DIALOG ======================== */
function AddProspectDialog({ open, onClose, recruiters, role, onSuccess }: {
  open: boolean; onClose: () => void; recruiters: { id: string; name: string }[]; role: string; onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.name?.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        skills: form.skills ? form.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      }),
    });
    if (res.ok) { setForm({}); onSuccess(); }
    else { const d = await res.json(); setError(d.error || "Failed to save"); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Prospect</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Name *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>City</Label><Input value={form.currentCity ?? ""} onChange={(e) => setForm({ ...form, currentCity: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={form.currentCompany ?? ""} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} /></div>
          <div><Label>Designation</Label><Input value={form.currentDesignation ?? ""} onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })} /></div>
          <div><Label>Experience (yrs)</Label><Input type="number" step="0.5" value={form.totalExperience ?? ""} onChange={(e) => setForm({ ...form, totalExperience: e.target.value })} /></div>
          <div className="col-span-2"><Label>Skills (comma separated)</Label><Input value={form.skills ?? ""} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
          <div><Label>Current CTC (LPA)</Label><Input type="number" step="0.5" value={form.currentCtc ?? ""} onChange={(e) => setForm({ ...form, currentCtc: e.target.value })} /></div>
          <div><Label>Expected CTC (LPA)</Label><Input type="number" step="0.5" value={form.expectedCtc ?? ""} onChange={(e) => setForm({ ...form, expectedCtc: e.target.value })} /></div>
          <div><Label>Notice Period (days)</Label><Input type="number" value={form.noticePeriod ?? ""} onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })} /></div>
          <div>
            <Label>Source</Label>
            <Select value={form.source ?? "OTHER"} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>LinkedIn URL</Label><Input value={form.linkedinUrl ?? ""} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></div>
          <div className="col-span-2"><Label>Tags (comma separated)</Label><Input value={form.tags ?? ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          {role === "ADMIN" && recruiters.length > 0 && (
            <div className="col-span-2">
              <Label>Assign to</Label>
              <Select value={form.ownerId ?? ""} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select recruiter" /></SelectTrigger>
                <SelectContent>{recruiters.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add Prospect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ======================== BULK IMPORT DIALOG ======================== */
function BulkImportDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string ?? "");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true); setResult(null);
    try {
      const res = await fetch("/api/prospects/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, sourceDetail }),
      });
      const data = await res.json();
      setResult(data);
      if (res.ok && data.imported > 0) {
        setTimeout(onSuccess, 2000);
      }
    } catch {
      setResult({ error: "Import failed" });
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const csv = "Name,Email,Phone,City,Company,Designation,Experience,Skills,Degree,Institution,Current CTC,Expected CTC,Notice Period,LinkedIn,Source,Notes,Tags\nJohn Doe,john@example.com,9876543210,Bangalore,TCS,Senior Developer,5,Java; Spring Boot; AWS,B.Tech,IIT Delhi,12,18,30,https://linkedin.com/in/johndoe,LINKEDIN,Good communication skills,java;backend";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prospect-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setCsvText(""); setResult(null); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulk Import Prospects</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
              <li>Download the CSV template or prepare your own CSV with a <strong>Name</strong> column (required)</li>
              <li>Upload the CSV file or paste data directly below</li>
              <li>Supported columns: Name, Email, Phone, City, Company, Designation, Experience, Skills, Degree, Current CTC, Expected CTC, Notice Period, LinkedIn, Source, Notes, Tags</li>
              <li>Skills and Tags can be separated by commas, semicolons, or pipes (|)</li>
              <li>Duplicates (by email) are automatically skipped</li>
            </ol>
            <Button variant="outline" size="sm" className="mt-3" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download Template
            </Button>
          </div>

          <div>
            <Label>Upload CSV File</Label>
            <Input type="file" accept=".csv,.txt" onChange={handleFileRead} className="mt-1" />
          </div>

          <div>
            <Label>Or paste CSV data</Label>
            <Textarea
              rows={8}
              placeholder="Name,Email,Phone,City,..."
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="mt-1 font-mono text-xs"
            />
          </div>

          <div>
            <Label>Source Description (optional)</Label>
            <Input
              placeholder="e.g., Naukri RESDEX batch - May 2026"
              value={sourceDetail}
              onChange={(e) => setSourceDetail(e.target.value)}
            />
          </div>

          {result && (
            <div className={cn("rounded-lg p-4 text-sm", result.error && !result.imported ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
              {result.error && !result.imported ? (
                <p>{result.error}</p>
              ) : (
                <>
                  <p className="font-medium">Import Complete</p>
                  <p className="mt-1">Total rows: {result.total} · Imported: {result.imported} · Skipped: {result.skipped}</p>
                  {result.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium">Skipped rows:</p>
                      {result.errors.slice(0, 10).map((e: any, i: number) => (
                        <p key={i} className="text-xs">Row {e.row} ({e.name}): {e.reason}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setCsvText(""); setResult(null); }}>Close</Button>
          <Button onClick={handleImport} disabled={importing || !csvText.trim()}>
            {importing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Import {csvText.trim() ? `(${csvText.split("\n").filter((l) => l.trim()).length - 1} rows)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ======================== CONVERT DIALOG ======================== */
function ConvertDialog({ open, onClose, selectedIds, openJobs, onSuccess }: {
  open: boolean; onClose: () => void; selectedIds: string[]; openJobs: { id: string; title: string; clientName: string }[]; onSuccess: () => void;
}) {
  const [jobId, setJobId] = useState("");
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleConvert = async () => {
    setConverting(true); setResult(null);
    try {
      const res = await fetch("/api/prospects/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds: selectedIds, jobId: jobId || undefined }),
      });
      const data = await res.json();
      setResult(data);
      if (res.ok && data.converted > 0) {
        setTimeout(onSuccess, 2000);
      }
    } catch {
      setResult({ error: "Conversion failed" });
    }
    setConverting(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setResult(null); setJobId(""); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Convert to Candidates</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will convert <strong>{selectedIds.length}</strong> prospect(s) into full candidates. Their data will be copied and they’ll appear in the Candidates module.
          </p>

          <div>
            <Label>Apply to Job (optional)</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger><SelectValue placeholder="No job — just convert" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No job — just convert</SelectItem>
                {openJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title} ({j.clientName})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">If selected, an application will be created for each converted candidate</p>
          </div>

          {result && (
            <div className={cn("rounded-lg p-3 text-sm", result.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
              {result.error ? (
                <p>{result.error}</p>
              ) : (
                <p>Converted: {result.converted} · Failed: {result.failed}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setResult(null); setJobId(""); }}>Cancel</Button>
          <Button onClick={handleConvert} disabled={converting}>
            {converting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Convert {selectedIds.length} Prospect(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ======================== BULK STATUS UPDATE ======================== */
function BulkStatusUpdate({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    await fetch("/api/prospects/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: ids, status }),
    });
    setUpdating(false);
    onDone();
  };

  return (
    <Select onValueChange={updateStatus} disabled={updating}>
      <SelectTrigger className="w-[150px] h-8 text-xs">
        <SelectValue placeholder="Change Status" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "CONVERTED").map(([key, cfg]) => (
          <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ======================== PROSPECT DETAIL DIALOG ======================== */
function ProspectDetailDialog({ open, prospect, onClose, recruiters, openJobs, role, onUpdate }: {
  open: boolean; prospect: any; onClose: () => void;
  recruiters: { id: string; name: string }[]; openJobs: { id: string; title: string; clientName: string }[];
  role: string; onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (prospect) {
      setForm({
        ...prospect,
        skills: prospect.skills?.join(", ") ?? "",
        tags: prospect.tags?.join(", ") ?? "",
      });
      setEditing(false);
    }
  }, [prospect]);

  if (!prospect) return null;

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        skills: typeof form.skills === "string" ? form.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : form.skills,
        tags: typeof form.tags === "string" ? form.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : form.tags,
      }),
    });
    if (res.ok) { setEditing(false); onUpdate(); }
    setSaving(false);
  };

  const handleConvertSingle = async (jobId?: string) => {
    const res = await fetch("/api/prospects/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds: [prospect.id], jobId: jobId || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdate();
      onClose();
      if (data.results?.[0]?.candidateId) {
        const prefix = role === "ADMIN" ? "/admin" : "/recruiter";
        router.push(`${prefix}/candidates/${data.results[0].candidateId}`);
      }
    }
  };

  const stCfg = STATUS_CONFIG[prospect.status] ?? STATUS_CONFIG.NEW;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{prospect.name}</DialogTitle>
            <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", stCfg.color)}>{stCfg.label}</span>
          </div>
        </DialogHeader>

        {!editing ? (
          <div className="space-y-4">
            {/* Info rows */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {prospect.email && <InfoRow icon={Mail} label="Email" value={prospect.email} />}
              {prospect.phone && <InfoRow icon={Phone} label="Phone" value={prospect.phone} />}
              {prospect.currentCity && <InfoRow icon={MapPin} label="City" value={prospect.currentCity} />}
              {prospect.currentCompany && <InfoRow icon={Building2} label="Company" value={prospect.currentCompany} />}
              {prospect.currentDesignation && <InfoRow icon={Briefcase} label="Designation" value={prospect.currentDesignation} />}
              {prospect.totalExperience != null && <InfoRow icon={Clock} label="Experience" value={`${prospect.totalExperience} years`} />}
              {prospect.currentCtc != null && <InfoRow icon={Tag} label="Current CTC" value={`₹${prospect.currentCtc} LPA`} />}
              {prospect.expectedCtc != null && <InfoRow icon={Tag} label="Expected CTC" value={`₹${prospect.expectedCtc} LPA`} />}
              {prospect.noticePeriod != null && <InfoRow icon={Clock} label="Notice" value={`${prospect.noticePeriod} days`} />}
              {prospect.source && <InfoRow icon={Tag} label="Source" value={prospect.source.replace("_", " ")} />}
            </div>

            {prospect.skills?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {prospect.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                </div>
              </div>
            )}

            {prospect.tags?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {prospect.tags.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              </div>
            )}

            {prospect.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{prospect.notes}</p>
              </div>
            )}

            {prospect.status === "CONVERTED" && prospect.convertedCandidateId && (
              <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
                ✓ Converted to candidate.
                <Button variant="link" className="text-green-700 underline p-0 h-auto ml-1" onClick={() => {
                  const prefix = role === "ADMIN" ? "/admin" : "/recruiter";
                  router.push(`${prefix}/candidates/${prospect.convertedCandidateId}`);
                  onClose();
                }}>View Candidate →</Button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              {prospect.status !== "CONVERTED" && (
                <Button size="sm" onClick={() => setShowConvert(true)}>
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Convert to Candidate
                </Button>
              )}
              {/* Status quick-change */}
              {prospect.status !== "CONVERTED" && (
                <Select onValueChange={async (v) => {
                  await fetch(`/api/prospects/${prospect.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: v }),
                  });
                  onUpdate();
                  onClose();
                }}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Change Status" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "CONVERTED").map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Convert inline */}
            {showConvert && (
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-medium">Convert to Candidate</p>
                <Select onValueChange={(v) => handleConvertSingle(v === "none" ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Select job (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No job — just convert</SelectItem>
                    {openJobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title} ({j.clientName})</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => setShowConvert(false)}>Cancel</Button>
              </div>
            )}
          </div>
        ) : (
          /* Edit mode */
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.currentCity ?? ""} onChange={(e) => setForm({ ...form, currentCity: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.currentCompany ?? ""} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} /></div>
            <div><Label>Designation</Label><Input value={form.currentDesignation ?? ""} onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })} /></div>
            <div><Label>Experience (yrs)</Label><Input type="number" step="0.5" value={form.totalExperience ?? ""} onChange={(e) => setForm({ ...form, totalExperience: e.target.value })} /></div>
            <div className="col-span-2"><Label>Skills (comma separated)</Label><Input value={form.skills ?? ""} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
            <div><Label>Current CTC</Label><Input type="number" step="0.5" value={form.currentCtc ?? ""} onChange={(e) => setForm({ ...form, currentCtc: e.target.value })} /></div>
            <div><Label>Expected CTC</Label><Input type="number" step="0.5" value={form.expectedCtc ?? ""} onChange={(e) => setForm({ ...form, expectedCtc: e.target.value })} /></div>
            <div><Label>Notice (days)</Label><Input type="number" value={form.noticePeriod ?? ""} onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })} /></div>
            <div>
              <Label>Source</Label>
              <Select value={form.source ?? "OTHER"} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Tags (comma separated)</Label><Input value={form.tags ?? ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            {role === "ADMIN" && recruiters.length > 0 && (
              <div className="col-span-2">
                <Label>Assign to</Label>
                <Select value={form.ownerId ?? ""} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{recruiters.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2 flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
