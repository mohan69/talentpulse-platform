"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function NewClientForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    description: "",
    address: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Client name is required");
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create client");
      }
      toast.success("Client created!");
      router.push("/admin/clients");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-6 max-w-3xl">
      <h3 className="text-base font-semibold">Client Details</h3>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Company Name *</Label>
          <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Barclays" />
        </div>
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" value={form.industry} onChange={(e) => updateField("industry", e.target.value)} placeholder="e.g. Banking & Financial Services" />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="e.g. https://barclays.com" />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="e.g. Mumbai, Maharashtra" />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={3}
          className={inputCls + " resize-y mt-1"}
          placeholder="Brief about the client company..."
        />
      </div>

      <h3 className="text-base font-semibold pt-2">Primary Contact</h3>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <Label htmlFor="contactName">Contact Name</Label>
          <Input id="contactName" value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} placeholder="e.g. Rajesh Kumar" />
        </div>
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} placeholder="e.g. rajesh@barclays.com" />
        </div>
        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input id="contactPhone" value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} placeholder="e.g. +91 98765 43210" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? "Creating..." : "Create Client"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/clients")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
