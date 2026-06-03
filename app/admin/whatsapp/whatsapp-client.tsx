"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Send, Settings, CheckCircle2, Clock, XCircle, Eye, Loader2, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type WaMessage = {
  id: string; phoneNumber: string; direction: string; body: string;
  status: string; createdAt: string; sentAt: string | null;
  candidate: { id: string; name: string; phone: string | null } | null;
  template: { name: string } | null;
};
type WaTemplate = { id: string; name: string; body: string; category: string; variables: string[]; isApproved: boolean };

const MSG_STATUS: Record<string, { color: string; icon: any }> = {
  QUEUED: { color: "text-amber-500", icon: Clock },
  SENT: { color: "text-blue-500", icon: Send },
  DELIVERED: { color: "text-emerald-500", icon: CheckCircle2 },
  READ: { color: "text-emerald-600", icon: Eye },
  FAILED: { color: "text-red-500", icon: XCircle },
};

export function WhatsAppClient({ initialMessages, initialTemplates, isConfigured }: {
  initialMessages: WaMessage[]; initialTemplates: WaTemplate[]; isConfigured: boolean;
}) {
  const { toast } = useToast();
  const [messages] = useState(initialMessages);
  const [templates, setTemplates] = useState(initialTemplates);
  const [tab, setTab] = useState("messages");
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [tplCategory, setTplCategory] = useState("outreach");
  const [savingTpl, setSavingTpl] = useState(false);

  if (!isConfigured) {
    return (
      <Card className="shadow-sm rounded-xl">
        <CardContent className="py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">WhatsApp Business Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your WhatsApp Business API credentials in Settings to start sending messages to candidates.
          </p>
          <Button asChild>
            <Link href="/admin/settings"><Settings className="h-4 w-4 mr-2" /> Configure in Settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function handleCreateTemplate() {
    if (!tplName || !tplBody) return;
    setSavingTpl(true);
    try {
      const resp = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tplName, body: tplBody, category: tplCategory }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setTemplates((prev) => [data, ...prev]);
        setShowNewTpl(false);
        setTplName(""); setTplBody("");
        toast({ title: "Template Created" });
      }
    } catch {}
    setSavingTpl(false);
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/whatsapp/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="flex items-center justify-between mb-6">
        <TabsList>
          <TabsTrigger value="messages"><MessageSquare className="h-4 w-4 mr-1.5" /> Messages</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-1.5" /> Templates</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="messages" className="space-y-3">
        {messages.length === 0 ? (
          <Card className="shadow-sm rounded-xl"><CardContent className="py-12 text-center text-muted-foreground"><MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No messages yet.</p></CardContent></Card>
        ) : messages.map((m) => {
          const st = MSG_STATUS[m.status] || MSG_STATUS.QUEUED;
          const Icon = st.icon;
          return (
            <Card key={m.id} className="shadow-sm rounded-xl">
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.direction === "INBOUND" ? "bg-blue-100" : "bg-emerald-100"}`}>
                    {m.direction === "INBOUND" ? <MessageSquare className="h-4 w-4 text-blue-600" /> : <Send className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium">{m.candidate?.name || m.phoneNumber}</p>
                      <Badge variant="outline" className="text-[10px]">{m.direction === "INBOUND" ? "Received" : "Sent"}</Badge>
                      <Icon className={`h-3 w-3 ${st.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{m.body}</p>
                    {m.template && <Badge variant="secondary" className="text-[10px] mt-1">Template: {m.template.name}</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      <TabsContent value="templates" className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowNewTpl(true)}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
        </div>
        {templates.length === 0 ? (
          <Card className="shadow-sm rounded-xl"><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No templates yet.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.id} className="shadow-sm rounded-xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      {t.isApproved ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Approved</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-0.5" /> Pending</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{t.body}</p>
                  {t.variables.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {t.variables.map((v) => <Badge key={v} variant="secondary" className="text-[10px]">{`{{${v}}}`}</Badge>)}
                    </div>
                  )}
                  <div className="flex justify-end mt-3">
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showNewTpl} onOpenChange={setShowNewTpl}>
          <DialogContent>
            <DialogHeader><DialogTitle>New WhatsApp Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Template Name</Label><Input value={tplName} onChange={(e) => setTplName(e.target.value)} className="mt-1 h-9 text-sm" placeholder="e.g. interview_reminder" /></div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={tplCategory} onValueChange={setTplCategory}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="status_update">Status Update</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Message Body</Label><Textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)} className="mt-1 text-sm" rows={5} placeholder="Hi {{name}}, ..." /></div>
              <Button onClick={handleCreateTemplate} disabled={savingTpl} className="w-full">
                {savingTpl ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  );
}
