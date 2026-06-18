"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Lock, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Invalid credentials");
        setLoading(false);
      } else {
        toast.success("Welcome back!");
        router.replace(callbackUrl);
      }
    } catch (err) {
      toast.error("Sign in failed");
      setLoading(false);
    }
  }

  function quickLogin(e: string, p: string) {
    setEmail(e);
    setPassword(p);
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-bold tracking-tight">Sign in</h2>
      <p className="mt-2 text-muted-foreground">Access your TalentPulse workspace.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="mt-8 rounded-lg bg-muted/50 p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">QUICK-LOGIN DEMO ACCOUNTS</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Admin", email: "admin@talentpulse.demo", pass: "demo123" },
            { label: "Recruiter Priya", email: "recruiter1@talentpulse.demo", pass: "demo123" },
            { label: "Recruiter Arun", email: "recruiter2@talentpulse.demo", pass: "demo123" },
            { label: "Client (Barclays)", email: "hr@barclays.com", pass: "client123" },
          ].map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => quickLogin(a.email, a.pass)}
              className="text-left text-xs p-2 rounded-md bg-background hover:bg-accent transition-colors"
            >
              <div className="font-medium">{a.label}</div>
              <div className="text-muted-foreground truncate">{a.email}</div>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-center text-muted-foreground">
        New candidate? <Link href="/signup" className="text-primary font-medium hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
