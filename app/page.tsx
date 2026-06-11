import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Sparkles,
  ArrowRight,
  Target,
  Zap,
  Search,
  FileBarChart,
  KanbanSquare,
  Shield,
  Rocket,
  BarChart3,
  CheckCircle2,
  Eye,
  ExternalLink,
  Layers,
} from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/animate";
import { BrandLogo } from "@/components/brand-logo";

const VALUE_PROPS = [
  { label: "Faster Candidate Sourcing", desc: "Multi-platform candidate discovery and match scoring", icon: Rocket },
  { label: "Reduced Screening Effort", desc: "AI evaluates resumes, skills, CTC, and fit in seconds", icon: BarChart3 },
  { label: "Greater Recruiter Productivity", desc: "AI assistant for summaries, outreach, and interview prep", icon: Zap },
  { label: "Unified Talent Intelligence", desc: "Skills visibility, bench planning, and staffing readiness", icon: Target },
];

const BUILT_FOR = [
  "Recruitment Agencies",
  "Executive Search Firms",
  "Staffing Companies",
  "GCC Recruitment Teams",
  "Enterprise HR Organizations",
];

const FEATURES = [
  { title: "AI Screening Agent", desc: "Resume & JD parsing, skill-gap analysis, CTC checks, no-show risk — all in under 30 seconds per candidate.", icon: Brain },
  { title: "Smart Pipeline (Kanban)", desc: "Drag-and-drop between 11 customizable stages with stage-wise conversion metrics and visual tracking.", icon: KanbanSquare },
  { title: "Recruiter Copilot", desc: "AI assistant that generates candidate summaries, interview questions, outreach emails, and job matches.", icon: Sparkles },
  { title: "Talent Intelligence Search", desc: "Semantic search across your entire talent repository — find the right candidate in seconds.", icon: Search },
  { title: "Reports & Insights", desc: "Recruitment funnel, source effectiveness, time-to-hire, and recruiter performance analytics with CSV export.", icon: FileBarChart },
  { title: "Multi-Stakeholder Portals", desc: "Dedicated portals for Admin, Recruiter, Client, and Candidate — each with role-specific dashboards.", icon: Shield },
];

