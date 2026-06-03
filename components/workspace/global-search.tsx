"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Briefcase, Building2, X, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  candidates: any[];
  jobs: any[];
  clients: any[];
  prospects: any[];
}

export function GlobalSearch({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ candidates: [], jobs: [], clients: [], prospects: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const rolePrefix = role === "ADMIN" ? "/admin" : role === "RECRUITER" ? "/recruiter" : "/client-portal";

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ candidates: [], jobs: [], clients: [], prospects: [] });
      setSelectedIndex(0);
    }
  }, [open]);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ candidates: [], jobs: [], clients: [], prospects: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val), 300);
  };

  const allItems = [
    ...results.prospects.map((p) => ({ type: "prospect" as const, data: p })),
    ...results.candidates.map((c) => ({ type: "candidate" as const, data: c })),
    ...results.jobs.map((j) => ({ type: "job" as const, data: j })),
    ...results.clients.map((cl) => ({ type: "client" as const, data: cl })),
  ];

  const navigateTo = (item: (typeof allItems)[0]) => {
    setOpen(false);
    if (item.type === "prospect") router.push(`${rolePrefix}/prospects`);
    else if (item.type === "candidate") router.push(`${rolePrefix}/candidates/${item.data.id}`);
    else if (item.type === "job") router.push(`${rolePrefix}/jobs/${item.data.id}`);
    else if (item.type === "client" && (role === "ADMIN" || role === "RECRUITER")) router.push(`${rolePrefix}/clients`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault();
      navigateTo(allItems[selectedIndex]);
    }
  };

  const hasResults = allItems.length > 0;
  const showNoResults = query.length >= 2 && !loading && !hasResults;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground text-sm transition-colors min-w-[200px] max-w-[320px]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-xl shadow-2xl border border-border/60 overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 border-b border-border/40">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search candidates, jobs, clients..."
                className="flex-1 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults({ candidates: [], jobs: [], clients: [], prospects: [] }); }}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto">
              {loading && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching...</div>
              )}

              {!loading && hasResults && (
                <div className="py-2">
                  {results.prospects.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prospects</div>
                      {results.prospects.map((p, i) => {
                        const idx = i;
                        return (
                          <button
                            key={p.id}
                            onClick={() => navigateTo({ type: "prospect", data: p })}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors",
                              selectedIndex === idx && "bg-accent"
                            )}
                          >
                            <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                              <UserSearch className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{p.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[p.currentDesignation, p.currentCompany, p.currentCity].filter(Boolean).join(" · ") || p.email || "Prospect"}
                              </div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">{p.status?.replace(/_/g, " ")}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {results.candidates.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Candidates</div>
                      {results.candidates.map((c, i) => {
                        const idx = results.prospects.length + i;
                        return (
                          <button
                            key={c.id}
                            onClick={() => navigateTo({ type: "candidate", data: c })}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors",
                              selectedIndex === idx && "bg-accent"
                            )}
                          >
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{c.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[c.currentDesignation, c.currentCompany, c.currentCity].filter(Boolean).join(" · ") || c.email}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {results.jobs.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jobs</div>
                      {results.jobs.map((j, i) => {
                        const idx = results.prospects.length + results.candidates.length + i;
                        return (
                          <button
                            key={j.id}
                            onClick={() => navigateTo({ type: "job", data: j })}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors",
                              selectedIndex === idx && "bg-accent"
                            )}
                          >
                            <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                              <Briefcase className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{j.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[j.clientName, j.location].filter(Boolean).join(" · ")}
                                {j.status && <span className="ml-2 text-xs">{j.status}</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {results.clients.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clients</div>
                      {results.clients.map((cl, i) => {
                        const idx = results.prospects.length + results.candidates.length + results.jobs.length + i;
                        return (
                          <button
                            key={cl.id}
                            onClick={() => navigateTo({ type: "client", data: cl })}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors",
                              selectedIndex === idx && "bg-accent"
                            )}
                          >
                            <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{cl.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[cl.industry, cl.contactPerson].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {showNoResults && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found for "{query}"
                </div>
              )}

              {!loading && !hasResults && query.length < 2 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/40 px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-border/60 bg-muted text-[10px]">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-border/60 bg-muted text-[10px]">↵</kbd> Open</span>
              <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-border/60 bg-muted text-[10px]">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
