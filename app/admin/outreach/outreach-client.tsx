"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Sparkles, Send, Loader2, Mail, Users, CheckCircle2, XCircle, Clock, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string; name: string; type: string; subject: string; body: string;
  status: string; aiGenerated: boolean; sentAt: string | null;
  totalRecipients: number; sentCount: number; failedCount: number;
  createdAt: string; _count: { recipients: number };
};
type Candidate = { id: string; name: string; email: string; currentCompany: string | null; currentDesignation: string | null };

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  SENDING: { label: "Sending...", variant: "secondary" },
  SENT: { label: "Sent", variant: "default" },
  SCHEDULED: { label: "Scheduled", variant: "secondary" },
};

export function OutreachClient({ initialCampaigns, candidates }: { initialCampaigns: Campaign[]; candidates: Candidate[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState("campaigns");

  // New campaign form
  const [name, setName] = useState("");
  const [type, setType] = useState("CANDIDATE");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [aiContext, setAiContext] = useState("");
  const [aiTone, setAiTone] = useState("Professional and warm");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [searchQ, setSearchQ] = useState("");

  const filteredCandidates = candidates.filter((c) =>
    (c.name + c.email + (c.currentCompany || "")).toLowerCase().includes(searchQ.toLowerCase())
  );

  async function handleAiDraft() {
    setGenerating(true);
    try {
      const resp = await fetch("/api/email-campaigns/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type === "BD" ? "BD" : "CANDIDATE", context: aiContext, tone: aiTone }),
      });
      const data = await resp.json();
      if (data.subject && data.body) {
        setSubject(data.subject);
        setBody(data.body);
        toast({ title: "AI Draft Ready", description: "Review and customize before sending." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to generate", variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Network error", variant: "destructive" }); }
    setGenerating(false);
  }

  async function handleCreate() {
    if (!name || !subject || !body) { toast({ title: "Missing fields", variant: "destructive" }); return; }
    setSaving(true);
    const recipients = selectedCandidates.map((id) => {
      const c = candidates.find((x) => x.id === id);
      return c ? { email: c.email, name: c.name, candidateId: c.id } : null;
    }).filter(Boolean);

    try {
      const resp = await fetch("/api/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, subject, body: body, aiGenerated: generating, recipients }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setCampaigns((prev) => [{ ...data, _count: { recipients: recipients.length } }, ...prev]);
        setShowNew(false);
        resetForm();
        toast({ title: "Campaign Created", description: "You can now send it or schedule it." });
      }
    } catch {}
    setSaving(false);
  }

  function resetForm() {
    setName(""); setSubject(""); setBody(""); setSelectedCandidates([]); setAiContext("");
  }

  async function handleSend(id: string) {
    setSending(id);
    try {
      const resp = await fetch(`/api/email-campaigns/${id}/send`, { method: "POST" });
      const data = await resp.json();
      if (data.success) {
        toast({ title: "Emails Sent!", description: `${data.sentCount} sent, ${data.failedCount} failed.` });
        router.refresh();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Send failed", variant: "destructive" }); }
    setSending(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/api/email-campaigns/${id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  function toggleCandidate(id: string) {
    setSelectedCandidates((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="flex items-center justify-between mb-6">
        <TabsList>
          <TabsTrigger value="campaigns"><Mail className="h-4 w-4 mr-1.5" /> Campaigns</TabsTrigger>
          <TabsTrigger value="new"><Plus className="h-4 w-4 mr-1.5" /> New Campaign</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="campaigns" className="space-y-4">
        {campaigns.length === 0 ? (
          <Card className="shadow-sm rounded-xl">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No campaigns yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((c) => {
              const badge = STATUS_BADGE[c.status] || { label: c.status, variant: "outline" as const };
              return (
                <Card key={c.id} className="shadow-sm rounded-xl">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                          <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                          {c.aiGenerated && <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI</Badge>}
                          <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">Subject: {c.subject}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c._count?.recipients || c.totalRecipients} recipients</span>
                          {c.sentCount > 0 && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {c.sentCount} sent</span>}
                          {c.failedCount > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" /> {c.failedCount} failed</span>}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 ml-3">
                        <Button size="sm" variant="ghost" onClick={() => setPreviewCampaign(c)}><Eye className="h-3.5 w-3.5" /></Button>
                        {c.status === "DRAFT" && (
                          <Button size="sm" onClick={() => handleSend(c.id)} disabled={sending === c.id}>
                            {sending === c.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                            Send
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="new">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: AI + compose */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Email Composer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Outreach Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CANDIDATE">Candidate Outreach</SelectItem>
                        <SelectItem value="BD">Business Development</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Tone</Label>
                    <Input value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="mt-1 h-9 text-sm" placeholder="Professional and warm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Context / Instructions for AI</Label>
                  <Textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} className="mt-1 text-sm" rows={3} placeholder="e.g. We have a Senior Java Developer role at TCS Bangalore, 15-25 LPA..." />
                </div>
                <Button onClick={handleAiDraft} disabled={generating} className="w-full">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {generating ? "Generating..." : "Generate AI Draft"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm rounded-xl">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Compose Email</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Campaign Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 text-sm" placeholder="e.g. Java Devs - TCS Bangalore" />
                </div>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 h-9 text-sm" placeholder="Email subject line" />
                </div>
                <div>
                  <Label className="text-xs">Body (HTML supported, use {`{{name}}`} for personalization)</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 text-sm font-mono" rows={10} placeholder="<p>Hi {{name}},</p>" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Recipients */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recipients ({selectedCandidates.length} selected)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search candidates..." className="h-9 text-sm" />
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {filteredCandidates.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer text-sm">
                      <Checkbox checked={selectedCandidates.includes(c.id)} onCheckedChange={() => toggleCandidate(c.id)} />
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.email}{c.currentCompany ? ` • ${c.currentCompany}` : ""}</p>
                      </div>
                    </label>
                  ))}
                  {filteredCandidates.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No candidates found</p>}
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleCreate} disabled={saving} className="w-full" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Create Campaign
            </Button>
          </div>
        </div>
      </TabsContent>

      {/* Preview dialog */}
      <Dialog open={!!previewCampaign} onOpenChange={(v) => !v && setPreviewCampaign(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewCampaign?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm"><strong>Subject:</strong> {previewCampaign?.subject}</p>
            <div className="border rounded-lg p-4 text-sm bg-muted/30 max-h-[300px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: previewCampaign?.body || "" }} />
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
