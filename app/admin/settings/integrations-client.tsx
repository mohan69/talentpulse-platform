"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mic, MessageSquare, Calendar, Shield, CheckCircle2, AlertTriangle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type Setting = { id: string; provider: string; config: Record<string, any>; isActive: boolean; lastTested: string | null };

const PROVIDERS = [
  {
    key: "ELEVENLABS",
    label: "Voice AI (ElevenLabs + Twilio)",
    description: "Human-like autonomous voice screening calls — Twilio places the call, ElevenLabs handles the AI conversation.",
    icon: Mic,
    fields: [
      { name: "apiKey", label: "ElevenLabs API Key", placeholder: "Your ElevenLabs API Key", secret: true },
      { name: "agentId", label: "ElevenLabs Agent ID", placeholder: "agent_xxxxxxxxxxxxxxxxxxxx" },
      { name: "phoneNumberId", label: "ElevenLabs Phone Number ID", placeholder: "phnum_xxxxxxxxxxxxxxxxxxxx" },
      { name: "phoneNumber", label: "Display Phone Number", placeholder: "+91xxxxxxxxxx (optional)" },
      { name: "twilioAccountSid", label: "Twilio Account SID", placeholder: "ACxxxxxxxxxxxxxxxxxxxx" },
      { name: "twilioAuthToken", label: "Twilio Auth Token", placeholder: "Your Twilio Auth Token", secret: true },
      { name: "twilioFromNumber", label: "Twilio From Number", placeholder: "+1xxxxxxxxxx (Twilio number)" },
      { name: "twilioConnectUrl", label: "Twilio Connect URL (TwiML Function)", placeholder: "https://your-function.twil.io/connect" },
    ],
  },
  {
    key: "WHATSAPP",
    label: "WhatsApp Business",
    description: "Send candidate outreach & status updates via WhatsApp Business API.",
    icon: MessageSquare,
    fields: [
      { name: "apiKey", label: "API Key", placeholder: "WhatsApp Business API Key", secret: true },
      { name: "phoneNumberId", label: "Phone Number ID", placeholder: "e.g. 123456789" },
      { name: "businessAccountId", label: "Business Account ID", placeholder: "e.g. 987654321" },
    ],
  },
  {
    key: "GOOGLE_CALENDAR",
    label: "Google Calendar",
    description: "2-way sync for interview scheduling with Google Calendar.",
    icon: Calendar,
    fields: [
      { name: "clientId", label: "OAuth Client ID", placeholder: "xxxxx.apps.googleusercontent.com" },
      { name: "clientSecret", label: "OAuth Client Secret", placeholder: "Your client secret", secret: true },
    ],
  },
  {
    key: "OUTLOOK_CALENDAR",
    label: "Outlook Calendar",
    description: "2-way sync for interview scheduling with Microsoft Outlook.",
    icon: Calendar,
    fields: [
      { name: "clientId", label: "Application (Client) ID", placeholder: "Azure AD App ID" },
      { name: "clientSecret", label: "Client Secret", placeholder: "Azure AD Client Secret", secret: true },
      { name: "tenantId", label: "Tenant ID", placeholder: "Azure AD Tenant ID" },
    ],
  },
];

export function IntegrationsClient({ initialSettings }: { initialSettings: Setting[] }) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [forms, setForms] = useState<Record<string, Record<string, string>>>(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const s of initialSettings) map[s.provider] = s.config || {};
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  function getVal(provider: string, field: string) {
    return forms[provider]?.[field] || "";
  }
  function setVal(provider: string, field: string, val: string) {
    setForms((p) => ({ ...p, [provider]: { ...(p[provider] || {}), [field]: val } }));
  }
  function getSetting(provider: string) {
    return settings.find((s) => s.provider === provider);
  }

  async function handleSave(provider: string) {
    setSaving(provider);
    try {
      const config = forms[provider] || {};
      const resp = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, config, isActive: true }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setSettings((prev) => {
          const idx = prev.findIndex((s) => s.provider === provider);
          if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
          return [...prev, data];
        });
        toast.success("Saved", { description: `${provider} configuration saved successfully.` });
      } else {
        toast.error("Save failed", { description: data.error || "Failed to save" });
      }
    } catch { toast.error("Network error", { description: "Could not reach the server." }); }
    setSaving(null);
  }

  async function handleTest(provider: string) {
    setTesting(provider);
    try {
      const resp = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success("Connection OK", { description: data.message || "Test passed.", duration: 8000 });
      } else {
        toast.error("Test failed", { description: data.message || data.error || "Unknown error", duration: 10000 });
      }
    } catch (e: any) { toast.error("Test failed", { description: e?.message || "Network error" }); }
    setTesting(null);
  }

  async function handleToggle(provider: string, active: boolean) {
    try {
      await fetch(`/api/integrations/${provider}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      setSettings((prev) => prev.map((s) => s.provider === provider ? { ...s, isActive: active } : s));
    } catch {}
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {PROVIDERS.map((p) => {
        const existing = getSetting(p.key);
        const isConfigured = !!existing;
        const isActive = existing?.isActive ?? false;
        const Icon = p.icon;
        return (
          <Card key={p.key} className="shadow-sm rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{p.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{p.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConfigured ? (
                    <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Not Set
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.fields.map((f) => (
                <div key={f.name}>
                  <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                  <Input
                    type={f.secret ? "password" : "text"}
                    placeholder={f.placeholder}
                    value={getVal(p.key, f.name)}
                    onChange={(e) => setVal(p.key, f.name, e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {isConfigured && (
                    <>
                      <Switch checked={isActive} onCheckedChange={(v) => handleToggle(p.key, v)} />
                      <span className="text-xs text-muted-foreground">{isActive ? "Active" : "Disabled"}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {isConfigured && (
                    <Button size="sm" variant="outline" onClick={() => handleTest(p.key)} disabled={testing === p.key}>
                      {testing === p.key ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                      Test
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleSave(p.key)} disabled={saving === p.key}>
                    {saving === p.key ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
