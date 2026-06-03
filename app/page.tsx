import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Users,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Building2,
  Target,
  Zap,
  Search,
  Upload,
  Phone,
  FileBarChart,
  MessageSquare,
  UserSearch,
  Mic,
  Globe,
  Mail,
  Briefcase,
  KanbanSquare,
  Shield,
} from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/animate";
import { BrandLogo } from "@/components/brand-logo";

const PORTALS = [
  {
    role: "Admin",
    icon: Shield,
    color: "from-violet-500/20 to-violet-600/5",
    accent: "text-violet-500",
    features: ["Full platform control & user management", "Recruiter performance leaderboard", "Revenue & KPI dashboards", "Prospect pipeline oversight"],
  },
  {
    role: "Recruiter",
    icon: UserSearch,
    color: "from-primary/20 to-primary/5",
    accent: "text-primary",
    features: ["AI-powered candidate screening", "Kanban pipeline management", "Prospect sourcing & bulk import", "Call analytics & voice screening"],
  },
  {
    role: "Client",
    icon: Building2,
    color: "from-amber-500/20 to-amber-600/5",
    accent: "text-amber-500",
    features: ["White-labeled hiring portal", "Review & rate shortlisted candidates", "Real-time pipeline visibility", "Direct feedback to recruiters"],
  },
  {
    role: "Candidate",
    icon: Briefcase,
    color: "from-emerald-500/20 to-emerald-600/5",
    accent: "text-emerald-500",
    features: ["Track application status live", "View interview schedules", "Upload documents securely", "Receive AI screening results"],
  },
];

const FEATURES = [
  { title: "AI Screening Agent", desc: "Resume & JD parsing, skill-gap analysis, CTC checks, no-show risk — all in under 30 seconds per candidate.", icon: Brain },
  { title: "Smart Pipeline (Kanban)", desc: "Drag-and-drop between 11 customizable stages with stage-wise conversion metrics and visual tracking.", icon: KanbanSquare },
  { title: "Voice AI Call Screening", desc: "Automated voice calls with AI-driven candidate screening, sentiment analysis, and detailed call transcripts.", icon: Mic },
  { title: "Prospect Management", desc: "Build and manage your talent pipeline with prospect tracking, tagging, and one-click conversion to candidates.", icon: UserSearch },
  { title: "Bulk CSV Import", desc: "Import hundreds of prospects at once via CSV upload. Auto-detect duplicates and map fields intelligently.", icon: Upload },
  { title: "Global Command Search", desc: "Find any candidate, job, client, or prospect instantly with ⌘K universal search across the entire platform.", icon: Search },
  { title: "Reports & Analytics", desc: "Generate recruitment funnel, source effectiveness, time-to-hire, and recruiter performance reports with CSV export.", icon: FileBarChart },
  { title: "Call Analytics Dashboard", desc: "Track call volumes, completion rates, average durations, sentiment trends, and daily performance with rich charts.", icon: Phone },
  { title: "Duplicate Detection", desc: "Never resubmit the same candidate. Fuzzy match by email, phone, and profile across your entire database.", icon: ShieldCheck },
  { title: "Client Portal", desc: "White-labeled portal for enterprise clients — review candidates, submit structured feedback, and track progress.", icon: Building2 },
  { title: "Multi-Role Access", desc: "Four dedicated portals for Admin, Recruiter, Client, and Candidate — each with role-specific dashboards and controls.", icon: Shield },
  { title: "Candidate Database", desc: "Rich profiles with projects, CTC breakup, notice period, employment gaps, and complete application history.", icon: Users },
];

