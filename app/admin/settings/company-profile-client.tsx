"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Globe, Mail, Phone, MapPin, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  name: string;
  brandName: string;
  website: string;
  email: string;
  phone: string;
  tagline: string;
  regAddress: string;
  regCity: string;
  regState: string;
  regCountry: string;
  branchAddress: string;
  branchCity: string;
  branchState: string;
  branchCountry: string;
};

const EMPTY: Profile = {
  name: "", brandName: "", website: "", email: "", phone: "", tagline: "",
  regAddress: "", regCity: "", regState: "", regCountry: "India",
  branchAddress: "", branchCity: "", branchState: "", branchCountry: "India",
};

export function CompanyProfileClient() {
  const [form, setForm] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/company-profile")
      .then((r) => r.json())
      .then((d) => {
        setForm({
          name: d.name || "",
          brandName: d.brandName || "",
          website: d.website || "",
          email: d.email || "",
          phone: d.phone || "",
          tagline: d.tagline || "",
          regAddress: d.regAddress || "",
          regCity: d.regCity || "",
          regState: d.regState || "",
          regCountry: d.regCountry || "India",
          branchAddress: d.branchAddress || "",
          branchCity: d.branchCity || "",
          branchState: d.branchState || "",
          branchCountry: d.branchCountry || "India",
        });
      })
      .catch(() => toast.error("Failed to load company profile"))
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof Profile, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const resp = await fetch("/api/company-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (resp.ok) {
        toast.success("Company profile updated successfully");
      } else {
        const d = await resp.json();
        toast.error(d.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Info */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">General Information</CardTitle>
              <CardDescription className="text-xs mt-0.5">Company name, brand, and tagline</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Company Name</Label>
            <Input className="mt-1 h-9 text-sm" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="CareerPaths India" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Brand Name (Short)</Label>
            <Input className="mt-1 h-9 text-sm" value={form.brandName} onChange={(e) => set("brandName", e.target.value)} placeholder="CareerPaths" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">Tagline</Label>
            <Input className="mt-1 h-9 text-sm" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Connecting talent with opportunity" />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Contact Details</CardTitle>
              <CardDescription className="text-xs mt-0.5">Website, email, and phone number</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Website</Label>
            <div className="relative mt-1">
              <Globe className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 text-sm pl-8" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://www.example.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 text-sm pl-8" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contact@example.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 text-sm pl-8" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 9876543210" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Office */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Registered Office</CardTitle>
              <CardDescription className="text-xs mt-0.5">Primary business address</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">Address</Label>
            <Input className="mt-1 h-9 text-sm" value={form.regAddress} onChange={(e) => set("regAddress", e.target.value)} placeholder="Street, Building, Floor" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">City</Label>
            <Input className="mt-1 h-9 text-sm" value={form.regCity} onChange={(e) => set("regCity", e.target.value)} placeholder="Bangalore" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">State</Label>
            <Input className="mt-1 h-9 text-sm" value={form.regState} onChange={(e) => set("regState", e.target.value)} placeholder="Karnataka" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Country</Label>
            <Input className="mt-1 h-9 text-sm" value={form.regCountry} onChange={(e) => set("regCountry", e.target.value)} placeholder="India" />
          </div>
        </CardContent>
      </Card>

      {/* Branch Office */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">Branch Office</CardTitle>
              <CardDescription className="text-xs mt-0.5">Secondary office address (optional)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">Address</Label>
            <Input className="mt-1 h-9 text-sm" value={form.branchAddress} onChange={(e) => set("branchAddress", e.target.value)} placeholder="Street, Building, Floor" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">City</Label>
            <Input className="mt-1 h-9 text-sm" value={form.branchCity} onChange={(e) => set("branchCity", e.target.value)} placeholder="Bangalore" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">State</Label>
            <Input className="mt-1 h-9 text-sm" value={form.branchState} onChange={(e) => set("branchState", e.target.value)} placeholder="Karnataka" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Country</Label>
            <Input className="mt-1 h-9 text-sm" value={form.branchCountry} onChange={(e) => set("branchCountry", e.target.value)} placeholder="India" />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
