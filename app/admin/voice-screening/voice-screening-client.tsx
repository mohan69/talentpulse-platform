"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, PhoneOff, Clock, CheckCircle2, XCircle, AlertTriangle, Settings, Star, FileText, Mic, AudioWaveform, Plus, Loader2, Copy, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Screening = {
  id: string; phoneNumber: string; callStatus: string; callDuration: number | null;
  transcript: string | null; aiSummary: string | null; aiScore: number | null;
  aiScoreBreakdown: any; createdAt: string; completedAt: string | null;
  candidate: { id: string; name: string; phone: string | null };
  application: { job: { id: string; title: string; client?: { name: string } | null } };
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  QUEUED: { icon: Clock, color: "text-amber-500", label: "Queued" },
  RINGING: { icon: Phone, color: "text-blue-500", label: "Ringing" },
  IN_PROGRESS: { icon: Mic, color: "text-blue-600", label: "In Progress" },
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-500", label: "Completed" },
  FAILED: { icon: XCircle, color: "text-red-500", label: "Failed" },
  NO_ANSWER: { icon: PhoneOff, color: "text-gray-500", label: "No Answer" },
  BUSY: { icon: PhoneOff, color: "text-amber-600", label: "Busy" },
  CANCELLED: { icon: XCircle, color: "text-gray-400", label: "Cancelled" },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <div className="relative h-14 w-14 flex-shrink-0">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
        <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
        <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" className={color} stroke="currentColor" strokeWidth="3" strokeDasharray={`${score}, 100`} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${color}`}>{score}</span>
    </div>
  );
}

type AppOption = {
  id: string;
  candidate: { id: string; name: string; phone: string | null; email: string | null };
  job: { id: string; title: string; client?: { name: string } | null };
};