const STEPS = [
  { label: "Source", desc: "Import prospects via CSV or add individually from any channel" },
  { label: "Screen", desc: "AI scores resumes against JD in under 30 seconds" },
  { label: "Qualify", desc: "Voice AI calls assess communication & fitment" },
  { label: "Shortlist", desc: "Kanban pipeline with 11 stages tracks every move" },
  { label: "Interview", desc: "Schedule, remind, and collect structured feedback" },
  { label: "Close", desc: "Track offers, joinings, and onboarding completion" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-background/80 border-b border-border/40">
        <div className="mx-auto max-w-[1200px] px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <BrandLogo size={38} priority />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#portals" className="text-muted-foreground hover:text-foreground transition-colors">Portals</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#roi" className="text-muted-foreground hover:text-foreground transition-colors">ROI</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/login"><Button size="sm">Launch Platform <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl opacity-30" />
        <div className="mx-auto max-w-[1200px] px-6 pt-24 pb-20 relative">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Native Talent Intelligence Platform
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl">
              Source smarter.<br /><span className="text-primary">Close faster.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              TalentPulse is an AI-native Talent Intelligence Platform for sourcing, screening, pipeline velocity,
              and hiring closure — built for modern recruitment agencies and enterprise HR teams.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/login"><Button size="lg" className="gap-2">Get started <ArrowRight className="h-4 w-4" /></Button></Link>
              <a href="#features"><Button size="lg" variant="outline">Explore features</Button></a>
            </div>
          </FadeIn>

          {/* Stats */}
          <Stagger className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "AI screening per candidate", value: "< 30s", icon: Zap },
              { label: "Recruiter hours saved / week", value: "20+", icon: Clock },
              { label: "Pipeline stages tracked", value: "11", icon: Target },
              { label: "Dedicated role portals", value: "4", icon: Globe },
            ].map((s) => (
              <StaggerItem key={s.label}>
                <div className="rounded-xl bg-card p-6 shadow-sm hover:shadow-md transition-shadow border border-border/40">
                  <s.icon className="h-5 w-5 text-primary mb-3" />
                  <div className="font-display font-bold text-3xl tracking-tight">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="max-w-2xl">
              <div className="text-sm font-medium text-primary mb-3">Platform capabilities</div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Everything your agency needs, in one place.
              </h2>
              <p className="mt-4 text-muted-foreground">
                From AI screening to voice calls, prospect pipelines to advanced analytics — TalentPulse covers the complete recruitment lifecycle.
              </p>
            </div>
          </FadeIn>
          <Stagger className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <div className="group rounded-xl bg-card p-6 h-full shadow-sm hover:shadow-lg transition-all duration-300 border border-border/30">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Portals / Stakeholders */}
      <section id="portals" className="py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="max-w-2xl">
              <div className="text-sm font-medium text-primary mb-3">Multi-stakeholder access</div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Built for every stakeholder.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Four dedicated portals — each designed for the specific needs and workflow of every participant in the hiring process.
              </p>
            </div>
          </FadeIn>
          <Stagger className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PORTALS.map((p) => (
              <StaggerItem key={p.role}>
                <div className={`rounded-xl bg-gradient-to-b ${p.color} p-6 h-full border border-border/30 hover:shadow-lg transition-all duration-300`}>
                  <div className="h-12 w-12 rounded-lg bg-card flex items-center justify-center mb-5 shadow-sm">
                    <p.icon className={`h-6 w-6 ${p.accent}`} />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-4">{p.role} Portal</h3>
                  <ul className="space-y-2.5">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className={`h-1.5 w-1.5 rounded-full ${p.accent.replace("text-", "bg-")} mt-1.5 shrink-0`} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-muted/30">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="max-w-2xl">
              <div className="text-sm font-medium text-primary mb-3">Workflow</div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Six steps from source to close.
              </h2>
              <p className="mt-4 text-muted-foreground">
                A streamlined recruitment workflow powered by AI at every stage — from prospect sourcing to offer closure.
              </p>
            </div>
          </FadeIn>
          <div className="mt-16 grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {STEPS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.05}>
                <div className="rounded-xl bg-card p-5 h-full shadow-sm border border-border/30 hover:border-primary/30 transition-colors">
                  <div className="font-mono text-xs text-primary mb-2 flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <div className="font-display font-semibold mt-2">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ROI */}
      <section id="roi" className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,white_0%,transparent_50%)] opacity-10" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl" />
        <div className="mx-auto max-w-[1200px] px-6 relative">
          <div className="max-w-2xl">
            <div className="text-sm font-medium opacity-80 mb-3">Impact & ROI</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              3x recruiter productivity.
            </h2>
            <p className="mt-4 opacity-90 leading-relaxed">
              Automate the repetitive. Amplify the strategic. TalentPulse saves 20+ hours per recruiter per week
              across screening, sourcing, and candidate engagement — delivering enterprise-grade output.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-4 gap-6">
            {[
              { label: "Screening time reduction", value: "80%" },
              { label: "Candidate response rate", value: "3–5x" },
              { label: "Time-to-fill improvement", value: "33%" },
              { label: "Cost per hire reduction", value: "40%" },
            ].map((r) => (
              <div key={r.label} className="rounded-xl bg-primary-foreground/10 backdrop-blur-sm p-6 border border-primary-foreground/10">
                <div className="font-display font-bold text-4xl tracking-tight">{r.value}</div>
                <div className="text-sm opacity-80 mt-1">{r.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link href="/login">
              <Button size="lg" variant="secondary" className="gap-2">
                Launch the platform <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border/40">
        <div className="mx-auto max-w-[1200px] px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <BrandLogo size={28} />
            <span className="border-l border-border/60 pl-3">TalentPulse</span>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#portals" className="hover:text-foreground transition-colors">Portals</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