const STEPS = [
  { label: "Source", desc: "AI-powered multi-source candidate discovery across platforms" },
  { label: "Screen", desc: "AI scores and ranks candidates against job requirements" },
  { label: "Engage", desc: "Personalized outreach via email, WhatsApp, and voice AI" },
  { label: "Interview", desc: "Schedule, remind, and collect structured feedback" },
  { label: "Close", desc: "Track offers, acceptances, and onboarding in real-time" },
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
            <a href="#built-for" className="text-muted-foreground hover:text-foreground transition-colors">Who It&apos;s For</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#screenshot" className="text-muted-foreground hover:text-foreground transition-colors">Platform</a>
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
              Hire Faster. Hire Better.<br /><span className="text-primary">At Scale.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Talent intelligence for project-driven, delivery-heavy, and GCC-style teams — connecting delivery readiness, staffing visibility, recruiter productivity, candidate intelligence, project capacity, and skills visibility.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/login"><Button size="lg" className="gap-2">Get started <ArrowRight className="h-4 w-4" /></Button></Link>
              <a href="https://www.rightsense.in/48-hour-diagnostic" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/5">
                  Discuss Talent Intelligence <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#screenshot"><Button size="lg" variant="ghost">See the platform</Button></a>
            </div>
          </FadeIn>

          {/* Value Props */}
          <Stagger className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {VALUE_PROPS.map((s) => (
              <StaggerItem key={s.label}>
                <div className="rounded-xl bg-card p-6 shadow-sm hover:shadow-md transition-shadow border border-border/40">
                  <s.icon className="h-5 w-5 text-primary mb-3" />
                  <div className="font-display font-semibold text-base tracking-tight">{s.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.desc}</div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Product Screenshot */}
      <section id="screenshot" className="py-16 bg-muted/30">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="text-center mb-10">
              <div className="text-sm font-medium text-primary mb-3">See TalentPulse in action</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                One platform. Every workflow.
              </h2>
            </div>
          </FadeIn>
          <FadeIn>
            <div className="rounded-2xl bg-gradient-to-b from-primary/5 to-background border border-border/40 overflow-hidden shadow-xl">
              <div className="p-6 md:p-10 flex flex-col items-center">
                <div className="w-full max-w-4xl rounded-xl bg-card shadow-lg border border-border/30 overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 flex items-center gap-2 border-b border-border/30">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-rose-400" />
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="text-xs text-muted-foreground ml-3">TalentPulse — Recruiter Dashboard</div>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-4">
                      <div className="h-8 w-48 rounded bg-primary/10" />
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 rounded-lg bg-muted/50 p-3 space-y-2">
                            <div className="h-3 w-16 rounded bg-primary/20" />
                            <div className="h-6 w-10 rounded bg-primary/10" />
                            <div className="h-2 w-20 rounded bg-muted-foreground/20" />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-12 rounded-lg bg-muted/30 flex items-center px-4 gap-3">
                            <div className="h-6 w-6 rounded-full bg-primary/10" />
                            <div className="h-3 w-32 rounded bg-muted-foreground/20" />
                            <div className="h-3 w-24 rounded bg-muted-foreground/10 ml-auto" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-8 w-32 rounded bg-primary/10" />
                      <div className="h-24 rounded-lg bg-muted/50 p-3 space-y-2">
                        <div className="h-3 w-20 rounded bg-primary/20" />
                        <div className="h-2 w-full rounded bg-muted-foreground/15" />
                        <div className="h-2 w-3/4 rounded bg-muted-foreground/15" />
                      </div>
                      <div className="h-24 rounded-lg bg-muted/50 p-3 space-y-2">
                        <div className="h-3 w-16 rounded bg-primary/20" />
                        <div className="h-2 w-full rounded bg-muted-foreground/15" />
                        <div className="h-2 w-2/3 rounded bg-muted-foreground/15" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Live demo environment — log in to explore your workspace
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Built For */}
      <section id="built-for" className="py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-sm font-medium text-primary mb-3">Who it&apos;s for</div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Built for talent teams of every kind.
              </h2>
              <p className="mt-4 text-muted-foreground">
                From boutique executive search firms to enterprise GCC recruitment teams — TalentPulse adapts to your workflow.
              </p>
            </div>
          </FadeIn>
          <Stagger className="mt-16 grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {BUILT_FOR.map((item) => (
              <StaggerItem key={item}>
                <div className="rounded-xl bg-card p-6 text-center shadow-sm border border-border/30 hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-sm">{item}</div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="max-w-2xl">
              <div className="text-sm font-medium text-primary mb-3">Use cases</div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Built for how teams actually hire.
              </h2>
              <p className="mt-4 text-muted-foreground">
                TalentPulse is most relevant when talent decisions affect revenue delivery, project execution, or customer commitments.
              </p>
            </div>
          </FadeIn>
          <Stagger className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "GCC hiring visibility",
              "Project staffing readiness",
              "Bench and capacity planning",
              "Recruiter productivity",
              "Candidate pipeline intelligence",
              "Skills and delivery readiness",
            ].map((item) => (
              <StaggerItem key={item}>
                <div className="rounded-xl bg-card p-6 shadow-sm border border-border/30 hover:border-primary/30 hover:shadow-md transition-all h-full">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-sm">{item}</div>
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
                Everything your team needs, in one place.
              </h2>
              <p className="mt-4 text-muted-foreground">
                AI sourcing, talent intelligence, pipeline management, and recruiter copilot — TalentPulse covers the complete hiring lifecycle.
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

      {/* How it works */}
      <section id="how" className="py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="max-w-2xl">
              <div className="text-sm font-medium text-primary mb-3">Workflow</div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Five steps from source to close.
              </h2>
              <p className="mt-4 text-muted-foreground">
                An AI-augmented recruitment workflow — from intelligent sourcing to offer closure — streamlined for speed and quality.
              </p>
            </div>
          </FadeIn>
          <div className="mt-16 grid md:grid-cols-5 gap-4">
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

      {/* RightSense Ecosystem */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="rounded-2xl bg-card border border-border/40 p-8 md:p-12 shadow-sm max-w-4xl mx-auto text-center">
              <Layers className="h-10 w-10 text-primary mx-auto mb-4" />
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
                RightSense ecosystem
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
                Part of the RightSense Enterprise Operating Intelligence stack.
              </h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                TalentPulse sits alongside PulseIQ and WinsProposal in the RightSense platform family, surfacing talent-specific intelligence — capacity, skills, attrition, productivity — that feeds into the broader Enterprise Truth Map and Executive Cockpit.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Note */}
      <section className="py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <FadeIn>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 md:p-8 max-w-4xl mx-auto text-center">
              <p className="text-base text-amber-800 leading-relaxed">
                <span className="font-semibold">When is TalentPulse most relevant?</span>{" "}
                TalentPulse is most relevant when talent decisions affect revenue delivery, project execution, or customer commitments.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,white_0%,transparent_50%)] opacity-10" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl" />
        <div className="mx-auto max-w-[1200px] px-6 relative text-center">
          <FadeIn>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Ready to transform your hiring?
            </h2>
            <p className="mt-4 opacity-90 max-w-xl mx-auto leading-relaxed">
              Join recruitment teams that are hiring faster, better, and at scale with TalentPulse.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login">
                <Button size="lg" variant="secondary" className="gap-2">
                  Launch the platform <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a
                href="https://www.rightsense.in/48-hour-diagnostic"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" variant="secondary" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                  Discuss Talent Intelligence <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </FadeIn>
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
            <a href="#built-for" className="hover:text-foreground transition-colors">Who It&apos;s For</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