export function VoiceScreeningClient({ initialScreenings, isConfigured, applications = [] }: { initialScreenings: Screening[]; isConfigured: boolean; applications?: AppOption[] }) {
  const router = useRouter();
  const [screenings, setScreenings] = useState(initialScreenings);
  const [detail, setDetail] = useState<Screening | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [phone, setPhone] = useState("");

  const selectedApp = applications.find((a) => a.id === selectedAppId);

  async function handleStartScreening(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAppId || !phone.trim()) return;
    setSaving(true);
    try {
      const app = applications.find((a) => a.id === selectedAppId)!;
      const res = await fetch("/api/voice-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedAppId,
          candidateId: app.candidate.id,
          phoneNumber: phone.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const created = await res.json();
      if (created.warning) {
        toast.warning(created.warning, { duration: 8000 });
      } else {
        toast.success(`Calling ${app.candidate.name} now via ElevenLabs! Status: ${created.callStatus || "QUEUED"}`);
      }
      setShowNew(false);
      setSelectedAppId("");
      setPhone("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFetchTranscript(screeningId: string) {
    setFetchingTranscript(true);
    try {
      const res = await fetch("/api/voice-screening/fetch-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screeningId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to fetch transcript");
        return;
      }
      if (data.updated && data.updated.length > 0) {
        toast.success(`Fetched: ${data.updated.join(", ")}`);
        // Update local state
        if (data.screening) {
          setScreenings((prev) => prev.map((s) => s.id === screeningId ? { ...s, ...data.screening } : s));
          if (detail?.id === screeningId) {
            setDetail((prev) => prev ? { ...prev, ...data.screening } : prev);
          }
        }
        router.refresh();
      } else {
        toast.info(data.message || "No transcript data available yet. Try again in a few seconds.", { duration: 6000 });
      }
    } catch (err: any) {
      toast.error(err.message || "Error fetching transcript");
    } finally {
      setFetchingTranscript(false);
    }
  }

  if (!isConfigured) {
    return (
      <Card className="shadow-sm rounded-xl">
        <CardContent className="py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <AudioWaveform className="h-8 w-8 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Voice AI Screening Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Set up your ElevenLabs Conversational AI credentials in Settings to enable human-like autonomous phone screening for candidates.
          </p>
          <Button asChild>
            <Link href="/admin/settings"><Settings className="h-4 w-4 mr-2" /> Configure in Settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Start Screening button */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" /> Start Screening</Button>
      </div>

      {/* Start Screening Dialog */}
      <Dialog open={showNew} onOpenChange={(v) => !v && setShowNew(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mic className="h-4 w-4 text-violet-600" /> Start Voice Screening</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartScreening} className="space-y-4">
            <div>
              <Label>Select Candidate & Job</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
                value={selectedAppId}
                onChange={(e) => {
                  setSelectedAppId(e.target.value);
                  const app = applications.find((a) => a.id === e.target.value);
                  if (app?.candidate.phone) setPhone(app.candidate.phone);
                }}
              >
                <option value="">Choose an application...</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>{a.candidate.name} — {a.job.title}{a.job.client?.name ? ` (${a.job.client.name})` : ""}</option>
                ))}
              </select>
            </div>
            {selectedApp && (
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Candidate:</span> <b>{selectedApp.candidate.name}</b></p>
                <p><span className="text-muted-foreground">Job:</span> {selectedApp.job.title}</p>
                {selectedApp.job.client?.name && <p><span className="text-muted-foreground">Client:</span> {selectedApp.job.client.name}</p>}
                {selectedApp.candidate.email && <p><span className="text-muted-foreground">Email:</span> {selectedApp.candidate.email}</p>}
              </div>
            )}
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">The AI agent will call this number to conduct the screening.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving || !selectedAppId || !phone.trim()}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
                {saving ? "Queuing..." : "Queue Screening Call"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              After queuing, copy the Screening ID and use it as the <code>screeningId</code> in your ElevenLabs agent to initiate the call with full context.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Calls", val: screenings.length, icon: Phone },
          { label: "Completed", val: screenings.filter((s) => s.callStatus === "COMPLETED").length, icon: CheckCircle2 },
          { label: "Avg Score", val: Math.round(screenings.filter((s) => s.aiScore).reduce((a, s) => a + (s.aiScore || 0), 0) / (screenings.filter((s) => s.aiScore).length || 1)), icon: Star },
          { label: "Pending", val: screenings.filter((s) => ["QUEUED", "RINGING"].includes(s.callStatus)).length, icon: Clock },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm rounded-xl">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {screenings.length === 0 ? (
          <Card className="shadow-sm rounded-xl"><CardContent className="py-12 text-center text-muted-foreground"><Phone className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No voice screenings yet.</p></CardContent></Card>
        ) : screenings.map((s) => {
          const cfg = STATUS_CONFIG[s.callStatus] || STATUS_CONFIG.QUEUED;
          const Icon = cfg.icon;
          return (
            <Card key={s.id} className="shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetail(s)}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {s.aiScore !== null ? <ScoreRing score={s.aiScore} /> : (
                    <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Icon className={`h-6 w-6 ${cfg.color}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm">{s.candidate.name}</p>
                      <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.application.job.title}{s.application.job.client?.name ? ` • ${s.application.job.client.name}` : ""} • {s.phoneNumber}</p>
                    {s.aiSummary && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.aiSummary}</p>}
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground flex flex-col items-end gap-1">
                    <p>{new Date(s.createdAt).toLocaleDateString()}</p>
                    {s.callDuration != null && <p>{Math.floor(s.callDuration / 60)}m {s.callDuration % 60}s</p>}
                    {s.callStatus === "QUEUED" && (
                      <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(s.id);
                        toast.success("Screening ID copied!");
                      }}>
                        <Copy className="h-3 w-3 mr-1" /> Copy ID
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> {detail?.candidate.name} — Voice Screening
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {detail.aiScore !== null && <ScoreRing score={detail.aiScore} />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{detail.application.job.title}{detail.application.job.client?.name ? ` — ${detail.application.job.client.name}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{detail.phoneNumber}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{STATUS_CONFIG[detail.callStatus]?.label}</Badge>
                    {detail.callDuration != null && (
                      <span className="text-[10px] text-muted-foreground">{Math.floor(detail.callDuration / 60)}m {detail.callDuration % 60}s</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Show Fetch Transcript button when completed but no transcript */}
              {detail.callStatus === "COMPLETED" && !detail.transcript && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                    Call completed but transcript hasn&apos;t been fetched yet. Click below to fetch from ElevenLabs.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFetchTranscript(detail.id)}
                    disabled={fetchingTranscript}
                  >
                    {fetchingTranscript ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    {fetchingTranscript ? "Fetching..." : "Fetch Transcript"}
                  </Button>
                </div>
              )}

              {detail.aiSummary && (
                <div>
                  <h4 className="text-xs font-semibold mb-1">AI Summary</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{detail.aiSummary}</p>
                </div>
              )}
              {detail.aiScoreBreakdown && (
                <div>
                  <h4 className="text-xs font-semibold mb-2">Score Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(detail.aiScoreBreakdown as Record<string, number>).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <span className="text-xs capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="text-xs font-bold">{v}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detail.transcript && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold flex items-center gap-1"><FileText className="h-3 w-3" /> Transcript</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => handleFetchTranscript(detail.id)}
                      disabled={fetchingTranscript}
                    >
                      {fetchingTranscript ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="text-sm bg-muted/30 rounded-lg p-3 max-h-[250px] overflow-y-auto whitespace-pre-wrap">{detail.transcript}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
