"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

export function AIScreeningPanel({ applicationId, initialScore, initialReport }: { applicationId: string; initialScore: number | null; initialReport: any }) {
  const [score, setScore] = useState<number | null>(initialScore);
  const [report, setReport] = useState<any>(initialReport);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");

  async function runScreen() {
    setRunning(true); setStatus("Analyzing resume...");
    try {
      const res = await fetch(`/api/ai/screen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId }) });
      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim(); if (!data || data === "[DONE]") continue;
          try { const parsed = JSON.parse(data); if (parsed.status === "processing") setStatus(parsed.message ?? "Processing..."); else if (parsed.status === "completed") { setScore(parsed.result?.score ?? null); setReport(parsed.result); setStatus("Done"); } else if (parsed.status === "error") setStatus(parsed.message ?? "Error"); } catch {}
        }
      }
    } catch (e: any) { setStatus("Error: " + (e?.message ?? "failed")); } finally { setRunning(false); }
  }

  return (<div className="rounded-xl bg-card shadow-sm p-5">
    <div className="flex items-start justify-between mb-3"><div className="flex items-center gap-2"><div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center"><Sparkles className="h-4 w-4" /></div><h3 className="font-semibold">AI Screening</h3></div><Button onClick={runScreen} disabled={running} size="sm">{running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running</> : <>Run Deep Screen</>}</Button></div>
    {score !== null && <div className="mb-4"><div className="text-xs text-muted-foreground mb-1">Match Score</div><div className="flex items-center gap-2"><div className="text-3xl font-display font-bold text-primary">{score}%</div></div></div>}
    {running && <div className="text-sm text-muted-foreground">{status}</div>}
    {report?.strengths && (<div className="space-y-3"><div><div className="text-xs font-semibold mb-1 text-emerald-600">Strengths</div><ul className="text-sm space-y-1">{(report.strengths ?? []).map((s: string, i: number) => <li key={i} className="pl-4 relative before:content-['✓'] before:absolute before:left-0 before:text-emerald-600">{s}</li>)}</ul></div>{report.gaps && (<div><div className="text-xs font-semibold mb-1 text-rose-600">Gaps</div><ul className="text-sm space-y-1">{(report.gaps ?? []).map((g: string, i: number) => <li key={i} className="pl-4 relative before:content-['!'] before:absolute before:left-0 before:text-rose-600">{g}</li>)}</ul></div>)}{report.recommendation && <div><div className="text-xs font-semibold mb-1">Recommendation</div><p className="text-sm text-muted-foreground">{report.recommendation}</p></div>}</div>)}
    {score === null && !running && <div className="text-sm text-muted-foreground">Click “Run Deep Screen” for AI-powered analysis.</div>}
  </div>);
}
